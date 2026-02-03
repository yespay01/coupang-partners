/**
 * 리뷰 발행 트리거
 * status가 "approved" → "published"로 변경될 때 자동 실행
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logInfo, logError } from "./slack.js";

/**
 * 한글을 로마자로 변환 (간단한 음차)
 */
function transliterate(text) {
  const CHO = [
    "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "",
    "j", "jj", "ch", "k", "t", "p", "h"
  ];
  const JUNG = [
    "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa",
    "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"
  ];
  const JONG = [
    "", "g", "kk", "gs", "n", "nj", "nh", "d", "l", "lg", "lm",
    "lb", "ls", "lt", "lp", "lh", "m", "b", "bs", "s", "ss", "ng",
    "j", "ch", "k", "t", "p", "h"
  ];

  let result = "";

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (code >= 0xac00 && code <= 0xd7a3) {
      const uniVal = code - 0xac00;
      const cho = Math.floor(uniVal / 588);
      const jung = Math.floor((uniVal - cho * 588) / 28);
      const jong = uniVal % 28;

      result += CHO[cho] + JUNG[jung] + JONG[jong];
    } else {
      result += text[i];
    }
  }

  return result;
}

/**
 * 상품명과 productId로 slug 생성
 */
function generateSlug(productName, productId) {
  // 1. 한글을 로마자로 변환
  const romanized = transliterate(productName);

  // 2. 특수문자 제거, 공백을 하이픈으로 변환
  const cleaned = romanized
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "") // 특수문자 제거
    .replace(/\s+/g, "-") // 공백을 하이픈으로
    .replace(/-+/g, "-") // 연속된 하이픈을 하나로
    .replace(/^-|-$/g, ""); // 앞뒤 하이픈 제거

  // 3. 최대 50자로 자르기
  const truncated = cleaned.slice(0, 50);

  // 4. productId 마지막 8자리 추가
  const uniqueId = productId.slice(-8);

  return `${truncated}-${uniqueId}`;
}

/**
 * 리뷰 본문에서 설명 추출
 */
function extractDescription(content, maxLength = 160) {
  if (!content) return "";

  // HTML 태그 제거
  const plainText = content
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= maxLength) return plainText;

  const truncated = plainText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength - 20) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}

/**
 * 상품명에서 키워드 추출
 */
function extractKeywords(productName, category) {
  const keywords = ["쿠팡", "리뷰", "추천"];

  if (category) {
    keywords.push(category);
  }

  // 상품명에서 주요 단어 추출
  const words = productName
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);

  keywords.push(...words.slice(0, 5));

  return Array.from(new Set(keywords));
}

/**
 * SEO 메타데이터 생성
 */
function generateSEOMeta(review) {
  const siteName = "쿠팡 리뷰";
  const baseTitle = `${review.productName} 리뷰`;
  const titleSuffix = ` | ${siteName}`;

  const title =
    baseTitle.length + titleSuffix.length > 60
      ? baseTitle.slice(0, 60 - titleSuffix.length) + titleSuffix
      : baseTitle + titleSuffix;

  const description = extractDescription(review.content || "", 150);
  const keywords = extractKeywords(review.productName || "", review.category);
  const ogImage = review.productImage || "";

  return {
    title,
    description,
    keywords,
    ogImage,
  };
}

/**
 * Slug 중복 확인 및 증분
 */
async function ensureUniqueSlug(db, baseSlug, currentReviewId) {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existingReviews = await db
      .collection("reviews")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    // slug가 사용되지 않거나, 현재 리뷰의 slug인 경우
    if (existingReviews.empty || existingReviews.docs[0].id === currentReviewId) {
      return slug;
    }

    // slug가 이미 사용 중이면 증분
    slug = `${baseSlug}-${counter}`;
    counter++;

    // 무한 루프 방지
    if (counter > 100) {
      throw new Error("Failed to generate unique slug");
    }
  }
}

/**
 * 리뷰 발행 트리거
 */
export const publishReview = onDocumentUpdated(
  "reviews/{reviewId}",
  async (event) => {
    const reviewId = event.params.reviewId;
    const before = event.data.before.data();
    const after = event.data.after.data();

    const db = getFirestore();

    try {
      // status 변경 감지: approved → published
      if (before.status !== "published" && after.status === "published") {
        console.log(`Publishing review: ${reviewId}`);

        const updates = {
          updatedAt: FieldValue.serverTimestamp(),
        };

        // 1. publishedAt 설정 (없는 경우)
        if (!after.publishedAt) {
          updates.publishedAt = FieldValue.serverTimestamp();
        }

        // 2. slug 생성 (없는 경우)
        if (!after.slug) {
          const productName = after.productName || `review-${reviewId}`;
          const productId = after.productId || reviewId;

          const baseSlug = generateSlug(productName, productId);
          const uniqueSlug = await ensureUniqueSlug(db, baseSlug, reviewId);

          updates.slug = uniqueSlug;
          console.log(`Generated slug: ${uniqueSlug}`);
        }

        // 3. SEO 메타데이터 생성 (없는 경우)
        if (!after.seoMeta) {
          const seoMeta = generateSEOMeta(after);
          updates.seoMeta = seoMeta;
          console.log(`Generated SEO meta: ${seoMeta.title}`);
        }

        // 4. 조회수 초기화 (없는 경우)
        if (after.viewCount === undefined) {
          updates.viewCount = 0;
        }

        // Firestore 업데이트
        await db.collection("reviews").doc(reviewId).update(updates);

        // 5. 로그 기록
        await db.collection("logs").add({
          level: "info",
          message: `리뷰 발행 완료: ${after.productName}`,
          type: "publish_review",
          context: "publishReview",
          createdAt: FieldValue.serverTimestamp(),
          payload: {
            reviewId,
            slug: updates.slug || after.slug,
            productName: after.productName,
          },
        });

        // 6. Slack 알림
        await logInfo(
          `리뷰 발행`,
          `리뷰가 성공적으로 발행되었습니다.\n` +
            `- 상품: ${after.productName}\n` +
            `- Slug: ${updates.slug || after.slug}\n` +
            `- URL: /reviews/${updates.slug || after.slug}`
        );

        console.log(`Review published successfully: ${reviewId}`);
      }

      // 역발행: published → approved (비공개)
      if (before.status === "published" && after.status !== "published") {
        console.log(`Unpublishing review: ${reviewId}`);

        // 로그 기록
        await db.collection("logs").add({
          level: "info",
          message: `리뷰 비공개 처리: ${after.productName}`,
          type: "unpublish_review",
          context: "publishReview",
          createdAt: FieldValue.serverTimestamp(),
          payload: {
            reviewId,
            slug: after.slug,
            productName: after.productName,
          },
        });

        await logInfo(
          `리뷰 비공개`,
          `리뷰가 비공개 처리되었습니다.\n` +
            `- 상품: ${after.productName}\n` +
            `- Slug: ${after.slug}`
        );
      }
    } catch (error) {
      console.error("Error in publishReview trigger:", error);

      // 에러 로그 기록
      await db.collection("logs").add({
        level: "error",
        message: `리뷰 발행 실패: ${error.message}`,
        type: "publish_review_error",
        context: "publishReview",
        createdAt: FieldValue.serverTimestamp(),
        payload: {
          reviewId,
          error: error.message,
          stack: error.stack,
        },
      });

      await logError(
        `리뷰 발행 실패`,
        `리뷰 ID: ${reviewId}\n에러: ${error.message}`
      );

      throw error;
    }
  }
);
