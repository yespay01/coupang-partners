import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

const NAVER_SA_API_BASE = 'https://searchadvisor.naver.com/api-console/report/expose';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const REFERER = 'https://searchadvisor.naver.com/console/site/report/expose?site=https%3A%2F%2Fsemolink.store';

/**
 * 네이버 서치어드바이저 내부 API에서 검색 키워드 + 웹문서 데이터 수집
 * 세션 쿠키 기반 인증 (공식 API 없음)
 */
export async function getNaverSearchData(dateRange = '30d') {
  const cookies = process.env.NAVER_SA_COOKIES;
  const siteHash = process.env.NAVER_SA_SITE_HASH;

  if (!cookies || !siteHash) {
    return {
      configured: false,
      message: '네이버 서치어드바이저 환경변수가 설정되지 않았습니다 (NAVER_SA_COOKIES, NAVER_SA_SITE_HASH)',
    };
  }

  // dateRange를 period 숫자로 변환
  let period = 30;
  if (dateRange === '7d' || dateRange === '24h') period = 7;
  else if (dateRange === '30d') period = 30;
  else if (dateRange === 'all') period = 90;

  const siteUrl = encodeURIComponent('https://semolink.store');
  const url = `${NAVER_SA_API_BASE}/${siteHash}?site=${siteUrl}&period=${period}&device=d&topN=30`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'cookie': cookies,
        'referer': REFERER,
        'user-agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          configured: false,
          message: '네이버 서치어드바이저 세션 쿠키가 만료되었습니다. 재로그인 후 쿠키를 갱신하세요.',
        };
      }
      throw new Error(`Naver SA API responded with ${response.status}`);
    }

    const data = await response.json();
    const items = data?.items?.[0];

    if (!items) {
      return {
        configured: true,
        keywords: [],
        pages: [],
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
      };
    }

    // querys 배열: 검색 키워드 데이터
    const keywords = (items.querys || []).map(q => ({
      keyword: q.key || '',
      clicks: q.clickCount || 0,
      impressions: q.exposeCount || 0,
      ctr: q.ctr != null ? parseFloat(q.ctr.toFixed(2)) : 0,
      position: q.exposedRank != null ? parseFloat(q.exposedRank.toFixed(1)) : 0,
    }));

    // urls 배열: 웹문서 데이터
    const pages = (items.urls || []).map(u => {
      let pageUrl = u.key || '';
      try { pageUrl = decodeURIComponent(pageUrl); } catch {}
      return {
        page: pageUrl,
        clicks: u.clickCount || 0,
        impressions: u.exposeCount || 0,
        ctr: u.ctr != null ? parseFloat(u.ctr.toFixed(2)) : 0,
        position: u.exposedRank != null ? parseFloat(u.exposedRank.toFixed(1)) : 0,
      };
    });

    // period: 기간 합계
    const periodData = items.period || {};
    const totalClicks = periodData.clickCount || keywords.reduce((s, k) => s + k.clicks, 0);
    const totalImpressions = periodData.exposeCount || keywords.reduce((s, k) => s + k.impressions, 0);
    const averageCtr = periodData.ctr != null
      ? parseFloat(periodData.ctr.toFixed(2))
      : (totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0);

    return {
      configured: true,
      keywords,
      pages,
      totalClicks,
      totalImpressions,
      averageCtr,
    };
  } catch (error) {
    logger.error('네이버 서치어드바이저 API 호출 오류:', error);

    // JSON 파싱 실패 = 세션 만료 (로그인 페이지 HTML 반환)
    if (error.message?.includes('Unexpected token') || error.message?.includes('invalid json')) {
      return {
        configured: false,
        message: '네이버 서치어드바이저 세션 쿠키가 만료되었습니다. 재로그인 후 쿠키를 갱신하세요.',
      };
    }

    throw error;
  }
}
