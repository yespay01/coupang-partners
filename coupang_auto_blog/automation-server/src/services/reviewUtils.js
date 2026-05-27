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

/**
 * AI가 생성한 리뷰 본문에서 마크다운 잔재와 단계 라벨을 정리.
 * 시스템 프롬프트에 "마크다운 금지"가 있어도 AI가 어기는 경우가 잦아
 * 화면에 별표·해시·[단계] 같은 노이즈가 그대로 노출되는 것을 방지한다.
 */
export function sanitizeReviewText(text) {
  if (!text) return '';

  let s = String(text);

  // 코드블록(```...```) 제거
  s = s.replace(/```[\s\S]*?```/g, '');

  // 굵은체/이탤릭/취소선/언더스코어 마크다운: 기호만 제거하고 텍스트는 유지
  // **굵게**, __굵게__, *기울임*, _기울임_, ~~취소~~
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '$1');
  s = s.replace(/__([^_\n]+?)__/g, '$1');
  s = s.replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, '$1');
  s = s.replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '$1');
  s = s.replace(/~~([^~\n]+?)~~/g, '$1');

  // 줄 시작의 헤더(##, ### …)와 인용/리스트 기호 제거
  s = s.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');
  s = s.replace(/^[ \t]*>[ \t]+/gm, '');
  s = s.replace(/^[ \t]*[-*+][ \t]+/gm, '');

  // 단계 라벨: [1단계: ...], 【2단계】, (3단계 - ...) 등
  s = s.replace(/^[ \t]*[\[(（【]?\s*\d+\s*단계[^\]\n)）】]*[\])）】]?\s*[:：]?[ \t]*\n?/gm, '');
  // 단계 라벨: 줄 시작의 "1.", "1)", "①" 같은 순서 번호 + 공백
  s = s.replace(/^[ \t]*([0-9]+[.)）]|[①②③④⑤⑥⑦⑧⑨⑩])[ \t]+/gm, '');

  // 줄 시작의 "구매 계기:", "사용 느낌:" 같이 단계 명칭이 콜론으로 끝나는 라벨 제거
  s = s.replace(/^[ \t]*(구매\s*계기|구매계기|실제\s*사용\s*느낌|사용\s*느낌|솔직한?\s*평가|평가|마무리|총평|결론|장점|단점|아쉬운\s*점|좋은\s*점|추천|요약)[ \t]*[:：][ \t]*\n?/gm, '');

  // 본문 첫 줄이 "상품명 후기/리뷰" 같은 제목 형태이면 통째로 제거
  const lines = s.split(/\r?\n/);
  while (lines.length > 0) {
    const first = lines[0].trim();
    if (!first) {
      lines.shift();
      continue;
    }
    const looksLikeTitle =
      /(후기|리뷰|솔직\s*후기|사용기|체험기|내돈내산)\s*$/i.test(first) &&
      first.length <= 60 &&
      !/[.!?。…]$/.test(first);
    if (looksLikeTitle) {
      lines.shift();
      continue;
    }
    break;
  }
  s = lines.join('\n');

  // 연속 빈 줄 정리 (2줄 초과 → 1줄)
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]+\n/g, '\n');

  return s.trim();
}

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

/**
 * Firestore 설정 기반 프롬프트 빌드
 * @param {Object} product - 상품 정보 { name, category }
 * @param {Object} promptSettings - 프롬프트 설정
 */
export function buildPromptFromSettings(product, promptSettings) {
  const { reviewTemplate, additionalGuidelines, minLength, maxLength } = promptSettings;

  const productName = product.name || product.productName || "상품";
  const category = product.category || product.categoryName || "기타";

  // 템플릿 변수 치환
  const basePrompt = reviewTemplate
    .replace(/{productName}/g, productName)
    .replace(/{category}/g, category)
    .replace(/{minLength}/g, String(minLength))
    .replace(/{maxLength}/g, String(maxLength));

  // 상세 가이드라인 변수 치환
  const guidelines = additionalGuidelines
    ? additionalGuidelines
        .replace(/{productName}/g, productName)
        .replace(/{category}/g, category)
        .replace(/{minLength}/g, String(minLength))
        .replace(/{maxLength}/g, String(maxLength))
    : "";

  return basePrompt + (guidelines ? "\n\n" + guidelines : "");
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

/**
 * Firestore 설정 기반 리뷰 내용 검증
 * @param {string} reviewText - 검증할 리뷰 텍스트
 * @param {Object} promptSettings - 프롬프트 설정
 */
export function validateReviewContentWithSettings(reviewText, promptSettings) {
  const { minLength, maxLength, toneScoreThreshold } = promptSettings;
  const charCount = Array.from(reviewText ?? "").length;

  // 글자 수 검증
  if (charCount < minLength || charCount > maxLength) {
    throw new Error(`REVIEW_LENGTH_OUT_OF_RANGE:${charCount} (허용: ${minLength}~${maxLength})`);
  }

  // 금지 패턴 검증
  const bannedPattern = bannedPatterns.find((pattern) => pattern.test(reviewText));
  if (bannedPattern) {
    throw new Error("REVIEW_CONTAINS_BANNED_PHRASE");
  }

  // 톤 점수 검증
  const toneScore = analyzeToneScore(reviewText);
  if (toneScore <= toneScoreThreshold) {
    throw new Error(`REVIEW_TONE_SCORE_TOO_LOW:${toneScore} (임계값: ${toneScoreThreshold})`);
  }

  return { toneScore, charCount };
}

export const __constants = {
  REVIEW_MIN_LENGTH,
  REVIEW_MAX_LENGTH,
  bannedPatterns,
};
