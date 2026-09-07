import crypto from 'crypto';

import { UUID_PATTERN } from './coupang/affiliateLinkRegistry.js';

export const PUBLIC_ANALYTICS_EVENT_NAMES = new Set([
  'page_view',
  'list_view',
  'product_card_impression',
  'cta_impression',
]);

const INTERNAL_EVENT_NAMES = new Set(['outbound_click']);
const SURFACES = new Set([
  'home', 'collection', 'category', 'detail', 'search', 'recipe',
  'compare', 'alerts', 'deals', 'unknown',
  'legacy_detail', 'other',
]);
const DEVICE_TYPES = new Set(['mobile', 'desktop', 'tablet', 'unknown']);
const SAFE_TOKEN_PATTERN = /^[a-zA-Z0-9:_-]+$/;
const UNSAFE_SECRET_VALUES = new Set([
  'your-jwt-secret',
  'your-secret-key-change-in-production',
  'change-me',
]);

function optionalToken(value, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength || !SAFE_TOKEN_PATTERN.test(value)) {
    return undefined;
  }
  return value;
}

function optionalText(value, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (
    typeof value !== 'string' ||
    value.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return undefined;
  }
  return value;
}

export function getAnalyticsHashSecret(env = process.env) {
  const candidates = [env.ANALYTICS_HASH_SECRET, env.JWT_SECRET];
  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      candidate.length >= 32 &&
      !UNSAFE_SECRET_VALUES.has(candidate)
    ) {
      return candidate;
    }
  }
  return null;
}

export function isValidAnalyticsSurface(surface) {
  return SURFACES.has(surface);
}

export function hashAnalyticsId(rawId, secret) {
  if (!secret || typeof rawId !== 'string') return null;
  return crypto.createHmac('sha256', secret).update(rawId, 'utf8').digest('hex');
}

export function isBotUserAgent(userAgent) {
  return /bot|crawler|spider|crawling|headless|preview/i.test(String(userAgent || ''));
}

export function getForwardedUserAgent(headers = {}) {
  const forwarded = headers['x-semolink-user-agent'];
  const fallback = headers['user-agent'];
  const candidate = typeof forwarded === 'string' ? forwarded : fallback;
  return typeof candidate === 'string'
    ? candidate.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 512)
    : '';
}

export function detectDeviceType(userAgent) {
  const value = String(userAgent || '');
  if (/ipad|tablet/i.test(value)) return 'tablet';
  if (/mobile|iphone|android/i.test(value)) return 'mobile';
  return value ? 'desktop' : 'unknown';
}

export function sanitizeAnalyticsEvent(event, secret, { allowInternal = false, now = new Date() } = {}) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { valid: false, reason: 'invalid_event' };
  }

  const allowedNames = allowInternal
    ? new Set([...PUBLIC_ANALYTICS_EVENT_NAMES, ...INTERNAL_EVENT_NAMES])
    : PUBLIC_ANALYTICS_EVENT_NAMES;
  if (!allowedNames.has(event.event_name)) {
    return { valid: false, reason: 'invalid_event_name' };
  }
  if (typeof event.event_id !== 'string' || !UUID_PATTERN.test(event.event_id)) {
    return { valid: false, reason: 'invalid_event_id' };
  }
  if (!secret) return { valid: false, reason: 'hash_secret_unavailable' };

  const occurredAt = new Date(event.occurred_at);
  if (!event.occurred_at || Number.isNaN(occurredAt.getTime())) {
    return { valid: false, reason: 'invalid_occurred_at' };
  }
  if (occurredAt.getTime() > now.getTime() + 5 * 60 * 1000) {
    return { valid: false, reason: 'occurred_at_in_future' };
  }
  if (occurredAt.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
    return { valid: false, reason: 'occurred_at_too_old' };
  }

  const anonymousId = optionalToken(event.anonymous_id, 128);
  const sessionId = optionalToken(event.session_id, 128);
  if (!anonymousId || anonymousId === undefined) {
    return { valid: false, reason: 'invalid_anonymous_id' };
  }
  if (!sessionId || sessionId === undefined) {
    return { valid: false, reason: 'invalid_session_id' };
  }

  const surface = event.surface === undefined ? 'unknown' : event.surface;
  if (!SURFACES.has(surface)) return { valid: false, reason: 'invalid_surface' };

  const deviceType = event.device_type === undefined ? 'unknown' : event.device_type;
  if (!DEVICE_TYPES.has(deviceType)) return { valid: false, reason: 'invalid_device_type' };

  const pageViewId = optionalToken(event.page_view_id, 36);
  if (pageViewId === undefined || (pageViewId && !UUID_PATTERN.test(pageViewId))) {
    return { valid: false, reason: 'invalid_page_view_id' };
  }
  const linkId = optionalToken(event.link_id, 36);
  if (linkId === undefined || (linkId && !UUID_PATTERN.test(linkId))) {
    return { valid: false, reason: 'invalid_link_id' };
  }

  const fields = {
    contentId: optionalText(event.content_id, 128),
    productId: optionalToken(event.product_id, 255),
    position: optionalToken(event.position, 30),
    experimentId: optionalToken(event.experiment_id, 64),
    variantId: optionalToken(event.variant_id, 64),
    source: optionalText(event.source, 100),
  };
  if (Object.values(fields).some((value) => value === undefined)) {
    return { valid: false, reason: 'invalid_field_value' };
  }

  const schemaVersion = event.schema_version === undefined ? 1 : event.schema_version;
  if (schemaVersion !== 1) return { valid: false, reason: 'invalid_schema_version' };

  return {
    valid: true,
    event: {
      eventId: event.event_id,
      eventName: event.event_name,
      occurredAt: occurredAt.toISOString(),
      anonymousIdHash: hashAnalyticsId(anonymousId, secret),
      sessionIdHash: hashAnalyticsId(sessionId, secret),
      pageViewId,
      surface,
      contentId: fields.contentId,
      productId: fields.productId,
      position: fields.position,
      experimentId: fields.experimentId,
      variantId: fields.variantId,
      source: fields.source,
      deviceType,
      linkId,
      schemaVersion,
    },
  };
}

export async function insertAnalyticsEvent(db, event, { isBot = false } = {}) {
  const result = await db.query(
    `INSERT INTO analytics_events (
       event_id, event_name, occurred_at, received_at, business_date_kst,
       anonymous_id_hash, session_id_hash, page_view_id, surface, content_id,
       product_id, position, experiment_id, variant_id, source, device_type,
       link_id, is_bot, is_duplicate, schema_version
     ) VALUES (
       $1,$2,$3,NOW(),($3::timestamptz AT TIME ZONE 'Asia/Seoul')::date,
       $4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,FALSE,$17
     ) ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [
      event.eventId,
      event.eventName,
      event.occurredAt,
      event.anonymousIdHash,
      event.sessionIdHash,
      event.pageViewId,
      event.surface,
      event.contentId,
      event.productId,
      event.position,
      event.experimentId,
      event.variantId,
      event.source,
      event.deviceType,
      event.linkId,
      isBot,
      event.schemaVersion,
    ]
  );
  if (result.rowCount === 1) return true;

  // event_id 충돌은 원본 한 행을 유지하면서 재전송 품질 신호만 표시한다.
  // 이 플래그는 CTR eligible 필터가 아니라 duplicate 품질 집계에만 사용한다.
  await db.query(
    `UPDATE analytics_events
        SET is_duplicate = TRUE
      WHERE event_id = $1`,
    [event.eventId]
  );
  return false;
}

export async function ingestAnalyticsBatch(db, rawEvents, { secret, userAgent, now } = {}) {
  if (!Array.isArray(rawEvents) || rawEvents.length === 0 || rawEvents.length > 50) {
    const error = new Error('이벤트 배치는 1개 이상 50개 이하여야 합니다.');
    error.status = 400;
    throw error;
  }
  if (!secret) {
    const error = new Error('익명 분석 해시 비밀값이 설정되지 않았습니다.');
    error.status = 503;
    throw error;
  }

  const validEvents = [];
  const rejected = [];
  rawEvents.forEach((rawEvent, index) => {
    const sanitized = sanitizeAnalyticsEvent(rawEvent, secret, { now });
    if (sanitized.valid) validEvents.push(sanitized.event);
    else rejected.push({ index, reason: sanitized.reason });
  });

  let accepted = 0;
  let duplicates = 0;
  const isBot = isBotUserAgent(userAgent);

  // pg Pool.query는 반복 호출이 같은 connection을 보장하지 않는다.
  // 각 insert는 ON CONFLICT로 idempotent하므로 잘못된 pool-level transaction을 사용하지 않는다.
  for (const event of validEvents) {
    const inserted = await insertAnalyticsEvent(db, event, { isBot });
    if (inserted) accepted += 1;
    else duplicates += 1;
  }

  return {
    accepted,
    duplicates,
    rejected: rejected.length,
    rejectionDetails: rejected,
  };
}
