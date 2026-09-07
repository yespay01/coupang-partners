import test from 'node:test';
import assert from 'node:assert/strict';

import { refreshExistingProductPrices, saveProduct } from '../src/routes/collect.js';
import {
  loadProductSitemapRows,
  mapPriceCoverage,
  mapPublicProductSummary,
  parsePriceHistoryDays,
  parseProductSitemapPagination,
} from '../src/routes/priceHistory.js';
import {
  applyObservedProductPrice,
  buildPriceHistoryDto,
  normalizeObservedPrice,
  recordPriceObservation,
} from '../src/services/priceObservations.js';
import {
  isPriceObservationEnabled,
  normalizePriceObservationLimit,
  runDailyPriceObservationJob,
} from '../src/services/priceObservationJob.js';

const PARTNER_ID = 'AF7225079';
const LINK_ID = '9f7908a2-4ba5-4b33-a65b-68b24e35a6cb';
const PRODUCT_URL = `https://link.coupang.com/re/AFFSDP?lptag=${PARTNER_ID}&pageKey=123`;

test('가격은 실제 양의 정수 원화 값만 허용한다', () => {
  assert.equal(normalizeObservedPrice(12900), 12900);
  assert.equal(normalizeObservedPrice('12900'), 12900);
  assert.equal(normalizeObservedPrice(0), null);
  assert.equal(normalizeObservedPrice(-1), null);
  assert.equal(normalizeObservedPrice(12.5), null);
  assert.equal(normalizeObservedPrice('12,900'), null);
});

test('관측 저장은 KST 일자별 멱등 upsert이며 합성값을 DB에서도 금지한다', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return {
        rowCount: 1,
        rows: [{
          observation_id: LINK_ID,
          product_id: '123',
          price_krw: '12900',
          observed_at: params[3],
          business_date_kst: '2026-08-28',
          observation_source: 'collection',
          is_synthetic: false,
        }],
      };
    },
  };
  const row = await recordPriceObservation(db, {
    productId: '123', priceKrw: 12900,
    observedAt: new Date('2026-08-28T03:00:00Z'), source: 'collection', context: 'keyword:이어폰',
  });
  assert.equal(row.is_synthetic, false);
  assert.match(calls[0].sql, /AT TIME ZONE 'Asia\/Seoul'/);
  assert.match(calls[0].sql, /ON CONFLICT \(product_id, business_date_kst\) DO UPDATE/);
  assert.match(calls[0].sql, /EXCLUDED\.observed_at >= price_observations\.observed_at/);
  assert.match(calls[0].sql, /is_synthetic = FALSE/);
});

test('공개 가격 이력은 실제 점 2개 미만에서 차트 불가 상태를 명시한다', () => {
  const one = buildPriceHistoryDto('123', [{
    business_date_kst: '2026-08-28', observed_at: '2026-08-28T03:00:00Z',
    price_krw: '12900', currency: 'KRW', observation_source: 'collection',
  }]);
  assert.equal(one.chartStatus, 'insufficient_data');
  assert.equal(one.minimumPointCount, 2);
  assert.equal(one.isSynthetic, false);
  const two = buildPriceHistoryDto('123', [
    ...one.points.map((point) => ({
      business_date_kst: point.businessDateKst, observed_at: point.observedAt,
      price_krw: point.priceKrw, currency: point.currency, observation_source: point.source,
    })),
    { business_date_kst: '2026-08-29', observed_at: '2026-08-29T03:00:00Z',
      price_krw: 12500, currency: 'KRW', observation_source: 'daily_search_match' },
  ]);
  assert.equal(two.chartStatus, 'available');
  assert.equal(parsePriceHistoryDays('365'), 365);
  assert.throws(() => parsePriceHistoryDays('366'), /365일/);
  assert.throws(() => parsePriceHistoryDays('30days'), /365일/);
});

test('공개 상품 요약은 표시 필드와 검증된 중앙 링크만 반환하고 raw URL/리뷰를 노출하지 않는다', () => {
  const dto = mapPublicProductSummary({
    product_id: '123',
    product_name: '상세 상품',
    latest_price_krw: '12900',
    last_observed_at: new Date('2026-08-28T03:00:00Z'),
    product_image: 'https://example.com/product.jpg',
    category_name: '디지털',
    updated_at: new Date('2026-08-28T03:00:00Z'),
    link_id: LINK_ID,
    destination_url: PRODUCT_URL,
    landing_url: null,
    partner_tracking_code: PARTNER_ID,
    sub_id: '',
    link_source: 'product_api',
    validation_status: 'verified',
    validation_reason: null,
    validated_at: new Date('2026-08-28T03:00:00Z'),
    is_active: true,
    product_url: PRODUCT_URL,
    affiliate_url: PRODUCT_URL,
    content: '노출되면 안 되는 리뷰 본문',
  }, PARTNER_ID);
  assert.deepEqual(dto, {
    productId: '123',
    productName: '상세 상품',
    currentPriceKrw: 12900,
    priceObservedAt: '2026-08-28T03:00:00.000Z',
    productImage: 'https://example.com/product.jpg',
    categoryName: '디지털',
    updatedAt: '2026-08-28T03:00:00.000Z',
    affiliateLink: { linkId: LINK_ID, goUrl: `/go/${LINK_ID}` },
  });
  assert.equal('productUrl' in dto, false);
  assert.equal('affiliateUrl' in dto, false);
  assert.equal('content' in dto, false);

  const mismatch = mapPublicProductSummary({
    product_id: '123', product_name: '상세 상품', link_id: LINK_ID,
    destination_url: PRODUCT_URL, partner_tracking_code: PARTNER_ID,
    link_source: 'product_api', validation_status: 'verified', is_active: true,
  }, 'AF9999999');
  assert.equal(mismatch.affiliateLink, undefined);
});

test('가격 추적 커버리지는 전체·추적·미추적·오늘 관측을 일관되게 계산한다', () => {
  assert.deepEqual(mapPriceCoverage({
    eligible_product_count: '453', tracked_product_count: '67', observed_today_count: '50',
  }), {
    eligibleProductCount: 453,
    trackedProductCount: 67,
    untrackedProductCount: 386,
    observedTodayCount: 50,
    coveragePercent: 14.8,
  });
});

test('상품 sitemap은 검증된 중앙 링크 상품을 100개 이상 요청할 수 있다', async () => {
  assert.deepEqual(parseProductSitemapPagination(undefined, undefined), {
    limit: 45000,
    offset: 0,
  });
  assert.deepEqual(parseProductSitemapPagination('50000', '-1'), {
    limit: 45000,
    offset: 0,
  });

  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{
        product_id: '123',
        product_image: 'https://example.com/product.jpg',
        updated_at: new Date('2026-09-07T00:00:00Z'),
        total_count: 397,
      }] };
    },
  };
  const result = await loadProductSitemapRows(db, PARTNER_ID, {
    limit: '45000', offset: '0',
  });
  assert.deepEqual(result, {
    products: [{
      productId: '123',
      productImage: 'https://example.com/product.jpg',
      updatedAt: '2026-09-07T00:00:00.000Z',
    }],
    totalCount: 397,
  });
  assert.match(calls[0].sql, /al\.is_active = TRUE/);
  assert.match(calls[0].sql, /al\.validation_status = 'verified'/);
  assert.match(calls[0].sql, /al\.partner_tracking_code = \$1/);
  assert.deepEqual(calls[0].params, [PARTNER_ID, 45000, 0]);
});

test('실제 관측 적용은 product/review 가격과 이력 insert를 한 transaction으로 묶는다', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/SELECT product_id FROM products/.test(sql)) return { rowCount: 1, rows: [{ product_id: '123' }] };
      if (/INSERT INTO price_observations/.test(sql)) return { rowCount: 1, rows: [{ product_id: '123' }] };
      return { rowCount: 1, rows: [] };
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); },
  };
  const db = { async connect() { return client; } };
  await applyObservedProductPrice(db, {
    productId: '123', priceKrw: 12900, source: 'daily_search_match',
    observedAt: new Date('2026-08-28T03:00:00Z'),
  });
  assert.deepEqual(calls.filter((call) => ['BEGIN', 'COMMIT'].includes(call.sql)).map((call) => call.sql), ['BEGIN', 'COMMIT']);
  assert.ok(calls.some((call) => /UPDATE reviews/.test(call.sql)));
  assert.ok(calls.some((call) => /INSERT INTO price_observations/.test(call.sql)));
});

test('기존 자동 수집에서 같은 productId를 다시 받으면 실제 가격 갱신과 관측을 남긴다', async () => {
  const calls = [];
  const clientDb = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/SELECT id FROM products/.test(sql)) return { rows: [{ id: 1 }], rowCount: 1 };
      if (/INSERT INTO affiliate_links/.test(sql)) {
        return { rows: [{ link_id: LINK_ID }], rowCount: 1 };
      }
      if (/INSERT INTO price_observations/.test(sql)) return { rows: [{ product_id: '123' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
  };
  const saved = await saveProduct({
    productId: '123', productName: '실제 상품', productPrice: 13900,
    productImage: 'https://example.com/product.jpg', productUrl: PRODUCT_URL,
  }, 'keyword:실제상품', { partnerId: PARTNER_ID, subId: '' }, clientDb);
  assert.equal(saved, false);
  assert.ok(calls.some((call) => /UPDATE products SET/.test(call.sql)));
  assert.ok(calls.some((call) => /INSERT INTO price_observations/.test(call.sql)));
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('목록형 API 응답 한 번으로 응답에 포함된 기존 상품 가격을 묶음 갱신한다', async () => {
  const calls = [];
  const db = { async query(sql, params = []) {
    calls.push({ sql, params });
    if (/SELECT product_id FROM products WHERE product_id = ANY/.test(sql)) {
      return { rows: [{ product_id: '123' }], rowCount: 1 };
    }
    if (/INSERT INTO price_observations/.test(sql)) return { rows: [{ product_id: '123' }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  } };
  const refreshed = await refreshExistingProductPrices([
    { productId: '123', productPrice: 12900 },
    { productId: '456', productPrice: 9900 },
    { productId: '789', productPrice: 0 },
  ], 'category:1001', db);
  assert.equal(refreshed, 1);
  assert.equal(calls.filter((call) => /INSERT INTO price_observations/.test(call.sql)).length, 1);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('검색 보완 작업은 회당 최대 4이며 수요 우선과 전체 순환을 함께 사용한다', async () => {
  assert.equal(isPriceObservationEnabled({}), false);
  assert.equal(isPriceObservationEnabled({ PRICE_OBSERVATION_ENABLED: 'true' }), true);
  assert.equal(normalizePriceObservationLimit(1000), 4);
  assert.equal(normalizePriceObservationLimit('20junk'), 4);
  const calls = [];
  const lockClient = {
    async query(sql) {
      calls.push(sql);
      if (/pg_try_advisory_lock/.test(sql)) return { rows: [{ acquired: true }] };
      return { rows: [{ pg_advisory_unlock: true }] };
    },
    release() {},
  };
  const db = {
    async connect() { return lockClient; },
    async query(sql) {
      calls.push(sql);
      if (/FROM products p/.test(sql)) return { rows: [
        { product_id: '123', product_name: '일치 상품' },
        { product_id: '456', product_name: '미일치 상품' },
      ] };
      return { rows: [], rowCount: 1 };
    },
  };
  const observed = [];
  const result = await runDailyPriceObservationJob(db, {
    now: new Date('2026-08-28T03:00:00Z'),
    limit: 2,
    loadSettings: async () => ({ coupang: {
      enabled: true, accessKey: 'ak', secretKey: 'sk', partnerId: PARTNER_ID, subId: '',
    } }),
    makeClient: () => ({
      async searchProducts(keyword) {
        return keyword.startsWith('일치')
          ? { success: true, products: [{ productId: '123', productPrice: 12900 }] }
          : { success: true, products: [{ productId: '999', productPrice: 100 }] };
      },
    }),
    async applyObservation(_db, input) { observed.push(input); },
  });
  assert.equal(result.observed, 1);
  assert.equal(result.unmatched, 1);
  assert.equal(observed[0].source, 'daily_search_match');
  assert.equal(observed[0].productId, '123');
  assert.equal(calls.filter((sql) => /INSERT INTO job_runs/.test(sql)).length, 1);
  assert.equal(calls.filter((sql) => /UPDATE job_runs/.test(sql)).length, 1);
  assert.doesNotMatch(calls.find((sql) => /UPDATE job_runs/.test(sql)), /attempt_count/);
  const candidateSql = calls.find((sql) => /WITH eligible AS/.test(sql));
  assert.match(candidateSql, /last_user_searched_at/);
  assert.match(candidateSql, /recent_clicks/);
  assert.match(candidateSql, /latest_observed_at ASC NULLS FIRST/);
});
