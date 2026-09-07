import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AffiliateUrlReason,
  isValidPartnerId,
  normalizeSubId,
  validateAffiliateUrl,
  validateLongAffiliateUrl,
  validatePlainCoupangUrl,
  validateProductApiProducts,
  validateShortAffiliateUrl,
} from '../src/services/coupang/affiliateUrl.js';
import { createDeeplinks } from '../src/services/coupang/deeplink.js';
import { createCoupangClient } from '../src/services/coupang/index.js';

const PARTNER_ID = 'AF7225079';
const LONG_URL = `https://link.coupang.com/re/AFFSDP?lptag=${PARTNER_ID}&pageKey=123`;

test('Partner ID는 AF + 숫자 형식만 허용한다', () => {
  assert.equal(isValidPartnerId(PARTNER_ID), true);
  assert.equal(isValidPartnerId('7225079'), false);
  assert.equal(isValidPartnerId('AF12x'), false);
  assert.equal(isValidPartnerId(' AF7225079'), false);
});

test('긴 제휴 URL은 HTTPS, hostname, lptag가 모두 일치해야 한다', () => {
  assert.equal(validateLongAffiliateUrl(LONG_URL, PARTNER_ID).valid, true);
  assert.equal(
    validateLongAffiliateUrl(LONG_URL.replace(PARTNER_ID, 'AF9999999'), PARTNER_ID).reason,
    AffiliateUrlReason.PARTNER_ID_MISMATCH
  );
  assert.equal(
    validateLongAffiliateUrl('https://link.coupang.com/re/AFFSDP?pageKey=123', PARTNER_ID).reason,
    AffiliateUrlReason.MISSING_LPTAG
  );
  assert.equal(
    validateLongAffiliateUrl(LONG_URL.replace('https:', 'http:'), PARTNER_ID).reason,
    AffiliateUrlReason.HTTPS_REQUIRED
  );
  assert.equal(
    validateLongAffiliateUrl(`https://link.coupang.com.evil.example/re/AFFSDP?lptag=${PARTNER_ID}`, PARTNER_ID).reason,
    AffiliateUrlReason.HOST_NOT_ALLOWED
  );
});

test('일반 쿠팡 URL만 Deep Link API 입력으로 허용한다', () => {
  assert.equal(validatePlainCoupangUrl('https://www.coupang.com/vp/products/123').valid, true);
  assert.equal(validatePlainCoupangUrl('https://coupang.com/vp/products/123').valid, true);
  assert.equal(
    validatePlainCoupangUrl(LONG_URL).reason,
    AffiliateUrlReason.ALREADY_AFFILIATE_URL
  );
  assert.equal(
    validatePlainCoupangUrl('https://example.com/vp/products/123').reason,
    AffiliateUrlReason.NOT_PLAIN_COUPANG_URL
  );
});

test('신규 coupa.ng URL은 같은 응답의 landingUrl로 Partner ID를 검증한다', () => {
  const shortUrl = 'https://coupa.ng/test123';
  assert.equal(validateShortAffiliateUrl(shortUrl, LONG_URL, PARTNER_ID).valid, true);
  assert.equal(
    validateAffiliateUrl(shortUrl, PARTNER_ID).reason,
    AffiliateUrlReason.SHORT_URL_REQUIRES_LANDING_URL
  );
  assert.equal(
    validateShortAffiliateUrl(shortUrl, LONG_URL.replace(PARTNER_ID, 'AF9999999'), PARTNER_ID).reason,
    AffiliateUrlReason.PARTNER_ID_MISMATCH
  );
});

test('기존 DB의 동일한 단축 URL은 변경 없이 보존할 수 있다', () => {
  const preserved = validateAffiliateUrl('https://coupa.ng/legacy', PARTNER_ID, {
    allowExistingShortUrl: true,
  });
  assert.equal(preserved.valid, true);
  assert.equal(preserved.verified, false);
  assert.equal(preserved.preservedExisting, true);
});

test('빈 subId는 Partner ID로 폴백하지 않는다', () => {
  assert.equal(normalizeSubId(''), '');
  assert.equal(normalizeSubId(undefined), '');
  assert.equal(normalizeSubId('registered-channel'), 'registered-channel');
  assert.notEqual(normalizeSubId(''), PARTNER_ID);

  const client = createCoupangClient('access', 'secret', PARTNER_ID, '');
  assert.equal(client.subId, '');
  assert.notEqual(client.subId, client.partnerId);
});

test('이미 제휴된 Product API URL은 Deep Link API에 재입력하지 않는다', async () => {
  const originalProduct = { productId: 123, productUrl: LONG_URL };
  const wrongPartnerProduct = {
    productId: 456,
    productUrl: LONG_URL.replace(PARTNER_ID, 'AF9999999'),
  };
  const { validProducts, invalidProducts } = validateProductApiProducts(
    [originalProduct, wrongPartnerProduct],
    PARTNER_ID
  );

  assert.equal(validProducts.length, 1);
  assert.equal(validProducts[0], originalProduct);
  assert.equal(validProducts[0].productUrl, LONG_URL);
  assert.equal(invalidProducts[0].reason, AffiliateUrlReason.PARTNER_ID_MISMATCH);

  const result = await createDeeplinks(
    { urls: [LONG_URL], subId: '' },
    { accessKey: 'not-used', secretKey: 'not-used' }
  );

  assert.equal(result.success, false);
  assert.equal(result.reason, AffiliateUrlReason.ALREADY_AFFILIATE_URL);
});
