import crypto from 'crypto';

import {
  affiliateUrlReasonMessage,
  isShortAffiliateUrl,
  normalizeSubId,
  validateLongAffiliateUrl,
  validateShortAffiliateUrl,
} from './affiliateUrl.js';

export const AFFILIATE_LINK_SOURCES = new Set([
  'product_api',
  'deeplink_api',
  'manual',
  'legacy',
  'banner',
]);

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidLinkId(linkId) {
  return typeof linkId === 'string' && UUID_PATTERN.test(linkId);
}

export function buildPublicGoUrl(linkId) {
  if (!isValidLinkId(linkId)) return null;
  return `/go/${linkId}`;
}

export function fingerprintDestination(destinationUrl) {
  return crypto.createHash('sha256').update(destinationUrl, 'utf8').digest('hex');
}

export function validateAffiliateLinkRegistration({
  destinationUrl,
  landingUrl,
  partnerId,
  linkSource,
}) {
  if (!AFFILIATE_LINK_SOURCES.has(linkSource)) {
    return { valid: false, reason: 'invalid_link_source' };
  }

  const validation = isShortAffiliateUrl(destinationUrl)
    ? validateShortAffiliateUrl(destinationUrl, landingUrl, partnerId)
    : validateLongAffiliateUrl(destinationUrl, partnerId);

  if (!validation.valid) return validation;

  return {
    valid: true,
    destinationUrl: validation.normalizedUrl,
    landingUrl: validation.landingUrl || null,
    partnerId,
    linkSource,
  };
}

export async function registerAffiliateLink(db, input) {
  const validation = validateAffiliateLinkRegistration(input);
  if (!validation.valid) {
    const error = new Error(
      validation.reason === 'invalid_link_source'
        ? '제휴 링크 출처가 올바르지 않습니다.'
        : affiliateUrlReasonMessage(validation.reason)
    );
    error.code = validation.reason;
    error.status = 422;
    throw error;
  }

  const linkId = crypto.randomUUID();
  const fingerprint = fingerprintDestination(validation.destinationUrl);
  const result = await db.query(
    `INSERT INTO affiliate_links (
       link_id, destination_fingerprint, product_id, destination_url, landing_url,
       partner_tracking_code, sub_id, link_source, validation_status,
       validation_reason, validated_at, is_active
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'verified',NULL,NOW(),TRUE)
     ON CONFLICT (destination_fingerprint) DO UPDATE SET
       product_id = COALESCE(EXCLUDED.product_id, affiliate_links.product_id),
       landing_url = COALESCE(EXCLUDED.landing_url, affiliate_links.landing_url),
       partner_tracking_code = EXCLUDED.partner_tracking_code,
       sub_id = EXCLUDED.sub_id,
       validation_status = 'verified',
       validation_reason = NULL,
       validated_at = NOW(),
       is_active = TRUE,
       updated_at = NOW()
     RETURNING link_id, product_id, destination_url, landing_url,
               partner_tracking_code, sub_id, link_source, validation_status,
               validation_reason, validated_at, is_active`,
    [
      linkId,
      fingerprint,
      input.productId ? String(input.productId).slice(0, 255) : null,
      validation.destinationUrl,
      validation.landingUrl,
      validation.partnerId,
      normalizeSubId(input.subId).slice(0, 255),
      validation.linkSource,
    ]
  );

  return result.rows[0];
}

export async function getRegisteredAffiliateLink(db, linkId) {
  if (!isValidLinkId(linkId)) return null;

  const result = await db.query(
    `SELECT al.link_id, al.product_id, al.destination_url, al.landing_url,
            al.partner_tracking_code, al.sub_id, al.link_source,
            al.validation_status, al.validation_reason, al.validated_at,
            al.is_active, p.product_name
       FROM affiliate_links al
       LEFT JOIN products p ON p.product_id = al.product_id
      WHERE al.link_id = $1`,
    [linkId]
  );
  return result.rows[0] || null;
}

export function validateRegisteredAffiliateLink(link, currentPartnerId) {
  if (!link) return { valid: false, reason: 'link_not_found' };
  if (!link.is_active) return { valid: false, reason: 'link_inactive' };
  if (link.validation_status !== 'verified') {
    return { valid: false, reason: 'link_not_verified' };
  }
  if (!AFFILIATE_LINK_SOURCES.has(link.link_source)) {
    return { valid: false, reason: 'invalid_link_source' };
  }
  if (link.partner_tracking_code !== currentPartnerId) {
    return { valid: false, reason: 'partner_id_mismatch' };
  }

  const validation = isShortAffiliateUrl(link.destination_url)
    ? validateShortAffiliateUrl(link.destination_url, link.landing_url, currentPartnerId)
    : validateLongAffiliateUrl(link.destination_url, currentPartnerId);

  if (!validation.valid) return validation;
  return {
    valid: true,
    destinationUrl: validation.normalizedUrl,
    partnerId: currentPartnerId,
  };
}
