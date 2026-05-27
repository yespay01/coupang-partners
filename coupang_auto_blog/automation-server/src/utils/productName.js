/**
 * 쿠팡 상품명을 AI 프롬프트/표시용으로 정제
 *
 * 쿠팡 상품명은 SEO/검색용 키워드 덤프 + 모델 코드 + 부가설명이 잔뜩 붙어 있어서
 * 그대로 AI에 넘기면 본문 가독성이 크게 떨어진다.
 *
 * 예) "삼성전자 갤럭시 버즈3 프로 SM-R630NLAAKOO 블루투스 이어폰 신제품"
 *  → "삼성전자 갤럭시 버즈3 프로 블루투스 이어폰"
 *
 * web/lib/seo.ts의 키워드 추출과 같은 규칙을 사용한다.
 */

const STOP_WORDS = new Set([
  '신제품', '정품', '단품', '세트', '벌크', '본품', '사은품',
  '무료배송', '당일배송', '로켓배송', '특가', '할인', '쿠폰',
  '공식', '공식판매', '정식수입', '정식수입품', '병행수입',
  '선물', '선물용', '기프트', '박스', '패키지',
  '구매', '판매', '추천', '리뷰', '후기',
]);

/**
 * 모델 코드/괄호 부가설명/불용어를 제거하고 핵심 토큰만 남김.
 * 최대 토큰 수는 8개로 제한해 너무 긴 이름은 자동으로 줄어든다.
 *
 * @param {string} productName
 * @param {Object} [opts]
 * @param {number} [opts.maxTokens=8]
 * @returns {string} 정제된 상품명. 정제 후 비어버리면 원본을 그대로 반환.
 */
export function cleanProductName(productName, opts = {}) {
  if (!productName || typeof productName !== 'string') return productName || '';

  const maxTokens = opts.maxTokens ?? 8;

  const cleaned = productName
    // 괄호 안 부가설명 제거 ((정품), [공식판매], 【1+1】 등)
    .replace(/[\[(（【].*?[\])）】]/g, ' ')
    // 모델 코드 제거: 영문 대문자/숫자/하이픈 4자 이상 연속
    .replace(/\b[A-Z0-9][A-Z0-9-]{3,}\b/g, ' ')
    // 수량 토큰 제거: "5개", "2박스", "10팩", "3입", "12매", "1세트" 등
    .replace(/\b\d+\s*(개입|개|박스|팩|세트|입|매|장|회|병|캔|봉|봉지|포|구|줄|롤|매트|매트리스|단)\b/g, ' ')
    // 용량/무게/크기 단위 제거: "500g", "1kg", "200ml", "20인치" 등
    .replace(/\b\d+(\.\d+)?\s*(g|kg|mg|ml|l|cc|cm|mm|m|인치|inch|w)\b/gi, ' ')
    // 특수문자(슬래시 등) → 공백
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const seen = new Set();
  const tokens = [];
  for (const raw of cleaned.split(/\s+/)) {
    const t = raw.trim();
    if (!t) continue;
    if (t.length < 2) continue;
    if (STOP_WORDS.has(t.toLowerCase())) continue;
    if (/^\d+$/.test(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(t);
    if (tokens.length >= maxTokens) break;
  }

  const result = tokens.join(' ').trim();
  return result || productName;
}
