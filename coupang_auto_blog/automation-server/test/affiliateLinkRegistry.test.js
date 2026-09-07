import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPublicGoUrl,
  fingerprintDestination,
  registerAffiliateLink,
  validateAffiliateLinkRegistration,
  validateRegisteredAffiliateLink,
} from '../src/services/coupang/affiliateLinkRegistry.js';
import {
  buildOutboundContext,
  handleOutboundRedirect,
  recordOutboundClick,
} from '../src/routes/outbound.js';

const PARTNER_ID = 'AF7225079';
const LINK_ID = '9f7908a2-4ba5-4b33-a65b-68b24e35a6cb';
const LONG_URL = `https://link.coupang.com/re/AFFSDP?lptag=${PARTNER_ID}&pageKey=123`;
const SECRET = 'a'.repeat(64);

test('registry는 허용 hostname과 Partner ID를 검증하고 공개 /go URL만 만든다', () => {
  assert.equal(validateAffiliateLinkRegistration({
    destinationUrl: LONG_URL,
    partnerId: PARTNER_ID,
    linkSource: 'product_api',
  }).valid, true);
  assert.equal(validateAffiliateLinkRegistration({
    destinationUrl: LONG_URL.replace(PARTNER_ID, 'AF9999999'),
    partnerId: PARTNER_ID,
    linkSource: 'product_api',
  }).valid, false);
  assert.equal(buildPublicGoUrl(LINK_ID), `/go/${LINK_ID}`);
  assert.equal(buildPublicGoUrl('not-a-uuid'), null);
});

test('destination fingerprint unique upsert는 동일 URL에 안정적인 link_id를 반환한다', async () => {
  const stableRow = { link_id: LINK_ID, destination_url: LONG_URL };
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [stableRow], rowCount: 1 };
    },
  };
  const input = {
    productId: '123',
    destinationUrl: LONG_URL,
    partnerId: PARTNER_ID,
    subId: '',
    linkSource: 'product_api',
  };
  const first = await registerAffiliateLink(db, input);
  const second = await registerAffiliateLink(db, input);
  assert.equal(first.link_id, second.link_id);
  assert.match(calls[0].sql, /ON CONFLICT \(destination_fingerprint\)/);
  assert.equal(calls[0].params[1], fingerprintDestination(LONG_URL));
  assert.equal(calls[0].params[6], '');
});

test('/go는 active verified registry 링크만 이동한다', () => {
  const base = {
    link_id: LINK_ID,
    destination_url: LONG_URL,
    landing_url: null,
    partner_tracking_code: PARTNER_ID,
    link_source: 'product_api',
    validation_status: 'verified',
    is_active: true,
  };
  assert.equal(validateRegisteredAffiliateLink(base, PARTNER_ID).valid, true);
  assert.equal(validateRegisteredAffiliateLink({ ...base, is_active: false }, PARTNER_ID).valid, false);
  assert.equal(validateRegisteredAffiliateLink(base, 'AF9999999').valid, false);
});

test('outbound context는 식별자를 body/query가 아닌 헤더에서 읽고 pv UUID와 surface를 제한한다', () => {
  const context = buildOutboundContext({
    headers: {
      'x-semolink-anonymous-id': 'anonymous-header',
      'x-semolink-session-id': 'session-header',
      'x-semolink-user-agent': 'Mozilla/5.0 (iPhone; Mobile)',
    },
    query: {
      anonymous_id: 'ignored-query-id',
      session_id: 'ignored-query-session',
      pv: LINK_ID,
      surface: 'legacy_detail',
      content_id: '한글-리뷰',
      source: 'naver.com',
    },
  }, {
    link_id: LINK_ID,
    product_id: '123',
    product_name: 'test',
  });
  assert.equal(context.anonymousId, 'anonymous-header');
  assert.equal(context.sessionId, 'session-header');
  assert.equal(context.pageViewId, LINK_ID);
  assert.equal(context.surface, 'legacy_detail');
  assert.equal(context.contentId, '한글-리뷰');
  assert.equal(context.source, 'naver.com');
  assert.equal(context.deviceType, 'mobile');

  const invalid = buildOutboundContext({ headers: {}, query: { pv: 'bad', surface: 'evil' } }, {
    link_id: LINK_ID,
  });
  assert.equal(invalid.pageViewId, null);
  assert.equal(invalid.surface, 'other');
});

test('bot outbound는 legacy coupang_clicks를 오염시키지 않는다', async () => {
  const calls = [];
  const db = {
    async query(sql) {
      calls.push(sql);
      return { rowCount: 1, rows: [] };
    },
  };
  await recordOutboundClick(db, {
    anonymousId: 'anonymous-header',
    sessionId: 'session-header',
    pageViewId: LINK_ID,
    surface: 'legacy_detail',
    contentId: '한글-리뷰',
    position: 'top',
    deviceType: 'desktop',
    userAgent: 'Googlebot',
    linkId: LINK_ID,
    productId: '123',
  }, SECRET);
  assert.equal(calls.some((sql) => /INSERT INTO coupang_clicks/.test(sql)), false);
  assert.equal(calls.some((sql) => /INSERT INTO analytics_events/.test(sql)), true);
});

test('추적 쓰기 실패는 검증된 /go 302 응답을 막지 않는다', async () => {
  const response = {
    statusCode: null,
    destination: null,
    set() {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.jsonValue = value; return this; },
    redirect(code, destination) { this.statusCode = code; this.destination = destination; return this; },
  };
  const request = {
    params: { linkId: LINK_ID },
    headers: {},
    query: {},
  };
  const link = {
    link_id: LINK_ID,
    destination_url: LONG_URL,
    landing_url: null,
    partner_tracking_code: PARTNER_ID,
    link_source: 'product_api',
    validation_status: 'verified',
    is_active: true,
  };
  const result = await handleOutboundRedirect(request, response, {
    db: {},
    loadLink: async () => link,
    loadSettings: async () => ({ coupang: { partnerId: PARTNER_ID } }),
    loadSecret: () => null,
    recordClick: async () => { throw new Error('tracking unavailable'); },
  });
  await result.trackingPromise;
  assert.equal(response.statusCode, 302);
  assert.equal(response.destination, LONG_URL);
});

test('/go 설정 조회 실패는 목적지를 추측하지 않고 503으로 fail-closed 처리한다', async () => {
  const response = {
    statusCode: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.jsonValue = value; return this; },
  };
  const result = await handleOutboundRedirect(
    { params: { linkId: LINK_ID }, headers: {}, query: {} },
    response,
    {
      db: {},
      loadLink: async () => ({ link_id: LINK_ID }),
      loadSettings: async () => { throw new Error('settings unavailable'); },
    }
  );
  assert.equal(result, response);
  assert.equal(response.statusCode, 503);
});
