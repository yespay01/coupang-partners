import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PUBLIC_REVIEW_LIST_QUERY,
  mapPublicReviewListRow,
} from '../src/routes/review.js';
import { mapPublicSearchProduct } from '../src/routes/search.js';

const PARTNER_ID = 'AF7225079';
const LINK_ID = '9f7908a2-4ba5-4b33-a65b-68b24e35a6cb';
const DESTINATION = `https://link.coupang.com/re/AFFSDP?lptag=${PARTNER_ID}&pageKey=123`;

function reviewRow(overrides = {}) {
  return {
    id: 1,
    product_id: '123',
    product_name: '중앙 링크 상품',
    affiliate_url: DESTINATION,
    registry_link_id: LINK_ID,
    registry_destination_url: DESTINATION,
    registry_landing_url: null,
    registry_partner_tracking_code: PARTNER_ID,
    registry_sub_id: '',
    registry_link_source: 'product_api',
    registry_validation_status: 'verified',
    registry_validation_reason: null,
    registry_validated_at: new Date('2026-08-28T00:00:00Z'),
    registry_is_active: true,
    created_at: new Date('2026-08-28T00:00:00Z'),
    updated_at: new Date('2026-08-28T00:00:00Z'),
    published_at: new Date('2026-08-28T00:00:00Z'),
    ...overrides,
  };
}

test('공개 홈 리뷰 DTO는 검증된 중앙 linkId/goUrl만 노출하고 원본 URL을 숨긴다', () => {
  assert.match(PUBLIC_REVIEW_LIST_QUERY, /LEFT JOIN affiliate_links al ON al\.link_id = r\.affiliate_link_id/);
  assert.match(PUBLIC_REVIEW_LIST_QUERY, /al\.partner_tracking_code AS registry_partner_tracking_code/);
  assert.match(PUBLIC_REVIEW_LIST_QUERY, /al\.is_active AS registry_is_active/);
  const dto = mapPublicReviewListRow(reviewRow(), PARTNER_ID);
  assert.deepEqual(dto.affiliateLink, {
    linkId: LINK_ID,
    goUrl: `/go/${LINK_ID}`,
  });
  assert.equal('affiliateUrl' in dto, false);
  assert.equal('productUrl' in dto, false);
});

test('공개 실시간 상품 검색도 중앙 linkId만 주고 Product API 원본 URL을 숨긴다', () => {
  const dto = mapPublicSearchProduct({
    productId: '123',
    productName: '검색 상품',
    productUrl: DESTINATION,
    affiliateUrl: DESTINATION,
  }, { link_id: LINK_ID });

  assert.deepEqual(dto.affiliateLink, {
    linkId: LINK_ID,
    goUrl: `/go/${LINK_ID}`,
  });
  assert.equal('productUrl' in dto, false);
  assert.equal('affiliateUrl' in dto, false);
});

test('비활성·Partner mismatch·손상된 linkId는 홈 CTA에서 fail-closed로 숨긴다', () => {
  const inactive = mapPublicReviewListRow(reviewRow({ registry_is_active: false }), PARTNER_ID);
  const mismatch = mapPublicReviewListRow(reviewRow(), 'AF9999999');
  const invalidId = mapPublicReviewListRow(reviewRow({ registry_link_id: 'not-a-uuid' }), PARTNER_ID);

  assert.equal(inactive.affiliateLink, undefined);
  assert.equal(mismatch.affiliateLink, undefined);
  assert.equal(invalidId.affiliateLink, undefined);
});

test('백필되지 않은 레거시 affiliateUrl은 공개 홈에서 직접 링크 fallback으로 노출하지 않는다', () => {
  const dto = mapPublicReviewListRow(reviewRow({
    registry_link_id: null,
    registry_destination_url: null,
  }), PARTNER_ID);
  assert.equal(dto.affiliateLink, undefined);
  assert.equal('affiliateUrl' in dto, false);
});
