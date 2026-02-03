import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { computeNextRunAt, buildPromptFromSettings, validateReviewContentWithSettings } from "./reviewUtils.js";
import { notifySlack } from "./slack.js";
import { generateText } from "./aiProviders.js";
import { getSystemSettings } from "./services/settingsService.js";
import { collectAllImages } from "./imageUtils.js";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const RETRY_COLLECTION = "review_retry_queue";
const MAX_ATTEMPTS = Number(process.env.REVIEW_MAX_ATTEMPTS ?? 3);

/**
 * AI를 사용하여 리뷰 생성 (다중 제공자 지원)
 */
async function createReviewWithAI(product, settings) {
  const { ai, prompt: promptSettings } = settings;

  // 프롬프트 빌드
  const userPrompt = buildPromptFromSettings(product, promptSettings);
  const systemPrompt = promptSettings.systemPrompt;

  // AI 텍스트 생성
  const result = await generateText(ai, userPrompt, systemPrompt);

  if (!result.text) {
    throw new Error("AI 응답에 리뷰 텍스트가 없습니다.");
  }

  return {
    reviewText: result.text,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    provider: result.provider,
    model: result.model,
  };
}

async function logGeneration({ productId, attempt, source, level, message, usage }) {
  await db.collection("logs").add({
    type: "generation",
    level,
    payload: {
      productId,
      attempt,
      source,
      message,
      tokens: usage,
    },
    createdAt: new Date(),
  });
}

async function enqueueRetry({ productId, attempt, reason }) {
  if (attempt >= MAX_ATTEMPTS) {
    await notifySlack({
      route: "generation",
      level: "error",
      title: "후기 생성 한계 도달",
      text: `상품 ID: \`${productId}\``,
      fields: [
        { label: "최대 시도", value: `${MAX_ATTEMPTS}` },
        { label: "마지막 오류", value: reason ?? "원인 미상" },
      ],
      context: "재시도 큐에서 추가 시도 중단",
    });
    await logGeneration({
      productId,
      attempt,
      source: "retry",
      level: "error",
      message: `재시도 한계 초과: ${reason}`,
      usage: {},
    });
    return;
  }

  const jobRef = db.collection(RETRY_COLLECTION).doc(productId);
  const now = new Date();

  const { nextAttempt, nextRunAt } = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(jobRef);
    const existingAttempt = snapshot.exists ? Number(snapshot.data().attempt ?? attempt) : attempt;
    const computedAttempt = Math.max(existingAttempt, attempt) + 1;
    const nextAttemptAt = computeNextRunAt(computedAttempt);

    tx.set(
      jobRef,
      {
        productId,
        attempt: computedAttempt,
        nextAttemptAt: nextAttemptAt,
        reason,
        status: "retry_pending",
        updatedAt: now,
        lastErrorMessage: reason,
        lastErrorAt: now,
      },
      { merge: true },
    );

    return { nextAttempt: computedAttempt, nextRunAt: nextAttemptAt };
  });

  await notifySlack({
    route: "generation",
    level: "warn",
    title: "후기 생성 재시도 예약",
    text: `상품 ID: \`${productId}\``,
    fields: [
      { label: "다음 시도", value: `${nextAttempt}` },
      { label: "실행 예정", value: nextRunAt.toISOString() },
      { label: "오류", value: reason },
    ],
  });
}

async function handleReviewGeneration({ productId, product, attempt, source }) {
  // Firestore에서 설정 로드
  const settings = await getSystemSettings();

  const { reviewText, promptTokens, completionTokens, provider, model } = await createReviewWithAI(product, settings);
  const { toneScore, charCount } = validateReviewContentWithSettings(reviewText, settings.prompt);

  // 이미지 수집 (쿠팡 메인 + 스톡 + AI + 쿠팡 상세)
  const media = await collectAllImages(product, settings);

  await db.collection("reviews").add({
    productId,
    productName: product.productName || "",
    content: reviewText,
    status: "draft",
    category: product.categoryName || product.category || "",
    affiliateUrl: product.affiliateUrl || "",
    author: "auto-bot",
    media,
    toneScore,
    charCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await logGeneration({
    productId,
    attempt,
    source,
    level: "info",
    message: "후기 초안 생성 완료",
    usage: {
      prompt: promptTokens,
      completion: completionTokens,
      toneScore,
      charCount,
      provider,
      model,
    },
  });

  await notifySlack({
    route: "generation",
    level: "success",
    title: "후기 초안 생성 완료",
    text: `상품 ID: \`${productId}\``,
    fields: [
      { label: "시도", value: `${attempt}` },
      { label: "출처", value: source },
      { label: "톤 점수", value: toneScore.toFixed(2) },
      { label: "글자 수", value: `${charCount}` },
    ],
  });
}

export const generateReview = onDocumentCreated("products/{productId}", async (event) => {
  const productId = event.params.productId;
  const product = event.data?.data();

  if (!product) {
    logger.warn("생성 트리거에 상품 데이터가 없습니다.", { productId });
    return;
  }

  const attempt = 1;
  const source = "trigger";

  try {
    await handleReviewGeneration({ productId, product, attempt, source });
  } catch (error) {
    logger.error("후기 생성 중 오류 발생 (재시도 없음)", { productId, error: error.message });
    const errorMessage = error instanceof Error ? error.message : String(error);

    await logGeneration({
      productId,
      attempt,
      source,
      level: "error",
      message: `후기 생성 실패 (재시도 없음): ${errorMessage}`,
      usage: {},
    });

    await notifySlack({
      route: "generation",
      level: "error",
      title: "후기 생성 실패",
      text: `상품 ID: \`${productId}\` - 재시도 없이 종료됨`,
      fields: [
        { label: "출처", value: source },
        { label: "오류", value: errorMessage },
      ],
    });

    // 재시도 큐에 추가하지 않음 - 에러만 기록하고 종료
  }
});

export const processReviewRetryQueue = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Seoul",
    retryCount: 0,
  },
  async () => {
    const now = new Date();
    const snapshot = await db
      .collection(RETRY_COLLECTION)
      .where("nextAttemptAt", "<=", now)
      .orderBy("nextAttemptAt", "asc")
      .limit(20)
      .get();

    if (snapshot.empty) {
      logger.debug("대기 중인 재시도 작업이 없습니다.");
      return;
    }

    for (const doc of snapshot.docs) {
      const job = doc.data();
      const { productId, attempt } = job;

      try {
        const productSnap = await db.collection("products").doc(productId).get();

        if (!productSnap.exists) {
          logger.warn("재시도할 상품을 찾을 수 없습니다.", { productId });
          await doc.ref.delete();
          continue;
        }

        await handleReviewGeneration({
          productId,
          product: productSnap.data(),
          attempt,
          source: "retry",
        });

        await doc.ref.delete();
      } catch (error) {
        logger.error("재시도 작업 실패", { productId, attempt, error: error.message });

        const errorMessage = error instanceof Error ? error.message : String(error);
        await logGeneration({
          productId,
          attempt,
          source: "retry",
          level: "error",
          message: errorMessage,
          usage: {},
        });

        await notifySlack({
          route: "generation",
          level: "error",
          title: "재시도 작업 실패",
          text: `상품 ID: \`${productId}\``,
          fields: [
            { label: "시도", value: `${attempt}` },
            { label: "오류", value: errorMessage },
          ],
        });

        await enqueueRetry({ productId, attempt, reason: errorMessage });
      }
    }
  },
);

/**
 * 수동으로 리뷰 생성/재시도
 * @param {Object} data - { productId: string }
 */
export const manualGenerateReview = onCall(
  {
    region: "asia-northeast3",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (request) => {
    const { productId } = request.data;

    if (!productId) {
      throw new HttpsError("invalid-argument", "productId가 필요합니다.");
    }

    try {
      // 상품 조회
      const productSnap = await db.collection("products").doc(productId).get();

      if (!productSnap.exists) {
        throw new HttpsError("not-found", "상품을 찾을 수 없습니다.");
      }

      const product = productSnap.data();

      // 리뷰 생성
      await handleReviewGeneration({
        productId,
        product,
        attempt: 1,
        source: "manual",
      });

      // 상품 상태 업데이트
      await productSnap.ref.update({
        status: "completed",
        updatedAt: new Date(),
      });

      logger.info(`수동 리뷰 생성 완료: ${productId}`);

      return {
        success: true,
        message: "리뷰가 생성되었습니다.",
      };
    } catch (error) {
      logger.error("수동 리뷰 생성 실패:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // 상품 상태를 실패로 업데이트
      await db.collection("products").doc(productId).update({
        status: "failed",
        updatedAt: new Date(),
      });

      await logGeneration({
        productId,
        attempt: 1,
        source: "manual",
        level: "error",
        message: errorMessage,
        usage: {},
      });

      throw new HttpsError("internal", errorMessage);
    }
  },
);
