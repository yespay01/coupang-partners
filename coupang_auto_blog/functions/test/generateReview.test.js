import test from "node:test";
import assert from "node:assert/strict";

import {
  computeNextRunAt,
  buildPrompt,
  validateReviewContent,
  analyzeToneScore,
} from "../src/reviewUtils.js";

test("computeNextRunAt applies exponential backoff", () => {
  const baseDelayMs = Number(process.env.REVIEW_RETRY_BASE_MINUTES ?? 5) * 60_000;
  const toleranceMs = 2_000;

  const first = computeNextRunAt(1).getTime() - Date.now();
  assert.ok(first >= baseDelayMs);
  assert.ok(first < baseDelayMs + toleranceMs);

  const second = computeNextRunAt(2).getTime() - Date.now();
  assert.ok(second >= baseDelayMs * 2);
  assert.ok(second < baseDelayMs * 2 + toleranceMs);
});

test("buildPrompt includes product name and category", () => {
  const prompt = buildPrompt({ name: "테스트 상품", category: "키친" });
  assert.match(prompt, /테스트 상품/);
  assert.match(prompt, /키친/);
});

test("validateReviewContent rejects reviews that are too short", () => {
  const shortReview = "짧은 후기".repeat(5);
  assert.throws(() => validateReviewContent(shortReview), /REVIEW_LENGTH_OUT_OF_RANGE/);
});

test("validateReviewContent rejects reviews containing banned phrases", () => {
  const reviewWithPromo =
    "만족스러운 디자인과 편리한 기능 덕분에 일상에서 유용하게 사용하고 있어요. 무료 증정 이벤트라는 광고 문구가 포함된 테스트 문장입니다. " +
    "깔끔한 마감과 튼튼한 소재 덕분에 선물용으로도 추천하고 싶은 마음이 들지만 여기서는 무료 증정 같은 과장된 표현을 걸러내고 싶습니다.";
  assert.throws(() => validateReviewContent(reviewWithPromo), /REVIEW_CONTAINS_BANNED_PHRASE/);
});

test("validateReviewContent returns tone score for valid reviews", () => {
  const validReview =
    "만족스러운 품질과 깔끔한 마감이 인상적이어서 가족 모두가 편리하게 사용하고 있습니다. 배송도 빠르고 설명서가 친절해 초보자도 어렵지 않게 활용할 수 있었어요. " +
    "편리한 기능이 일상에서 자주 활용되어 전반적으로 만족도가 높고, 가격 대비 성능도 훌륭해서 주변 지인들에게도 추천하게 됩니다.";
  const result = validateReviewContent(validReview);
  assert.ok(result.toneScore > 0.4);
  assert.ok(result.charCount >= 90);
});

test("analyzeToneScore flags negative leaning content", () => {
  const negativeReview =
    "형편 없는 마감과 불편한 조작감 때문에 실망스러웠고 환불을 고려할 만큼 불만족스러운 경험이었습니다.";
  const score = analyzeToneScore(negativeReview);
  assert.ok(score <= 0.4);
});
