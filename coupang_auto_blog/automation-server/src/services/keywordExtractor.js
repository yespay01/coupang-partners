import { generateText } from './aiProviders.js';
import { logger } from '../utils/logger.js';

/**
 * AI를 사용해 상품명에서 분리된 SEO 키워드를 추출
 *
 * 쿠팡 상품명은 띄어쓰기 없이 붙어있는 경우가 많아 (예: "소씨네흥부골남원추어탕")
 * 단순 토큰화로는 검색 친화 키워드를 만들 수 없다. AI에 짧은 요청을 보내
 * 의미 단위로 분리된 5-8개 SEO 키워드를 받는다.
 *
 * 비용 최소화를 위해 maxTokens 300, low temperature 사용.
 */

const SYSTEM_PROMPT = `당신은 한국 SEO 전문가입니다.
주어진 상품의 검색 키워드를 JSON 배열로만 응답합니다.
다른 설명, 마크다운, 코드블록 없이 JSON 배열만 출력하세요.`;

function buildUserPrompt(productName, category) {
  return `다음 상품에 대해 한국 사용자가 실제로 검색할 SEO 키워드 5~8개를 추출해주세요.

상품명: ${productName}
카테고리: ${category || '미지정'}

규칙:
- 의미 단위로 분리된 키워드 (브랜드/지역/상품종류/사용처/타깃 등)
- 띄어쓰기가 없는 상품명은 의미 단위로 나눠서 분리
- 검색량이 높은 일반 검색어와 롱테일 검색어 모두 포함
- "쿠팡", "최저가", "리뷰", "후기"는 제외 (자동 추가됨)
- 모델코드, 영문 약어, 너무 일반적인 단어 제외

좋은 예 (상품명: "소씨네흥부골남원추어탕"):
["남원 추어탕", "소씨네 추어탕", "전통 추어탕", "보양식", "건강식품", "추어탕 맛집", "남원 음식"]

좋은 예 (상품명: "삼성 갤럭시 버즈3 프로"):
["갤럭시 버즈3 프로", "삼성 무선이어폰", "노이즈캔슬링 이어폰", "갤럭시 버즈3", "블루투스 이어폰", "삼성전자 이어폰"]

출력 형식: 문자열 JSON 배열만 (예: ["키워드1", "키워드2", ...])`;
}

function parseKeywords(text) {
  if (!text) return [];
  // JSON 배열 부분만 추출
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((k) => typeof k === 'string')
      .map((k) => k.trim())
      .filter((k) => k.length >= 2 && k.length <= 40);
  } catch {
    return [];
  }
}

/**
 * AI 기반 SEO 키워드 추출
 *
 * @param {Object} aiSettings - getSystemSettings().ai
 * @param {string} productName - 원본 또는 정제된 상품명
 * @param {string} [category] - 카테고리명
 * @returns {Promise<string[]>} 추출된 키워드 배열 (실패 시 빈 배열)
 */
export async function extractSeoKeywords(aiSettings, productName, category) {
  if (!productName) return [];

  try {
    // 짧은 응답이므로 maxTokens/temperature 최소화
    const lightSettings = {
      ...aiSettings,
      maxTokens: 300,
      temperature: 0.3,
    };

    const aiResult = await generateText(
      lightSettings,
      buildUserPrompt(productName, category),
      SYSTEM_PROMPT
    );

    const keywords = parseKeywords(aiResult?.text || '');
    if (keywords.length > 0) {
      logger.info(`SEO 키워드 추출 완료 (${keywords.length}개): ${keywords.join(', ')}`);
    } else {
      logger.warn(`SEO 키워드 추출 결과 없음. 원본 응답: ${aiResult?.text?.slice(0, 200)}`);
    }
    return keywords;
  } catch (err) {
    logger.warn(`SEO 키워드 추출 실패: ${err.message}`);
    return [];
  }
}
