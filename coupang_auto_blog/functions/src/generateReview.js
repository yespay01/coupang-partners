import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { computeNextRunAt, buildPrompt, validateReviewContent } from "./reviewUtils.js";
import { notifySlack } from "./slack.js";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const RETRY_COLLECTION = "review_retry_queue";
const MAX_ATTEMPTS = Number(process.env.REVIEW_MAX_ATTEMPTS ?? 3);
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  logger.warn("OPENAI_API_KEY is not set. Review generation will fail until configured.");
}

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

async function createReviewWithAI(product) {
  if (!openai) {
    throw new Error("OpenAI 클라이언트가 초기화되지 않았습니다.");
  }

  const prompt = buildPrompt(product);
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  const reviewText = response.choices?.[0]?.message?.content?.trim();
  const usage = response.usage ?? {};

  if (!reviewText) {
    throw new Error("OpenAI 응답에 리뷰 텍스트가 없습니다.");
  }

  return {
    reviewText,
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
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
    await notifySlack(`후기 생성에 ${MAX_ATTEMPTS}회 실패했습니다. 상품 ID: ${productId}`, "error");
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

  await notifySlack(
    `후기 생성 실패. ${nextAttempt}번째 시도를 ${nextRunAt.toISOString()}에 재시도합니다. 상품 ID: ${productId}`,
    "warn",
  );
}

async function handleReviewGeneration({ productId, product, attempt, source }) {
  const { reviewText, promptTokens, completionTokens } = await createReviewWithAI(product);
  const { toneScore, charCount } = validateReviewContent(reviewText);

  await db.collection("reviews").add({
    productId,
    content: reviewText,
    status: "draft",
    category: product.category,
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
    },
  });

  await notifySlack(
    `후기 초안 생성 완료 (상품 ID: ${productId}, 시도: ${attempt}, 출처: ${source})`,
    "success",
  );
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
    await db.collection(RETRY_COLLECTION).doc(productId).delete().catch(() => undefined);
  } catch (error) {
    logger.error("후기 생성 중 오류 발생", { productId, error: error.message });
    await logGeneration({
      productId,
      attempt,
      source,
      level: "error",
      message: error.message,
      usage: {},
    });
    await enqueueRetry({ productId, attempt, reason: error.message });
    throw error;
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

        await logGeneration({
          productId,
          attempt,
          source: "retry",
          level: "error",
          message: error.message,
          usage: {},
        });

        await enqueueRetry({ productId, attempt, reason: error.message });
      }
    }
  },
);
