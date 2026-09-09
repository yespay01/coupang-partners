import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAnalyticsHashSecret,
  getForwardedUserAgent,
  hashAnalyticsId,
  ingestAnalyticsBatch,
  sanitizeAnalyticsEvent,
} from '../src/services/analytics.js';
import { preparePublicAnalyticsEvents } from '../src/routes/analytics.js';

const SECRET = 'a'.repeat(64);
const EVENT_ID = '9f7908a2-4ba5-4b33-a65b-68b24e35a6cb';

function event(overrides = {}) {
  return {
    event_id: EVENT_ID,
    event_name: 'product_card_impression',
    occurred_at: new Date().toISOString(),
    anonymous_id: 'anonymous-from-body',
    session_id: 'session-from-body',
    page_view_id: 'c39bf2ce-0336-43a8-9ac2-c1e6159802ed',
    surface: 'legacy_detail',
    content_id: '한글-상품-슬러그',
    product_id: '123456',
    position: 'card_1',
    source: 'naver.com',
    device_type: 'mobile',
    schema_version: 1,
    ...overrides,
  };
}

test('공개 body의 raw ID는 무시하고 내부 프록시 헤더를 주입한다', () => {
  const prepared = preparePublicAnalyticsEvents(
    { events: [event()] },
    {
      'x-semolink-anonymous-id': 'anonymous-from-header',
      'x-semolink-session-id': 'session-from-header',
      'x-semolink-device-type': 'desktop',
    }
  );
  assert.equal(prepared[0].anonymous_id, 'anonymous-from-header');
  assert.equal(prepared[0].session_id, 'session-from-header');
  assert.equal(prepared[0].device_type, 'desktop');
});

test('한글 content_id와 도메인 source를 유실 없이 허용하고 raw ID는 HMAC만 남긴다', () => {
  const result = sanitizeAnalyticsEvent(event({ ignored_field: 'ignored' }), SECRET);
  assert.equal(result.valid, true);
  assert.equal(result.event.contentId, '한글-상품-슬러그');
  assert.equal(result.event.source, 'naver.com');
  assert.equal(result.event.anonymousIdHash, hashAnalyticsId('anonymous-from-body', SECRET));
  assert.equal(result.event.sessionIdHash, hashAnalyticsId('session-from-body', SECRET));
  assert.equal('anonymous_id' in result.event, false);
  assert.equal('ignored_field' in result.event, false);
});

test('관련 상품 surface의 노출과 클릭 컨텍스를 허용한다', () => {
  const result = sanitizeAnalyticsEvent(event({ surface: 'related' }), SECRET);
  assert.equal(result.valid, true);
  assert.equal(result.event.surface, 'related');
});

test('분석 비밀값은 하드코딩 fallback을 사용하지 않는다', () => {
  assert.equal(getAnalyticsHashSecret({}), null);
  assert.equal(getAnalyticsHashSecret({ JWT_SECRET: 'your-jwt-secret' }), null);
  assert.equal(getAnalyticsHashSecret({ JWT_SECRET: SECRET }), SECRET);
  assert.equal(getAnalyticsHashSecret({ ANALYTICS_HASH_SECRET: 'b'.repeat(64) }), 'b'.repeat(64));
});

test('원본 UA는 x-semolink-user-agent를 우선하고 제어문자를 제거한다', () => {
  assert.equal(
    getForwardedUserAgent({
      'x-semolink-user-agent': 'Googlebot\nInjected',
      'user-agent': 'undici',
    }),
    'GooglebotInjected'
  );
});

test('batch ingest는 ON CONFLICT 중복을 계수하고 Pool 수준 BEGIN을 사용하지 않는다', async () => {
  const stored = new Map();
  const calls = [];
  const db = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      assert.notEqual(sql, 'BEGIN');
      assert.notEqual(sql, 'COMMIT');
      assert.notEqual(sql, 'ROLLBACK');
      if (/UPDATE analytics_events/.test(sql)) {
        stored.get(params[0]).isDuplicate = true;
        return { rowCount: 1, rows: [] };
      }
      const id = params[0];
      if (stored.has(id)) return { rowCount: 0, rows: [] };
      stored.set(id, { isDuplicate: false });
      return { rowCount: 1, rows: [{ event_id: id }] };
    },
  };

  const result = await ingestAnalyticsBatch(db, [event(), event()], {
    secret: SECRET,
    userAgent: 'Mozilla/5.0',
  });
  assert.deepEqual(result, {
    accepted: 1,
    duplicates: 1,
    rejected: 0,
    rejectionDetails: [],
  });
  assert.match(calls[0].sql, /Asia\/Seoul/);
  assert.equal(calls[0].params.includes('anonymous-from-body'), false);
  assert.equal(calls[0].params.includes('session-from-body'), false);
  assert.equal(stored.get(EVENT_ID).isDuplicate, true);
  assert.equal(calls.filter((call) => /UPDATE analytics_events/.test(call.sql)).length, 1);
});

test('공개 batch는 outbound_click과 50개 초과를 거부한다', async () => {
  assert.equal(
    sanitizeAnalyticsEvent(event({ event_name: 'outbound_click' }), SECRET).reason,
    'invalid_event_name'
  );
  await assert.rejects(
    () => ingestAnalyticsBatch({ query() {} }, Array.from({ length: 51 }, () => event()), { secret: SECRET }),
    /50개/
  );
  await assert.rejects(
    () => ingestAnalyticsBatch({ query() {} }, [event()], { secret: null }),
    (error) => error.status === 503
  );
});
