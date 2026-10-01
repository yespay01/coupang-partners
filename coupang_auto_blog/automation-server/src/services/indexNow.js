/**
 * IndexNow: 새로 게시된 공개 URL을 Bing·Naver 등 참여 검색엔진에 즉시 알린다.
 *
 * 키 파일은 web/public/{key}.txt로 공개 서빙된다(키는 비밀값이 아니다).
 * 환경변수:
 *   INDEXNOW_ENABLED=false - 전송 중단 (기본: production에서만 전송)
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

export const INDEXNOW_KEY = '4313e3a3b4ab666be2c9becd7766a7fa';
export const INDEXNOW_SITE_URL = 'https://semolink.store';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10000;

export function isIndexNowEnabled(env = process.env) {
  if (env.INDEXNOW_ENABLED === 'false') return false;
  return env.NODE_ENV === 'production';
}

export function buildContentUrl(type, row) {
  const key = row?.slug || (row?.id != null ? String(row.id) : '');
  if (!key) return null;
  return `${INDEXNOW_SITE_URL}/${type}/${encodeURIComponent(key)}`;
}

export function buildIndexNowPayload(urls) {
  const host = new URL(INDEXNOW_SITE_URL).host;
  const urlList = [...new Set(urls)]
    .filter((url) => typeof url === 'string' && new URL(url).host === host)
    .slice(0, MAX_URLS_PER_REQUEST);
  if (urlList.length === 0) return null;
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${INDEXNOW_SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList,
  };
}

/** 실패해도 게시 흐름을 막지 않는다. 결과는 로그로만 남긴다. */
export async function submitIndexNow(urls, { fetchImpl = fetch, env = process.env } = {}) {
  if (!isIndexNowEnabled(env)) return { skipped: true };
  const payload = buildIndexNowPayload(urls);
  if (!payload) return { skipped: true };
  try {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const ok = response.status === 200 || response.status === 202;
    const log = ok ? logger.info : logger.warn;
    log(`IndexNow 전송 ${response.status}`, payload.urlList);
    return { ok, status: response.status };
  } catch (error) {
    logger.warn('IndexNow 전송 실패', error.message);
    return { ok: false, error: error.message };
  }
}

/** 응답을 기다리지 않고 백그라운드로 전송한다. */
export function notifyIndexNow(urls) {
  submitIndexNow(urls).catch(() => {});
}
