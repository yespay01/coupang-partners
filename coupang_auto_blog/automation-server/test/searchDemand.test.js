import test from 'node:test';
import assert from 'node:assert/strict';

import { persistPopularSearchProduct } from '../src/routes/search.js';
import {
  getPopularSearchDemandKeywords,
  normalizeProductSearchKeyword,
  recordProductSearchDemand,
} from '../src/services/searchDemand.js';

const LINK_ID = '9f7908a2-4ba5-4b33-a65b-68b24e35a6cb';

test('상품 검색 수요는 2~50자 정상 키워드만 일관되게 정규화한다', () => {
  assert.equal(normalizeProductSearchKeyword('  무선   이어폰  '), '무선 이어폰');
  assert.equal(normalizeProductSearchKeyword('A'), null);
  assert.equal(normalizeProductSearchKeyword('test@example.com'), null);
  assert.equal(normalizeProductSearchKeyword('01012345678'), null);
  assert.equal(normalizeProductSearchKeyword('https://example.com'), null);
});

test('검색 수요는 KST 일별 upsert 후 14일 누적수를 반환한다', async () => {
  const calls = [];
  const db = { async query(sql, params) {
    calls.push({ sql, params });
    return { rows: [{ rolling_count: 3 }] };
  } };
  const result = await recordProductSearchDemand(
    db, '에어프라이어', new Date('2026-08-28T09:00:00Z')
  );
  assert.equal(result.recorded, true);
  assert.equal(result.rollingCount, 3);
  assert.match(calls[0].sql, /ON CONFLICT \(business_date_kst, normalized_keyword\) DO UPDATE/);
  assert.match(calls[0].sql, /AT TIME ZONE 'Asia\/Seoul'/);
});

test('자동 수집은 14일간 2회 이상 검색된 인기 키워드만 사용한다', async () => {
  const calls = [];
  const db = { async query(sql, params) {
    calls.push({ sql, params });
    return { rows: [{ normalized_keyword: '화장지' }, { normalized_keyword: '고양이 모래' }] };
  } };
  const keywords = await getPopularSearchDemandKeywords(db, { limit: 2, minimumSearches: 2 });
  assert.deepEqual(keywords, ['화장지', '고양이 모래']);
  assert.match(calls[0].sql, /HAVING SUM\(search_count\) >= \$3/);
  assert.deepEqual(calls[0].params.slice(1), [14, 2, 2]);
});

test('첫 검색 상품도 카탈로그·수요 우선순위·실제 가격 관측을 한 transaction으로 저장한다', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/INSERT INTO price_observations/.test(sql)) return { rows: [{ product_id: '123' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); },
  };
  const db = { async connect() { return client; } };
  await persistPopularSearchProduct(db, {
    productId: '123', productName: '반복 검색 상품', productPrice: 19900,
    productImage: 'https://example.com/a.jpg',
    productUrl: 'https://link.coupang.com/re/AFFSDP?lptag=AF7225079&pageKey=123',
    categoryId: '1001', categoryName: '생활용품',
  }, { link_id: LINK_ID }, '무선 이어폰');
  assert.deepEqual(calls.filter((call) => ['BEGIN', 'COMMIT'].includes(call.sql)).map((call) => call.sql), ['BEGIN', 'COMMIT']);
  assert.ok(calls.some((call) => /INSERT INTO products/.test(call.sql)));
  assert.ok(calls.some((call) => /search_demand_count/.test(call.sql)));
  assert.ok(calls.some((call) => /last_user_searched_at/.test(call.sql)));
  assert.ok(calls.some((call) => /INSERT INTO price_observations/.test(call.sql)));
});
