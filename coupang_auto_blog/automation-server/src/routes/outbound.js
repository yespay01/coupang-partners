import crypto from 'crypto';
import express from 'express';

import { getDb } from '../config/database.js';
import { getSystemSettings } from '../services/settingsService.js';
import {
  getRegisteredAffiliateLink,
  isValidLinkId,
  validateRegisteredAffiliateLink,
} from '../services/coupang/affiliateLinkRegistry.js';
import {
  detectDeviceType,
  getAnalyticsHashSecret,
  getForwardedUserAgent,
  hashAnalyticsId,
  insertAnalyticsEvent,
  isBotUserAgent,
  isValidAnalyticsSurface,
  sanitizeAnalyticsEvent,
} from '../services/analytics.js';
import { logger } from '../utils/logger.js';
import { UUID_PATTERN } from '../services/coupang/affiliateLinkRegistry.js';

const router = express.Router();
const SAFE_CONTEXT_PATTERN = /^[a-zA-Z0-9:_-]+$/;

function safeContext(value, maxLength, fallback = null) {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  if (value.length > maxLength || !SAFE_CONTEXT_PATTERN.test(value)) return fallback;
  return value;
}

function safeTextContext(value, maxLength) {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

export function buildOutboundContext(req, link) {
  const userAgent = getForwardedUserAgent(req.headers || {});
  const forwardedDevice = req.headers?.['x-semolink-device-type'];
  const pageViewIdCandidate = safeContext(req.query?.pv, 36);
  const surfaceCandidate = safeContext(req.query?.surface, 30, 'unknown');
  return {
    anonymousId: safeContext(req.headers?.['x-semolink-anonymous-id'], 128),
    sessionId: safeContext(req.headers?.['x-semolink-session-id'], 128),
    pageViewId: pageViewIdCandidate && UUID_PATTERN.test(pageViewIdCandidate)
      ? pageViewIdCandidate
      : null,
    surface: isValidAnalyticsSurface(surfaceCandidate) ? surfaceCandidate : 'other',
    contentId: safeTextContext(req.query?.content_id, 128),
    position: safeContext(req.query?.position, 30, 'unknown'),
    experimentId: safeContext(req.query?.experiment_id, 64),
    variantId: safeContext(req.query?.variant_id, 64),
    source: safeTextContext(req.query?.source, 100),
    deviceType: ['mobile', 'desktop', 'tablet', 'unknown'].includes(forwardedDevice)
      ? forwardedDevice
      : detectDeviceType(userAgent),
    userAgent,
    linkId: String(link.link_id),
    productId: link.product_id ? String(link.product_id) : null,
    productName: link.product_name || null,
  };
}

async function recordLegacyClick(db, context, secret) {
  await db.query(
    `INSERT INTO coupang_clicks (
       review_id, review_slug, product_name, position, page_url,
       referrer_domain, device_type, ip_address, link_id, surface,
       content_id, session_id_hash, page_view_id
     ) VALUES (NULL,NULL,$1,$2,NULL,NULL,$3,NULL,$4,$5,$6,$7,$8)`,
    [
      context.productName,
      context.position,
      context.deviceType,
      context.linkId,
      context.surface,
      context.contentId,
      secret && context.sessionId ? hashAnalyticsId(context.sessionId, secret) : null,
      context.pageViewId,
    ]
  );
}

async function recordUnifiedOutbound(db, context, secret) {
  if (!secret || !context.anonymousId || !context.sessionId) return false;

  const sanitized = sanitizeAnalyticsEvent(
    {
      event_id: crypto.randomUUID(),
      event_name: 'outbound_click',
      occurred_at: new Date().toISOString(),
      anonymous_id: context.anonymousId,
      session_id: context.sessionId,
      page_view_id: context.pageViewId,
      surface: context.surface,
      content_id: context.contentId,
      product_id: context.productId,
      position: context.position,
      experiment_id: context.experimentId,
      variant_id: context.variantId,
      source: context.source,
      device_type: context.deviceType,
      link_id: context.linkId,
      schema_version: 1,
    },
    secret,
    { allowInternal: true }
  );
  if (!sanitized.valid) return false;

  return insertAnalyticsEvent(db, sanitized.event, {
    isBot: isBotUserAgent(context.userAgent),
  });
}

export async function recordOutboundClick(db, context, secret) {
  const isBot = isBotUserAgent(context.userAgent);
  const writes = [recordUnifiedOutbound(db, context, secret)];
  if (!isBot) writes.unshift(recordLegacyClick(db, context, secret));
  const results = await Promise.allSettled(writes);

  const failures = results.filter((item) => item.status === 'rejected');
  if (failures.length > 0) {
    throw new Error(`outbound tracking partial failure: ${failures.length}`);
  }
  return true;
}

/**
 * GET /api/go/:linkId
 * Registry lookup/validation is fail-closed; tracking writes are fail-open.
 */
export async function handleOutboundRedirect(req, res, dependencies = {}) {
  const db = dependencies.db || getDb();
  const loadLink = dependencies.loadLink || getRegisteredAffiliateLink;
  const loadSettings = dependencies.loadSettings || getSystemSettings;
  const recordClick = dependencies.recordClick || recordOutboundClick;
  const loadSecret = dependencies.loadSecret || getAnalyticsHashSecret;
  const { linkId } = req.params;
  if (!isValidLinkId(linkId)) {
    return res.status(400).json({ success: false, message: '올바른 링크 ID가 아닙니다.' });
  }

  let link;
  try {
    link = await loadLink(db, linkId);
  } catch (error) {
    logger.error('제휴 링크 registry 조회 실패', { message: error.message });
    return res.status(503).json({ success: false, message: '링크를 확인할 수 없습니다.' });
  }

  if (!link) {
    return res.status(404).json({ success: false, message: '링크를 찾을 수 없습니다.' });
  }

  let settings;
  try {
    settings = await loadSettings();
  } catch (error) {
    logger.error('제휴 링크 설정 조회 실패', { message: error.message });
    return res.status(503).json({ success: false, message: '링크를 확인할 수 없습니다.' });
  }

  let validation;
  try {
    validation = validateRegisteredAffiliateLink(link, settings.coupang?.partnerId);
  } catch (error) {
    logger.error('제휴 링크 재검증 실패', { linkId, message: error.message });
    return res.status(503).json({ success: false, message: '링크를 확인할 수 없습니다.' });
  }
  if (!validation.valid) {
    logger.warn('제휴 링크 redirect 차단', {
      linkId,
      reason: validation.reason,
    });
    return res.status(410).json({ success: false, message: '현재 사용할 수 없는 링크입니다.' });
  }

  const context = buildOutboundContext(req, link);
  const secret = loadSecret();

  res.set({
    'Cache-Control': 'no-store, private',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.redirect(302, validation.destinationUrl);

  // 목적지가 검증된 후에는 추적 DB 쓰기 실패가 사용자 이동을 막지 않는다.
  const trackingPromise = Promise.resolve(recordClick(db, context, secret)).catch((error) => {
    logger.error('outbound click 이중 기록 실패', {
      linkId,
      message: error.message,
    });
  });
  return { redirected: true, trackingPromise };
}

router.get('/go/:linkId', (req, res, next) => {
  void handleOutboundRedirect(req, res).catch(next);
});

export default router;
