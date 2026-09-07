import express from 'express';

import { getDb } from '../config/database.js';
import {
  detectDeviceType,
  getForwardedUserAgent,
  getAnalyticsHashSecret,
  ingestAnalyticsBatch,
} from '../services/analytics.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

export function preparePublicAnalyticsEvents(body, headers = {}) {
  const anonymousId = headers['x-semolink-anonymous-id'];
  const sessionId = headers['x-semolink-session-id'];
  const forwardedDevice = headers['x-semolink-device-type'];
  const deviceType = ['mobile', 'desktop', 'tablet', 'unknown'].includes(forwardedDevice)
    ? forwardedDevice
    : detectDeviceType(getForwardedUserAgent(headers));

  return Array.isArray(body?.events)
    ? body.events.map((event) => ({
        ...event,
        // Raw identifiers from the public body are intentionally ignored.
        anonymous_id: anonymousId,
        session_id: sessionId,
        device_type: deviceType,
      }))
    : body?.events;
}

/**
 * POST /api/analytics/events
 * Public, strictly validated impression/page event ingest.
 * outbound_click is accepted only from the internal /go path.
 */
router.post('/analytics/events', async (req, res) => {
  try {
    const rawEvents = preparePublicAnalyticsEvents(req.body, req.headers);

    const result = await ingestAnalyticsBatch(getDb(), rawEvents, {
      secret: getAnalyticsHashSecret(),
      userAgent: getForwardedUserAgent(req.headers),
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    logger.warn('분석 이벤트 수집 실패', {
      status: error.status || 500,
      message: error.message,
    });
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
      accepted: 0,
      duplicates: 0,
      rejected: 0,
      rejectionDetails: [],
    });
  }
});

export default router;
