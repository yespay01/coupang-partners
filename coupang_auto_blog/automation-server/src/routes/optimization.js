import express from 'express';

import { authenticateToken, requireAdmin } from '../config/auth.js';
import { getDb } from '../config/database.js';
import {
  DAILY_METRIC_JOB_NAME,
  buildBusinessDateRange,
  getKstBusinessDate,
  recalculateDailyMetricRange,
} from '../services/dailyMetrics.js';
import { IMPROVEMENT_CANDIDATE_JOB_NAME } from '../services/improvementCandidates.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const MAX_RECALCULATION_DAYS = 7;

router.use(authenticateToken, requireAdmin);

function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseOptimizationDateRange(value = '30d', now = new Date()) {
  const normalized = value === '24h' ? '1d' : value === 'all' ? '31d' : String(value);
  const match = normalized.match(/^([1-9]|[12]\d|3[01])d$/);
  if (!match) {
    const error = new Error('dateRange는 1d부터 31d까지 사용할 수 있습니다.');
    error.status = 400;
    throw error;
  }

  const days = Number(match[1]);
  const endDate = getKstBusinessDate(now);
  const start = new Date(`${endDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { days, startDate: start.toISOString().slice(0, 10), endDate };
}

export function mapRollup(row) {
  const eligibleSessions = numberValue(row.eligible_impression_sessions);
  const dataStatus = row.data_status === 'partial' ? 'incomplete' : row.data_status;
  const dto = {
    businessDate: dateOnly(row.business_date_kst),
    eligibleImpressionSessions: eligibleSessions,
    qualifiedOutboundSessions: numberValue(row.qualified_outbound_sessions),
    rawOutboundSessions: numberValue(row.raw_outbound_sessions),
    orphanOutboundSessions: numberValue(row.orphan_outbound_sessions),
    qualifiedOutboundCtrPct: dataStatus === 'no_data' || eligibleSessions === 0
      ? null
      : numberValue(row.qualified_outbound_ctr_pct),
    impressionEventCount: numberValue(row.impression_events),
    outboundEventCount: numberValue(row.outbound_events),
    totalEventCount: numberValue(row.total_events),
    botEventCount: numberValue(row.bot_events),
    duplicateEventCount: numberValue(row.duplicate_events),
    sourceMaxReceivedAt: row.source_max_received_at || null,
    dataStatus: ['complete', 'incomplete', 'no_data'].includes(dataStatus) ? dataStatus : 'incomplete',
    calculationVersion: row.calculation_version == null ? null : String(row.calculation_version),
    calculatedAt: row.calculated_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
  return {
    ...dto,
    // web/types/analyticsOptimization.ts의 기존 normalizer 호환 alias.
    impressionEvents: dto.impressionEventCount,
    outboundEvents: dto.outboundEventCount,
    totalEvents: dto.totalEventCount,
    botEvents: dto.botEventCount,
    duplicateEvents: dto.duplicateEventCount,
  };
}

export function mapAnomaly(row) {
  const details = row.details || {};
  const evidenceParts = [
    row.observed_value == null ? null : `관측 ${numberValue(row.observed_value)}`,
    row.baseline_value == null ? null : `기준 ${numberValue(row.baseline_value)}`,
    row.threshold_value == null ? null : `임계 ${numberValue(row.threshold_value)}`,
  ].filter(Boolean);
  return {
    id: row.anomaly_id,
    title: `${row.metric_name} · ${row.anomaly_type}`,
    metric: row.metric_name || null,
    severity: row.severity,
    status: row.status,
    reason: typeof details.message === 'string' ? details.message : row.anomaly_type,
    evidence: evidenceParts.length > 0 ? evidenceParts.join(' · ') : null,
    detectedAt: row.detected_at || null,
  };
}

export function mapJob(row) {
  return {
    jobName: row.job_name,
    businessDate: dateOnly(row.business_date_kst),
    status: ['running', 'success', 'failed', 'stale'].includes(row.status) ? row.status : 'unknown',
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    attempts: numberValue(row.attempt_count),
    error: row.error_message || null,
  };
}

export function mapCandidate(row) {
  const sample = row.sample || {};
  const primaryMetric = row.primary_metric || {};
  const recommendation = row.recommendation || {};
  return {
    id: row.candidate_id,
    title: row.title,
    status: row.status,
    rationale: row.hypothesis,
    evidence: row.evidence && Object.keys(row.evidence).length > 0
      ? Object.entries(row.evidence).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
      : null,
    expectedImpact: typeof recommendation.expectedImpact === 'string'
      ? recommendation.expectedImpact
      : null,
    uncertainty: typeof primaryMetric.uncertainty === 'string' ? primaryMetric.uncertainty : null,
    risk: Array.isArray(row.risks) && row.risks.length > 0 ? row.risks.join(' · ') : null,
    sample: {
      eligibleSessions: numberValue(
        sample.totalEligibleSessions ?? sample.currentEligibleSessions ?? sample.eligibleSessions
      ),
      conversions: numberValue(sample.totalQualifiedOutboundSessions ?? sample.conversions),
      requiredSessions: sample.minimumEligibleSessionsPerVariant == null
        ? (sample.requiredSessions == null ? null : numberValue(sample.requiredSessions))
        : numberValue(sample.minimumEligibleSessionsPerVariant),
    },
    guardrails: (Array.isArray(row.guardrails) ? row.guardrails : []).map((guardrail) => ({
      name: guardrail.metric || guardrail.name || '가드레일',
      status: ['pass', 'watch', 'fail', 'required', 'not_available'].includes(guardrail.status)
        ? guardrail.status
        : 'unknown',
      detail: guardrail.condition || guardrail.detail || null,
    })),
    createdAt: row.created_at || null,
  };
}

async function loadCandidatesIfAvailable(db, startDate, endDate) {
  try {
    const result = await db.query(
      `SELECT *
         FROM improvement_candidates
        WHERE business_date_kst BETWEEN $1::date AND $2::date
        ORDER BY priority_score DESC, business_date_kst DESC`,
      [startDate, endDate]
    );
    return result.rows.map(mapCandidate);
  } catch (error) {
    // improvement_candidates has its own independently deployable migration.
    if (error?.code === '42P01') return [];
    throw error;
  }
}

export async function getOptimizationSnapshot(db, { dateRange = '30d', now = new Date() } = {}) {
  const { days, startDate, endDate } = parseOptimizationDateRange(dateRange, now);
  const [rollupResult, anomalyResult, jobResult, candidates] = await Promise.all([
    db.query(
      `SELECT * FROM daily_metric_rollups
        WHERE business_date_kst BETWEEN $1::date AND $2::date
        ORDER BY business_date_kst ASC`,
      [startDate, endDate]
    ),
    db.query(
      `SELECT * FROM metric_anomalies
        WHERE business_date_kst BETWEEN $1::date AND $2::date
        ORDER BY business_date_kst DESC, detected_at DESC`,
      [startDate, endDate]
    ),
    db.query(
      `SELECT * FROM job_runs
        WHERE job_name IN ($1, $2)
          AND business_date_kst BETWEEN $3::date AND $4::date
        ORDER BY business_date_kst DESC`,
      [DAILY_METRIC_JOB_NAME, IMPROVEMENT_CANDIDATE_JOB_NAME, startDate, endDate]
    ),
    loadCandidatesIfAvailable(db, startDate, endDate),
  ]);

  const rollups = rollupResult.rows.map(mapRollup);
  const dataStatus = rollups.length === 0
    ? 'no_data'
    : rollups.length < days || rollups.some((row) => row.dataStatus !== 'complete')
      ? 'incomplete'
      : 'complete';

  return {
    generatedAt: now.toISOString(),
    dataStatus,
    rollups,
    anomalies: anomalyResult.rows.map(mapAnomaly),
    candidates,
    jobs: jobResult.rows.map(mapJob),
  };
}

/** GET /api/admin/analytics/optimization?dateRange=30d */
router.get('/analytics/optimization', async (req, res) => {
  try {
    const data = await getOptimizationSnapshot(getDb(), {
      dateRange: req.query.dateRange || '30d',
    });
    return res.json({ success: true, data });
  } catch (error) {
    logger.warn('최적화 분석 조회 실패', { message: error.message });
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
});

/** POST /api/admin/analytics/rollups/recalculate */
router.post('/analytics/rollups/recalculate', async (req, res) => {
  try {
    const { startDate, endDate } = req.body || {};
    buildBusinessDateRange(startDate, endDate, MAX_RECALCULATION_DAYS);
    if (endDate > getKstBusinessDate()) {
      const error = new Error('미래 날짜는 재계산할 수 없습니다.');
      error.status = 400;
      throw error;
    }

    const results = await recalculateDailyMetricRange(getDb(), startDate, endDate, {
      maxDays: MAX_RECALCULATION_DAYS,
    });
    return res.json({ success: true, results });
  } catch (error) {
    const status = error.status || (/날짜|최대|시작일/.test(error.message) ? 400 : 500);
    logger.warn('일별 분석 재계산 실패', { status, message: error.message });
    return res.status(status).json({ success: false, message: error.message });
  }
});

export default router;
