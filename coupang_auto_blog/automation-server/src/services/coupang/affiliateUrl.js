/**
 * 쿠팡 제휴 URL 검증 규칙.
 *
 * Product API의 productUrl은 이미 제휴 URL이므로 재조립하지 않고
 * 원본 URL의 hostname과 lptag만 검증한다.
 */

const PARTNER_ID_PATTERN = /^AF[0-9]+$/;
const LONG_AFFILIATE_HOST = 'link.coupang.com';
const SHORT_AFFILIATE_HOST = 'coupa.ng';
const PLAIN_COUPANG_HOSTS = new Set(['coupang.com', 'www.coupang.com']);

export const AffiliateUrlReason = Object.freeze({
  EMPTY_URL: 'empty_url',
  INVALID_URL: 'invalid_url',
  HTTPS_REQUIRED: 'https_required',
  CUSTOM_PORT_NOT_ALLOWED: 'custom_port_not_allowed',
  CREDENTIALS_NOT_ALLOWED: 'credentials_not_allowed',
  INVALID_PARTNER_ID: 'invalid_partner_id',
  HOST_NOT_ALLOWED: 'host_not_allowed',
  MISSING_LPTAG: 'missing_lptag',
  PARTNER_ID_MISMATCH: 'partner_id_mismatch',
  SHORT_URL_REQUIRES_LANDING_URL: 'short_url_requires_landing_url',
  INVALID_SHORT_URL: 'invalid_short_url',
  NOT_PLAIN_COUPANG_URL: 'not_plain_coupang_url',
  ALREADY_AFFILIATE_URL: 'already_affiliate_url',
});

function result(valid, details = {}) {
  return { valid, ...details };
}

function parseHttpsUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return result(false, { reason: AffiliateUrlReason.EMPTY_URL });
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return result(false, { reason: AffiliateUrlReason.INVALID_URL });
  }

  if (parsed.protocol !== 'https:') {
    return result(false, { reason: AffiliateUrlReason.HTTPS_REQUIRED });
  }
  if (parsed.port && parsed.port !== '443') {
    return result(false, { reason: AffiliateUrlReason.CUSTOM_PORT_NOT_ALLOWED });
  }
  if (parsed.username || parsed.password) {
    return result(false, { reason: AffiliateUrlReason.CREDENTIALS_NOT_ALLOWED });
  }

  return result(true, { parsed, normalizedUrl: parsed.toString() });
}

export function isValidPartnerId(partnerId) {
  return typeof partnerId === 'string' && PARTNER_ID_PATTERN.test(partnerId);
}

/**
 * Product API 또는 Deep Link API landingUrl의 긴 제휴 URL을 검증한다.
 */
export function validateLongAffiliateUrl(url, partnerId) {
  if (!isValidPartnerId(partnerId)) {
    return result(false, { reason: AffiliateUrlReason.INVALID_PARTNER_ID });
  }

  const parsedResult = parseHttpsUrl(url);
  if (!parsedResult.valid) return parsedResult;

  const { parsed, normalizedUrl } = parsedResult;
  if (parsed.hostname !== LONG_AFFILIATE_HOST) {
    return result(false, {
      reason: AffiliateUrlReason.HOST_NOT_ALLOWED,
      hostname: parsed.hostname,
    });
  }

  const lptag = parsed.searchParams.get('lptag');
  if (!lptag) {
    return result(false, { reason: AffiliateUrlReason.MISSING_LPTAG });
  }
  if (lptag !== partnerId) {
    return result(false, { reason: AffiliateUrlReason.PARTNER_ID_MISMATCH });
  }

  return result(true, {
    kind: 'long_affiliate',
    normalizedUrl,
    partnerId,
    verified: true,
  });
}

/**
 * Product API 응답에서 검증을 통과한 상품만 반환한다.
 * 상품 객체와 productUrl 문자열은 수정하지 않는다.
 */
export function validateProductApiProducts(products, partnerId) {
  const validProducts = [];
  const invalidProducts = [];

  for (const product of Array.isArray(products) ? products : []) {
    const validation = validateLongAffiliateUrl(product?.productUrl, partnerId);
    if (validation.valid) {
      validProducts.push(product);
    } else {
      invalidProducts.push({
        productId: product?.productId,
        reason: validation.reason,
      });
    }
  }

  return { validProducts, invalidProducts };
}

/**
 * Deep Link API 응답의 shortenUrl과 landingUrl을 한 쌍으로 검증한다.
 * 단축 URL 문자열만으로는 Partner ID를 확인할 수 없다.
 */
export function validateShortAffiliateUrl(shortUrl, landingUrl, partnerId) {
  const shortResult = parseHttpsUrl(shortUrl);
  if (!shortResult.valid) return shortResult;

  const { parsed, normalizedUrl } = shortResult;
  if (parsed.hostname !== SHORT_AFFILIATE_HOST) {
    return result(false, {
      reason: AffiliateUrlReason.HOST_NOT_ALLOWED,
      hostname: parsed.hostname,
    });
  }
  if (!parsed.pathname || parsed.pathname === '/') {
    return result(false, { reason: AffiliateUrlReason.INVALID_SHORT_URL });
  }
  if (!landingUrl) {
    return result(false, {
      reason: AffiliateUrlReason.SHORT_URL_REQUIRES_LANDING_URL,
    });
  }

  const landingResult = validateLongAffiliateUrl(landingUrl, partnerId);
  if (!landingResult.valid) return landingResult;

  return result(true, {
    kind: 'short_affiliate',
    normalizedUrl,
    landingUrl: landingResult.normalizedUrl,
    partnerId,
    verified: true,
  });
}

/**
 * 저장된 제휴 URL을 검증한다.
 * allowExistingShortUrl은 DB에 이미 있는 동일한 coupa.ng URL을
 * 수정 없이 보존하는 경우에만 사용해야 한다.
 */
export function validateAffiliateUrl(
  url,
  partnerId,
  { landingUrl, allowExistingShortUrl = false } = {}
) {
  const parsedResult = parseHttpsUrl(url);
  if (!parsedResult.valid) return parsedResult;

  const { parsed, normalizedUrl } = parsedResult;
  if (parsed.hostname === LONG_AFFILIATE_HOST) {
    return validateLongAffiliateUrl(normalizedUrl, partnerId);
  }
  if (parsed.hostname === SHORT_AFFILIATE_HOST) {
    if (landingUrl) {
      return validateShortAffiliateUrl(normalizedUrl, landingUrl, partnerId);
    }
    if (allowExistingShortUrl) {
      if (!parsed.pathname || parsed.pathname === '/') {
        return result(false, { reason: AffiliateUrlReason.INVALID_SHORT_URL });
      }
      return result(true, {
        kind: 'legacy_short_affiliate',
        normalizedUrl,
        partnerId,
        verified: false,
        preservedExisting: true,
      });
    }
    return result(false, {
      reason: AffiliateUrlReason.SHORT_URL_REQUIRES_LANDING_URL,
    });
  }

  return result(false, {
    reason: AffiliateUrlReason.HOST_NOT_ALLOWED,
    hostname: parsed.hostname,
  });
}

/**
 * Deep Link API에 넣을 수 있는 순수 쿠팡 URL인지 검증한다.
 */
export function validatePlainCoupangUrl(url) {
  const parsedResult = parseHttpsUrl(url);
  if (!parsedResult.valid) return parsedResult;

  const { parsed, normalizedUrl } = parsedResult;
  if (parsed.hostname === LONG_AFFILIATE_HOST || parsed.hostname === SHORT_AFFILIATE_HOST) {
    return result(false, { reason: AffiliateUrlReason.ALREADY_AFFILIATE_URL });
  }
  if (!PLAIN_COUPANG_HOSTS.has(parsed.hostname)) {
    return result(false, {
      reason: AffiliateUrlReason.NOT_PLAIN_COUPANG_URL,
      hostname: parsed.hostname,
    });
  }

  return result(true, {
    kind: 'plain_coupang',
    normalizedUrl,
  });
}

export function isShortAffiliateUrl(url) {
  const parsedResult = parseHttpsUrl(url);
  return parsedResult.valid && parsedResult.parsed.hostname === SHORT_AFFILIATE_HOST;
}

export function isPlainCoupangUrl(url) {
  return validatePlainCoupangUrl(url).valid;
}

/**
 * subId는 Partner ID와 다르다. 빈값이면 빈값을 그대로 유지한다.
 */
export function normalizeSubId(subId) {
  return typeof subId === 'string' ? subId : '';
}

export function affiliateUrlReasonMessage(reason) {
  const messages = {
    [AffiliateUrlReason.EMPTY_URL]: '제휴 URL을 입력해주세요.',
    [AffiliateUrlReason.INVALID_URL]: '올바른 URL 형식이 아닙니다.',
    [AffiliateUrlReason.HTTPS_REQUIRED]: 'HTTPS 쿠팡 URL만 사용할 수 있습니다.',
    [AffiliateUrlReason.INVALID_PARTNER_ID]: '설정의 Partner ID 형식이 올바르지 않습니다.',
    [AffiliateUrlReason.MISSING_LPTAG]: '제휴 URL에 lptag가 없습니다.',
    [AffiliateUrlReason.PARTNER_ID_MISMATCH]: '제휴 URL의 lptag가 설정된 Partner ID와 다릅니다.',
    [AffiliateUrlReason.SHORT_URL_REQUIRES_LANDING_URL]: '신규 단축 URL은 Deep Link API의 landingUrl 검증이 필요합니다.',
    [AffiliateUrlReason.ALREADY_AFFILIATE_URL]: '이미 제휴 정보가 포함된 URL은 다시 딥링크로 변환할 수 없습니다.',
    [AffiliateUrlReason.NOT_PLAIN_COUPANG_URL]: '일반 coupang.com URL만 딥링크로 변환할 수 있습니다.',
    [AffiliateUrlReason.HOST_NOT_ALLOWED]: '허용되지 않은 쿠팡 URL 도메인입니다.',
  };
  return messages[reason] || '제휴 URL 검증에 실패했습니다.';
}
