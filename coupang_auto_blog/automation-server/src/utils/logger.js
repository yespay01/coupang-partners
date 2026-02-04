/**
 * Simple logger utility
 * Replaces firebase-functions logger
 */

export const logger = {
  debug: (...args) => console.debug('[DEBUG]', ...args),
  info: (...args) => console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  log: (...args) => console.log('[LOG]', ...args),
};
