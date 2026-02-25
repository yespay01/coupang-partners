/**
 * Simple logger utility
 * Replaces firebase-functions logger
 */

import { getDb } from '../config/database.js';

export const logger = {
  debug: (...args) => console.debug('[DEBUG]', ...args),
  info: (...args) => console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  log: (...args) => console.log('[LOG]', ...args),
};

/**
 * DB logs 테이블에 로그 기록
 * @param {string} type - 로그 타입 (예: 'review-generate', 'collect')
 * @param {string} level - 로그 레벨 ('info', 'warn', 'error')
 * @param {string} message - 로그 메시지
 * @param {Object} payload - 추가 데이터
 */
export async function dbLog(type, level, message, payload = {}) {
  try {
    const db = getDb();
    await db.query(
      'INSERT INTO logs (type, level, message, payload) VALUES ($1, $2, $3, $4)',
      [type, level, message, JSON.stringify(payload)]
    );
  } catch (e) {
    console.error('DB 로그 기록 실패:', e.message);
  }
}
