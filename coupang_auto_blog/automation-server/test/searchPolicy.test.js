import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCoupangSearchCooldown,
  isCoupangSearchRateLimitMessage,
  registerCoupangSearchRateLimit,
} from '../src/services/coupang/searchPolicy.js';

test('Search 한도 응답은 해제 시각까지 공통 쿨다운하고 이후 자동 해제한다', () => {
  const now = new Date('2026-08-28T08:00:00.000Z');
  const message = '검색 API의 시간당 사용 횟수를 초과했습니다. 2026-08-29T08:00:00.000Z 이후에 다시 시도';
  assert.equal(isCoupangSearchRateLimitMessage(message), true);
  assert.equal(registerCoupangSearchRateLimit(message, now)?.toISOString(), '2026-08-29T08:00:00.000Z');
  assert.equal(getCoupangSearchCooldown({}, now)?.blockedUntil.toISOString(), '2026-08-29T08:00:00.000Z');
  assert.equal(getCoupangSearchCooldown({}, new Date('2026-08-29T08:00:01.000Z')), null);
});

test('운영 환경에 지정한 미래 해제 시각도 외부 호출 전에 차단한다', () => {
  const cooldown = getCoupangSearchCooldown(
    { COUPANG_SEARCH_BLOCKED_UNTIL: '2026-08-30T00:00:00.000Z' },
    new Date('2026-08-29T00:00:00.000Z')
  );
  assert.equal(cooldown.blockedUntil.toISOString(), '2026-08-30T00:00:00.000Z');
});
