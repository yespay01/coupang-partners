import { naverSearch } from './webSearch.js';
import { logger } from '../utils/logger.js';

/**
 * 네이버 뉴스 검색을 활용해 카테고리별 최신 헤드라인에서
 * 트렌딩 토픽을 추출하는 서비스
 *
 * 매번 카테고리 + 시드 쿼리를 랜덤하게 골라 네이버 뉴스에서 최신 헤드라인을
 * 가져오기 때문에 결과가 시간대별로 자연스럽게 갈리고 중복도 줄어든다.
 */

const TREND_CATEGORIES = [
  { name: '쇼핑', queries: ['이번주 인기 상품', '쇼핑 트렌드', '베스트셀러', '신상품 출시', '쇼핑 할인'] },
  { name: '생활/가전', queries: ['가전 신상', '생활용품 추천', '주방가전 트렌드', '청소기 인기', '에어컨 트렌드'] },
  { name: '식품', queries: ['간편식 트렌드', '건강식품 인기', '편의점 신상', '밀키트 추천', '음료 신상'] },
  { name: '뷰티/패션', queries: ['뷰티 트렌드', '패션 신상', '인기 화장품', '겨울 패션 트렌드', '스킨케어 추천'] },
  { name: '여행', queries: ['여행 트렌드', '국내여행지 추천', '항공권 할인', '호텔 할인 정보', '주말 여행지'] },
  { name: '경제/소비', queries: ['소비 트렌드', '가격 인상', '할인 정보', '물가 동향', '소비자 트렌드'] },
  { name: 'IT/디지털', queries: ['IT 신제품', '스마트폰 출시', '노트북 추천', '갤럭시 신제품', '태블릿 트렌드'] },
  { name: '건강', queries: ['건강 트렌드', '영양제 추천', '다이어트 식품', '운동 트렌드', '면역력 식품'] },
];

const HEADLINE_BANNED_PATTERNS = [
  /속보/, /단독/, /충격/, /논란/, /사망/, /사고/, /추락/, /참사/,
  /범죄/, /살인/, /폭행/, /사기/, /검찰/, /경찰/, /기소/, /선고/,
  /정치/, /대통령/, /국회/, /선거/, /북한/, /전쟁/,
];

function decodeHtml(s) {
  if (!s) return '';
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSafeHeadline(headline) {
  if (!headline || headline.length < 8) return false;
  return !HEADLINE_BANNED_PATTERNS.some((p) => p.test(headline));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 트렌드 토픽 1개 선정
 * 카테고리 풀에서 랜덤 선택 → 네이버 뉴스 검색 → 안전한 헤드라인 1개 추출.
 * 실패하면 시드 쿼리 자체를 topic으로 fallback.
 *
 * @param {Object} [opts]
 * @param {string[]} [opts.excludeCategories] - 직전 사용한 카테고리 제외 (중복 방지)
 * @returns {Promise<{topic: string, category: string, sourceHeadline: string|null}>}
 */
export async function pickTrendingTopic(opts = {}) {
  const exclude = new Set(opts.excludeCategories || []);
  const candidates = TREND_CATEGORIES.filter((c) => !exclude.has(c.name));
  const pool = candidates.length > 0 ? candidates : TREND_CATEGORIES;

  const category = pickRandom(pool);
  const seedQuery = pickRandom(category.queries);

  try {
    const items = await naverSearch(seedQuery, 'news', 10);
    const headlines = items
      .map((item) => decodeHtml(item.title))
      .filter(isSafeHeadline);

    if (headlines.length === 0) {
      logger.warn(`트렌딩 토픽: 안전한 헤드라인 없음 (seed="${seedQuery}"). 시드 쿼리로 fallback`);
      return { topic: seedQuery, category: category.name, sourceHeadline: null };
    }

    const headline = pickRandom(headlines);
    logger.info(`트렌딩 토픽 선정: [${category.name}] "${headline}"`);
    return { topic: headline, category: category.name, sourceHeadline: headline };
  } catch (err) {
    logger.warn(`트렌딩 토픽 검색 실패 (${err.message}). 시드 쿼리 fallback: "${seedQuery}"`);
    return { topic: seedQuery, category: category.name, sourceHeadline: null };
  }
}
