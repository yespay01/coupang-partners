const SEARCH_RATE_LIMIT_PATTERN = /사용 횟수|횟수.*초과|rate.?limit|too many requests/i;
const ISO_TIMESTAMP_PATTERN = /20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/;

let runtimeBlockedUntilMs = 0;

function parseFutureTimestamp(value, nowMs) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) && parsed > nowMs ? parsed : 0;
}

export function isCoupangSearchRateLimitMessage(message) {
  return SEARCH_RATE_LIMIT_PATTERN.test(String(message || ''));
}

export function registerCoupangSearchRateLimit(message, now = new Date()) {
  if (!isCoupangSearchRateLimitMessage(message)) return null;
  const nowMs = now.getTime();
  const timestamp = String(message || '').match(ISO_TIMESTAMP_PATTERN)?.[0];
  // 응답에 해제 시각이 없으면 공식 1회 위반 차단 시간인 24시간을 적용한다.
  const parsed = parseFutureTimestamp(timestamp, nowMs) || (nowMs + 24 * 60 * 60 * 1000);
  runtimeBlockedUntilMs = Math.max(runtimeBlockedUntilMs, parsed);
  return new Date(runtimeBlockedUntilMs);
}

export function getCoupangSearchCooldown(env = process.env, now = new Date()) {
  const nowMs = now.getTime();
  const configured = parseFutureTimestamp(env.COUPANG_SEARCH_BLOCKED_UNTIL, nowMs);
  const blockedUntilMs = Math.max(runtimeBlockedUntilMs, configured);
  if (blockedUntilMs <= nowMs) return null;
  return {
    blockedUntil: new Date(blockedUntilMs),
    message: `쿠팡 Search API 쿨다운 중입니다. ${new Date(blockedUntilMs).toISOString()} 이후 자동 재개합니다.`,
  };
}
