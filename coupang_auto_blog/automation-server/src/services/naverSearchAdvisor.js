import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { getDb } from '../config/database.js';
import { notifySlack } from './slack.js';

const NAVER_SA_API_BASE = 'https://searchadvisor.naver.com/api-console/report/expose';
const NAVER_SA_CONSOLE_URL = 'https://searchadvisor.naver.com/console/board';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const REFERER = 'https://searchadvisor.naver.com/console/site/report/expose?site=https%3A%2F%2Fsemolink.store';

const DB_KEY = 'naver_sa';

/**
 * DB에서 네이버 SA 쿠키/설정 조회 (DB 우선, 환경변수 fallback)
 */
export async function getNaverSaCredentials() {
  try {
    const db = getDb();
    const result = await db.query("SELECT value FROM settings WHERE key = $1", [DB_KEY]);

    if (result.rows.length > 0) {
      const data = result.rows[0].value;
      if (data.cookies && data.siteHash) {
        return {
          cookies: data.cookies,
          siteHash: data.siteHash,
          updatedAt: data.updatedAt || null,
          source: 'db',
        };
      }
    }
  } catch (error) {
    logger.error('네이버 SA DB 조회 실패, 환경변수 fallback:', error.message);
  }

  // 환경변수 fallback
  const cookies = process.env.NAVER_SA_COOKIES;
  const siteHash = process.env.NAVER_SA_SITE_HASH;

  if (cookies && siteHash) {
    return { cookies, siteHash, updatedAt: null, source: 'env' };
  }

  return null;
}

/**
 * 네이버 SA 쿠키를 DB에 저장
 */
export async function saveNaverSaCookies(cookies, siteHash) {
  const db = getDb();
  const value = {
    cookies,
    siteHash: siteHash || process.env.NAVER_SA_SITE_HASH || '4b2cc44a6fc01e87c7081210a5c4a974e1b02b6d701dbf3c379563b913f65984',
    updatedAt: new Date().toISOString(),
  };

  await db.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
    [DB_KEY, JSON.stringify(value)]
  );

  logger.info('네이버 SA 쿠키 DB 저장 완료');
}

/**
 * 네이버 SA 쿠키 상태 확인
 */
export async function getNaverSaStatus() {
  const creds = await getNaverSaCredentials();

  if (!creds) {
    return { configured: false, status: 'not_configured', message: '쿠키 미설정' };
  }

  // 간단한 API 호출로 쿠키 유효성 확인
  try {
    const siteUrl = encodeURIComponent('https://semolink.store');
    const url = `${NAVER_SA_API_BASE}/${creds.siteHash}?site=${siteUrl}&period=7&device=d&topN=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'cookie': creds.cookies,
        'referer': REFERER,
        'user-agent': USER_AGENT,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.items) {
        return {
          configured: true,
          status: 'active',
          message: '정상',
          source: creds.source,
          updatedAt: creds.updatedAt,
        };
      }
    }

    return {
      configured: true,
      status: 'expired',
      message: '세션 쿠키가 만료되었습니다',
      source: creds.source,
      updatedAt: creds.updatedAt,
    };
  } catch (error) {
    return {
      configured: true,
      status: 'error',
      message: `확인 실패: ${error.message}`,
      source: creds.source,
      updatedAt: creds.updatedAt,
    };
  }
}

/**
 * 네이버 세션 쿠키 갱신 (keep-alive)
 * 서치어드바이저에 요청을 보내 Set-Cookie로 갱신된 쿠키를 받아 저장
 */
export async function refreshNaverSession() {
  const creds = await getNaverSaCredentials();

  if (!creds) {
    logger.info('네이버 SA 쿠키 미설정 - 세션 갱신 건너뜀');
    return { refreshed: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(NAVER_SA_CONSOLE_URL, {
      method: 'GET',
      headers: {
        'cookie': creds.cookies,
        'user-agent': USER_AGENT,
        'accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'manual',
    });

    // 302 redirect to login = 세션 만료
    if (response.status === 302) {
      const location = response.headers.get('location') || '';
      if (location.includes('nidlogin') || location.includes('nid.naver.com')) {
        logger.warn('네이버 SA 세션 만료 감지');
        try {
          await notifySlack('⚠️ 네이버 서치어드바이저 세션 쿠키가 만료되었습니다. 크롬에서 네이버 로그인 후 쿠키 동기화를 실행하세요.');
        } catch {}
        return { refreshed: false, reason: 'session_expired' };
      }
    }

    // Set-Cookie 헤더에서 갱신된 쿠키 추출
    const setCookies = response.headers.raw()['set-cookie'];
    if (setCookies && setCookies.length > 0) {
      // 기존 쿠키를 파싱하여 갱신된 값으로 교체
      const cookieMap = {};
      creds.cookies.split('; ').forEach(c => {
        const idx = c.indexOf('=');
        if (idx > 0) cookieMap[c.substring(0, idx)] = c.substring(idx + 1);
      });

      setCookies.forEach(sc => {
        const parts = sc.split(';')[0]; // 첫 번째 부분만 (name=value)
        const idx = parts.indexOf('=');
        if (idx > 0) {
          const name = parts.substring(0, idx).trim();
          const value = parts.substring(idx + 1).trim();
          cookieMap[name] = value;
        }
      });

      const newCookieString = Object.entries(cookieMap)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

      // 변경이 있으면 DB에 저장
      if (newCookieString !== creds.cookies) {
        await saveNaverSaCookies(newCookieString, creds.siteHash);
        logger.info('네이버 SA 세션 쿠키 갱신 완료 (Set-Cookie 반영)');
        return { refreshed: true, reason: 'cookies_updated' };
      }
    }

    // 200 OK면 세션 여전히 유효
    if (response.ok || response.status === 200) {
      logger.info('네이버 SA 세션 유효 - keep-alive 성공');
      return { refreshed: true, reason: 'session_alive' };
    }

    return { refreshed: false, reason: `unexpected_status_${response.status}` };
  } catch (error) {
    logger.error('네이버 SA 세션 갱신 오류:', error.message);
    return { refreshed: false, reason: `error: ${error.message}` };
  }
}

/**
 * 네이버 서치어드바이저 내부 API에서 검색 키워드 + 웹문서 데이터 수집
 * 세션 쿠키 기반 인증 (공식 API 없음)
 */
export async function getNaverSearchData(dateRange = '30d') {
  const creds = await getNaverSaCredentials();

  if (!creds) {
    return {
      configured: false,
      message: '네이버 서치어드바이저 쿠키가 설정되지 않았습니다',
    };
  }

  const { cookies, siteHash } = creds;

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
        cookieStatus: 'active',
        cookieUpdatedAt: creds.updatedAt,
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
      cookieStatus: 'active',
      cookieUpdatedAt: creds.updatedAt,
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
