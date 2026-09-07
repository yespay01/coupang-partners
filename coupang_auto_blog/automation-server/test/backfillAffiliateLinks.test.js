import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseBackfillArgs,
  runAffiliateLinkBackfill,
} from '../scripts/backfillAffiliateLinks.js';

const PARTNER_ID = 'AF7225079';
const LONG_URL = `https://link.coupang.com/re/AFFSDP?lptag=${PARTNER_ID}&pageKey=123`;

test('백필은 기본 dry-run이며 --apply를 명시해야만 쓰기 모드가 된다', () => {
  assert.deepEqual(parseBackfillArgs([]), { apply: false });
  assert.deepEqual(parseBackfillArgs(['--dry-run']), { apply: false });
  assert.deepEqual(parseBackfillArgs(['--apply']), { apply: true });
  assert.throws(() => parseBackfillArgs(['--unknown']), /지원하지 않는/);
  assert.throws(() => parseBackfillArgs(['--apply', '--dry-run']), /동시/);
});

test('dry-run은 SELECT와 URL 검증만 하고 INSERT/UPDATE/transaction을 실행하지 않는다', async () => {
  const calls = [];
  const db = {
    async query(sql) {
      calls.push(sql);
      if (/FROM products/.test(sql)) {
        return { rows: [{ product_id: '123', product_url: LONG_URL }] };
      }
      if (/FROM reviews/.test(sql)) {
        return { rows: [{ id: 1, product_id: null, affiliate_url: 'https://coupa.ng/legacy' }] };
      }
      throw new Error(`unexpected write: ${sql}`);
    },
  };

  const stats = await runAffiliateLinkBackfill({
    db,
    settings: { coupang: { partnerId: PARTNER_ID, subId: '' } },
  });
  assert.equal(stats.mode, 'dry-run');
  assert.equal(stats.productsEligible, 1);
  assert.equal(stats.skippedShortReviews, 1);
  assert.equal(calls.every((sql) => /^\s*SELECT/i.test(sql)), true);
});
