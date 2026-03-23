import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

/**
 * 네이버 검색 API
 * 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 * @param {string} query - 검색어
 * @param {'news'|'webkr'|'blog'} type - 검색 타입
 * @param {number} display - 결과 개수 (최대 100)
 */
export async function naverSearch(query, type = 'news', display = 5) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
  }

  const url = `https://openapi.naver.com/v1/search/${type}?query=${encodeURIComponent(query)}&display=${display}&sort=date`;

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`네이버 검색 API 오류 (${response.status}): ${body}`);
  }

  const data = await response.json();
  logger.info(`네이버 검색 완료: "${query}" (${type}) - ${data.items?.length || 0}건`);
  return data.items || [];
}

/**
 * 네이버 검색 결과를 AI 컨텍스트용 텍스트로 변환
 */
export function formatNaverResults(items, type = 'news') {
  if (!items.length) return '검색 결과 없음';

  return items.map((item, i) => {
    const title = item.title?.replace(/<[^>]*>/g, '') || '';
    const desc = item.description?.replace(/<[^>]*>/g, '') || '';
    const date = item.pubDate || item.postdate || '';
    return `[${i + 1}] ${title}\n날짜: ${date}\n내용: ${desc}`;
  }).join('\n\n');
}

/**
 * 동행복권 로또 최신 당첨번호 조회
 * 공개 API, 인증 불필요
 */
export async function getLatestLottoNumbers() {
  // 1회차: 2002-12-07 (토요일) 기준으로 현재 회차 계산
  const firstDraw = new Date('2002-12-07');
  const now = new Date();
  const weeksDiff = Math.floor((now - firstDraw) / (7 * 24 * 60 * 60 * 1000));
  const estimatedRound = weeksDiff + 1;

  // 최신 회차 시도 → 실패 시 이전 회차
  for (let round = estimatedRound; round >= estimatedRound - 2; round--) {
    try {
      const response = await fetch(
        `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`
      );
      if (!response.ok) continue;

      const data = await response.json();
      if (data.returnValue !== 'success') continue;

      logger.info(`로또 ${data.drwNo}회차 당첨번호 조회 성공`);
      return {
        round: data.drwNo,
        date: data.drwNoDate,
        numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
        bonus: data.bnusNo,
        firstWinAmount: data.firstWinamnt,
        firstWinCount: data.firstPrzwnerCo,
      };
    } catch (err) {
      logger.warn(`로또 ${round}회차 조회 실패: ${err.message}`);
    }
  }

  throw new Error('동행복권 API에서 최신 당첨번호를 가져올 수 없습니다.');
}

/**
 * 로또 데이터를 AI 컨텍스트용 텍스트로 변환
 */
export function formatLottoData(lotto) {
  return `제${lotto.round}회 로또 당첨번호 (${lotto.date})
당첨번호: ${lotto.numbers.join(', ')} + 보너스 ${lotto.bonus}
1등 당첨금액: ${lotto.firstWinAmount?.toLocaleString()}원
1등 당첨자 수: ${lotto.firstWinCount}명`;
}

/**
 * topic이 로또 관련인지 판단
 */
export function isLottoTopic(topic) {
  const keywords = ['로또', 'lotto', '복권', '당첨번호', '당첨 번호', '로또번호'];
  return keywords.some(kw => topic.toLowerCase().includes(kw.toLowerCase()));
}
