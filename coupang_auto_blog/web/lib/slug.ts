/**
 * Slug 생성 유틸리티
 * 상품명을 URL 친화적인 slug로 변환
 */

/**
 * 한글을 로마자로 변환 (간단한 음차)
 * 완벽한 변환은 아니지만 URL에 사용 가능한 형태로 만듦
 */
function transliterate(text: string): string {
  // 한글 음절을 로마자로 매핑 (초성, 중성, 종성)
  const CHO = [
    "g",
    "kk",
    "n",
    "d",
    "tt",
    "r",
    "m",
    "b",
    "pp",
    "s",
    "ss",
    "",
    "j",
    "jj",
    "ch",
    "k",
    "t",
    "p",
    "h",
  ];
  const JUNG = [
    "a",
    "ae",
    "ya",
    "yae",
    "eo",
    "e",
    "yeo",
    "ye",
    "o",
    "wa",
    "wae",
    "oe",
    "yo",
    "u",
    "wo",
    "we",
    "wi",
    "yu",
    "eu",
    "ui",
    "i",
  ];
  const JONG = [
    "",
    "g",
    "kk",
    "gs",
    "n",
    "nj",
    "nh",
    "d",
    "l",
    "lg",
    "lm",
    "lb",
    "ls",
    "lt",
    "lp",
    "lh",
    "m",
    "b",
    "bs",
    "s",
    "ss",
    "ng",
    "j",
    "ch",
    "k",
    "t",
    "p",
    "h",
  ];

  let result = "";

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // 한글 음절 범위 (0xAC00 ~ 0xD7A3)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const uniVal = code - 0xac00;
      const cho = Math.floor(uniVal / 588);
      const jung = Math.floor((uniVal - cho * 588) / 28);
      const jong = uniVal % 28;

      result += CHO[cho] + JUNG[jung] + JONG[jong];
    } else {
      // 한글이 아닌 경우 그대로 추가
      result += text[i];
    }
  }

  return result;
}

/**
 * 상품명과 productId로 고유한 slug 생성
 * @param productName 상품명
 * @param productId 상품 ID
 * @returns URL 친화적인 slug
 *
 * @example
 * generateSlug("샤오미 무선 청소기", "12345678")
 * // => "syaomi-museoncheongsogi-12345678"
 */
export function generateSlug(productName: string, productId: string): string {
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

  // 4. productId 마지막 8자리 추가 (고유성 보장)
  const uniqueId = productId.slice(-8);

  return `${truncated}-${uniqueId}`;
}

/**
 * slug에서 productId 추출
 * @param slug URL slug
 * @returns productId의 마지막 8자리 또는 null
 *
 * @example
 * extractProductIdFromSlug("syaomi-museoncheongsogi-12345678")
 * // => "12345678"
 */
export function extractProductIdFromSlug(slug: string): string | null {
  const parts = slug.split("-");
  const lastPart = parts[parts.length - 1];

  // 마지막 부분이 8자리 숫자 또는 영숫자 조합인지 확인
  if (lastPart && lastPart.length === 8) {
    return lastPart;
  }

  return null;
}

/**
 * slug 유효성 검사
 * @param slug 검사할 slug
 * @returns 유효하면 true
 */
export function isValidSlug(slug: string): boolean {
  // slug는 영문 소문자, 숫자, 하이픈만 포함
  // 최소 10자, 최대 60자
  const slugRegex = /^[a-z0-9-]{10,60}$/;
  return slugRegex.test(slug);
}
