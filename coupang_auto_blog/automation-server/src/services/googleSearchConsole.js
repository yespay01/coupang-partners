import { google } from 'googleapis';
import { logger } from '../utils/logger.js';

/**
 * Google Search Console API 서비스
 * 환경변수:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL - Service Account 이메일
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY - Private Key (줄바꿈 포함, \\n → 실제 개행 변환)
 *   GOOGLE_SEARCH_CONSOLE_SITE_URL - 사이트 URL (예: https://semolink.store/)
 */

function isConfigured() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
  );
}

function getAuthClient() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/webmasters.readonly']
  );

  return auth;
}

function getDateRange(range) {
  const end = new Date();
  // GSC 데이터는 2~3일 지연되므로 endDate를 3일 전으로 설정
  end.setDate(end.getDate() - 3);

  const start = new Date(end);
  if (range === '7d') {
    start.setDate(start.getDate() - 7);
  } else if (range === '30d') {
    start.setDate(start.getDate() - 30);
  } else if (range === '90d') {
    start.setDate(start.getDate() - 90);
  } else {
    start.setDate(start.getDate() - 30);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

/**
 * 검색 키워드 조회
 */
export async function getSearchKeywords(dateRange = '30d') {
  if (!isConfigured()) {
    return { configured: false, keywords: [] };
  }

  try {
    const auth = getAuthClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const { startDate, endDate } = getDateRange(dateRange);

    const response = await searchconsole.searchanalytics.query({
      siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 50,
        dataState: 'final',
      },
    });

    const keywords = (response.data.rows || []).map(row => ({
      keyword: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Number((row.ctr * 100).toFixed(2)),
      position: Number(row.position.toFixed(1)),
    }));

    return { configured: true, keywords };
  } catch (error) {
    logger.error(`GSC 키워드 조회 실패: ${error.message}`);
    throw error;
  }
}

/**
 * 페이지별 검색 성과 조회
 */
export async function getPagePerformance(dateRange = '30d') {
  if (!isConfigured()) {
    return { configured: false, pages: [] };
  }

  try {
    const auth = getAuthClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const { startDate, endDate } = getDateRange(dateRange);

    const response = await searchconsole.searchanalytics.query({
      siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 50,
        dataState: 'final',
      },
    });

    const pages = (response.data.rows || []).map(row => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Number((row.ctr * 100).toFixed(2)),
      position: Number(row.position.toFixed(1)),
    }));

    return { configured: true, pages };
  } catch (error) {
    logger.error(`GSC 페이지 성과 조회 실패: ${error.message}`);
    throw error;
  }
}

/**
 * 검색 키워드 + 페이지 성과 한 번에 조회
 */
export async function getSearchConsoleData(dateRange = '30d') {
  if (!isConfigured()) {
    return {
      configured: false,
      keywords: [],
      pages: [],
      totalClicks: 0,
      totalImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
    };
  }

  try {
    const [keywordsResult, pagesResult] = await Promise.all([
      getSearchKeywords(dateRange),
      getPagePerformance(dateRange),
    ]);

    const keywords = keywordsResult.keywords;
    const pages = pagesResult.pages;

    const totalClicks = keywords.reduce((sum, k) => sum + k.clicks, 0);
    const totalImpressions = keywords.reduce((sum, k) => sum + k.impressions, 0);
    const averageCtr = totalImpressions > 0
      ? Number(((totalClicks / totalImpressions) * 100).toFixed(2))
      : 0;
    const averagePosition = keywords.length > 0
      ? Number((keywords.reduce((sum, k) => sum + k.position, 0) / keywords.length).toFixed(1))
      : 0;

    return {
      configured: true,
      keywords,
      pages,
      totalClicks,
      totalImpressions,
      averageCtr,
      averagePosition,
    };
  } catch (error) {
    logger.error(`GSC 데이터 조회 실패: ${error.message}`);
    throw error;
  }
}
