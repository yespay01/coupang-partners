const REVIEW_MIN_LENGTH = 90;
const REVIEW_MAX_LENGTH = 170;

const bannedPatterns = [
  /씨발|병신|좆같/i,
  /공짜/i,
  /무료\s*증정/i,
  /100%\s*환불/i,
  /전액\s*환불/i,
  /최저가\s*보장?/i,
];

const positiveWords = [
  "만족",
  "좋",
  "훌륭",
  "편리",
  "추천",
  "기분",
  "쓸만",
  "깔끔",
  "튼튼",
  "예쁘",
  "고급",
];

const negativeWords = [
  "불만",
  "별로",
  "싫",
  "불편",
  "문제",
  "최악",
  "짜증",
  "실망",
  "환불",
  "나쁘",
  "형편",
];

export function computeNextRunAt(attempt) {
  const baseMinutes = Number(process.env.REVIEW_RETRY_BASE_MINUTES ?? 5);
  const minutes = Math.pow(2, Math.max(0, attempt - 1)) * baseMinutes;
  return new Date(Date.now() + minutes * 60_000);
}

export function buildPrompt(product) {
  return `
  ${product.name} (${product.category}) 상품에 대한 후기를 생생하게 작성해주세요.
  100~150자 분량으로, 실제 사용 경험처럼 묘사하고 광고성 문구는 삼가주세요.
  예: "배송이 빨라서 원하는 날에 도착했고, 품질도 만족스러워 인테리어에도 잘 어울려요."
  `;
}

export function analyzeToneScore(text) {
  const tokens = (text.toLowerCase().match(/[a-z0-9가-힣]+/g) ?? []).filter(Boolean);
  if (tokens.length === 0) {
    return 0.5;
  }

  let positive = 0;
  let negative = 0;

  for (const token of tokens) {
    if (positiveWords.some((word) => token.includes(word))) {
      positive += 1;
      continue;
    }

    if (negativeWords.some((word) => token.includes(word))) {
      negative += 1;
    }
  }

  const total = positive + negative;
  if (total === 0) {
    return 0.5;
  }

  const score = (positive + 1) / (total + 2);
  return Number(score.toFixed(2));
}

export function validateReviewContent(reviewText) {
  const charCount = Array.from(reviewText ?? "").length;

  if (charCount < REVIEW_MIN_LENGTH || charCount > REVIEW_MAX_LENGTH) {
    throw new Error(`REVIEW_LENGTH_OUT_OF_RANGE:${charCount}`);
  }

  const bannedPattern = bannedPatterns.find((pattern) => pattern.test(reviewText));
  if (bannedPattern) {
    throw new Error("REVIEW_CONTAINS_BANNED_PHRASE");
  }

  const toneScore = analyzeToneScore(reviewText);
  if (toneScore <= 0.4) {
    throw new Error(`REVIEW_TONE_SCORE_TOO_LOW:${toneScore}`);
  }

  return { toneScore, charCount };
}

export const __constants = {
  REVIEW_MIN_LENGTH,
  REVIEW_MAX_LENGTH,
  bannedPatterns,
};
