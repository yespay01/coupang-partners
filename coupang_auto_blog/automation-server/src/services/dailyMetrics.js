import crypto from 'crypto';

export const DAILY_METRIC_JOB_NAME = 'daily_metric_rollup';
export const DAILY_METRIC_CALCULATION_VERSION = 1;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getKstBusinessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isValidBusinessDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function buildBusinessDateRange(startDate, endDate, maxDays = 31) {
  if (!isValidBusinessDate(startDate) || !isValidBusinessDate(endDate)) {
    throw new Error('날짜는 YYYY-MM-DD 형식이어야 합니다.');
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (start > end) throw new Error('시작일은 종료일보다 늦을 수 없습니다.');

  const days = Math.floor((end - start) / 86400000) + 1;
  if (days > maxDays) throw new Error(`한 번에 최대 ${maxDays}일까지 재계산할 수 있습니다.`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function calculateQualifiedCtr(qualifiedOutboundSessions, eligibleImpressionSessions) {
  const eligible = Math.max(0, Number(eligibleImpressionSessions) || 0);
  const qualified = Math.min(
    eligible,
    Math.max(0, Number(qualifiedOutboundSessions) || 0)
  );
  if (eligible === 0) return 0;
  return Number(((qualified / eligible) * 100).toFixed(4));
}

export function normalizeDailyMetrics(row, businessDate, now = new Date()) {
  const eligible = Math.max(0, Number(row.eligible_impression_sessions) || 0);
  const qualified = Math.min(eligible, Math.max(0, Number(row.qualified_outbound_sessions) || 0));
  const rawOutbound = Math.max(0, Number(row.raw_outbound_sessions) || 0);
  const totalEvents = Math.max(0, Number(row.total_events) || 0);
  const currentKstDate = getKstBusinessDate(now);
  const dataStatus = totalEvents === 0
    ? 'no_data'
    : businessDate >= currentKstDate ? 'partial' : 'complete';

  return {
    businessDateKst: businessDate,
    eligibleImpressionSessions: eligible,
    qualifiedOutboundSessions: qualified,
    rawOutboundSessions: rawOutbound,
    orphanOutboundSessions: Math.max(0, rawOutbound - qualified),
    qualifiedOutboundCtrPct: calculateQualifiedCtr(qualified, eligible),
    impressionEvents: Math.max(0, Number(row.impression_events) || 0),
    outboundEvents: Math.max(0, Number(row.outbound_events) || 0),
    totalEvents,
    botEvents: Math.max(0, Number(row.bot_events) || 0),
    duplicateEvents: Math.max(0, Number(row.duplicate_events) || 0),
    sourceMaxReceivedAt: row.source_max_received_at || null,
    dataStatus,
  };
}

export function detectMetricAnomalies(metrics) {
  const anomalies = [];
  if (metrics.dataStatus === 'no_data') {
    anomalies.push({
      metricName: 'total_events',
      anomalyType: 'no_data',
      severity: 'warning',
      observedValue: 0,
      thresholdValue: 1,
      details: { message: '이벤트가 없어 성과 0으로 해석하지 않습니다.' },
    });
  }

  if (
    metrics.rawOutboundSessions >= 5 &&
    metrics.orphanOutboundSessions / metrics.rawOutboundSessions >= 0.2
  ) {
    anomalies.push({
      metricName: 'orphan_outbound_sessions',
      anomalyType: 'high_orphan_ratio',
      severity: 'warning',
      observedValue: metrics.orphanOutboundSessions,
      baselineValue: metrics.rawOutboundSessions,
      thresholdValue: 0.2,
      details: { ratio: metrics.orphanOutboundSessions / metrics.rawOutboundSessions },
    });
  }

  if (metrics.totalEvents >= 10 && metrics.botEvents / metrics.totalEvents >= 0.5) {
    anomalies.push({
      metricName: 'bot_events',
      anomalyType: 'high_bot_ratio',
      severity: 'warning',
      observedValue: metrics.botEvents,
      baselineValue: metrics.totalEvents,
      thresholdValue: 0.5,
      details: { ratio: metrics.botEvents / metrics.totalEvents },
    });
  }

  if (metrics.totalEvents >= 10 && metrics.duplicateEvents / metrics.totalEvents >= 0.3) {
    anomalies.push({
      metricName: 'duplicate_events',
      anomalyType: 'high_duplicate_ratio',
      severity: 'warning',
      observedValue: metrics.duplicateEvents,
      baselineValue: metrics.totalEvents,
      thresholdValue: 0.3,
      details: { ratio: metrics.duplicateEvents / metrics.totalEvents },
    });
  }

  return anomalies;
}

export const DAILY_METRICS_QUERY = `
  WITH eligible_events AS (
    SELECT event_name, session_id_hash
      FROM analytics_events
     WHERE business_date_kst = $1::date
       AND is_bot = FALSE
  ),
  impression_sessions AS (
    SELECT DISTINCT session_id_hash
      FROM eligible_events
     WHERE event_name IN ('product_card_impression', 'cta_impression')
       AND session_id_hash IS NOT NULL
  ),
  outbound_sessions AS (
    SELECT DISTINCT session_id_hash
      FROM eligible_events
     WHERE event_name = 'outbound_click'
       AND session_id_hash IS NOT NULL
  ),
  qualified_outbound AS (
    SELECT o.session_id_hash
      FROM outbound_sessions o
      INNER JOIN impression_sessions i USING (session_id_hash)
  )
  SELECT
    (SELECT COUNT(*) FROM impression_sessions) AS eligible_impression_sessions,
    (SELECT COUNT(*) FROM qualified_outbound) AS qualified_outbound_sessions,
    (SELECT COUNT(*) FROM outbound_sessions) AS raw_outbound_sessions,
    COUNT(*) FILTER (
      WHERE event_name IN ('product_card_impression', 'cta_impression')
        AND is_bot = FALSE
    ) AS impression_events,
    COUNT(*) FILTER (
      WHERE event_name = 'outbound_click'
        AND is_bot = FALSE
    ) AS outbound_events,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE is_bot = TRUE) AS bot_events,
    COUNT(*) FILTER (WHERE is_duplicate = TRUE) AS duplicate_events,
    MAX(received_at) AS source_max_received_at
  FROM analytics_events
  WHERE business_date_kst = $1::date
`;

async function upsertAnomalies(client, businessDate, anomalies) {
  await client.query(
    `UPDATE metric_anomalies
        SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
      WHERE business_date_kst = $1::date AND status = 'open'`,
    [businessDate]
  );

  for (const anomaly of anomalies) {
    await client.query(
      `INSERT INTO metric_anomalies (
         anomaly_id, business_date_kst, metric_name, anomaly_type, severity,
         status, observed_value, baseline_value, threshold_value, details,
         detected_at, resolved_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,NOW(),NULL,NOW())
       ON CONFLICT (business_date_kst, metric_name, anomaly_type) DO UPDATE SET
         severity = EXCLUDED.severity,
         status = 'open',
         observed_value = EXCLUDED.observed_value,
         baseline_value = EXCLUDED.baseline_value,
         threshold_value = EXCLUDED.threshold_value,
         details = EXCLUDED.details,
         detected_at = NOW(),
         resolved_at = NULL,
         updated_at = NOW()`,
      [
        crypto.randomUUID(),
        businessDate,
        anomaly.metricName,
        anomaly.anomalyType,
        anomaly.severity,
        anomaly.observedValue ?? null,
        anomaly.baselineValue ?? null,
        anomaly.thresholdValue ?? null,
        JSON.stringify(anomaly.details || {}),
      ]
    );
  }
}

export async function recalculateDailyMetricRollup(db, businessDate, { now = new Date() } = {}) {
  if (!isValidBusinessDate(businessDate)) throw new Error('올바른 사업 날짜가 아닙니다.');
  const client = typeof db.connect === 'function' ? await db.connect() : db;
  const runId = crypto.randomUUID();

  try {
    await client.query('BEGIN');
    const lock = await client.query(
      'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired',
      [`${DAILY_METRIC_JOB_NAME}:${businessDate}`]
    );
    if (!lock.rows[0]?.acquired) {
      await client.query('ROLLBACK');
      return { businessDateKst: businessDate, status: 'skipped_locked' };
    }

    await client.query(
      `INSERT INTO job_runs (
         run_id, job_name, business_date_kst, status, attempt_count,
         rows_affected, started_at, finished_at, error_code, error_message,
         metadata, created_at, updated_at
       ) VALUES ($1,$2,$3,'running',1,0,NOW(),NULL,NULL,NULL,'{}'::jsonb,NOW(),NOW())
       ON CONFLICT (job_name, business_date_kst) DO UPDATE SET
         run_id = EXCLUDED.run_id,
         status = 'running',
         attempt_count = job_runs.attempt_count + 1,
         rows_affected = 0,
         started_at = NOW(),
         finished_at = NULL,
         error_code = NULL,
         error_message = NULL,
         metadata = '{}'::jsonb,
         updated_at = NOW()`,
      [runId, DAILY_METRIC_JOB_NAME, businessDate]
    );

    const metricResult = await client.query(DAILY_METRICS_QUERY, [businessDate]);
    const metrics = normalizeDailyMetrics(metricResult.rows[0] || {}, businessDate, now);

    await client.query(
      `INSERT INTO daily_metric_rollups (
         business_date_kst, eligible_impression_sessions,
         qualified_outbound_sessions, raw_outbound_sessions,
         orphan_outbound_sessions, qualified_outbound_ctr_pct,
         impression_events, outbound_events, total_events, bot_events,
         duplicate_events, source_max_received_at, data_status,
         calculation_version, calculated_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
       ON CONFLICT (business_date_kst) DO UPDATE SET
         eligible_impression_sessions = EXCLUDED.eligible_impression_sessions,
         qualified_outbound_sessions = EXCLUDED.qualified_outbound_sessions,
         raw_outbound_sessions = EXCLUDED.raw_outbound_sessions,
         orphan_outbound_sessions = EXCLUDED.orphan_outbound_sessions,
         qualified_outbound_ctr_pct = EXCLUDED.qualified_outbound_ctr_pct,
         impression_events = EXCLUDED.impression_events,
         outbound_events = EXCLUDED.outbound_events,
         total_events = EXCLUDED.total_events,
         bot_events = EXCLUDED.bot_events,
         duplicate_events = EXCLUDED.duplicate_events,
         source_max_received_at = EXCLUDED.source_max_received_at,
         data_status = EXCLUDED.data_status,
         calculation_version = EXCLUDED.calculation_version,
         calculated_at = NOW(),
         updated_at = NOW()`,
      [
        businessDate,
        metrics.eligibleImpressionSessions,
        metrics.qualifiedOutboundSessions,
        metrics.rawOutboundSessions,
        metrics.orphanOutboundSessions,
        metrics.qualifiedOutboundCtrPct,
        metrics.impressionEvents,
        metrics.outboundEvents,
        metrics.totalEvents,
        metrics.botEvents,
        metrics.duplicateEvents,
        metrics.sourceMaxReceivedAt,
        metrics.dataStatus,
        DAILY_METRIC_CALCULATION_VERSION,
      ]
    );

    const anomalies = detectMetricAnomalies(metrics);
    await upsertAnomalies(client, businessDate, anomalies);
    await client.query(
      `UPDATE job_runs
          SET status = 'success', rows_affected = 1, finished_at = NOW(),
              metadata = $3::jsonb, updated_at = NOW()
        WHERE job_name = $1 AND business_date_kst = $2::date`,
      [
        DAILY_METRIC_JOB_NAME,
        businessDate,
        JSON.stringify({ anomalyCount: anomalies.length, calculationVersion: DAILY_METRIC_CALCULATION_VERSION }),
      ]
    );
    await client.query('COMMIT');
    return { ...metrics, anomalyCount: anomalies.length, status: 'success' };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    await db.query(
      `INSERT INTO job_runs (
         run_id, job_name, business_date_kst, status, attempt_count,
         rows_affected, started_at, finished_at, error_code, error_message,
         metadata, created_at, updated_at
       ) VALUES ($1,$2,$3,'failed',1,0,NOW(),NOW(),$4,$5,'{}'::jsonb,NOW(),NOW())
       ON CONFLICT (job_name, business_date_kst) DO UPDATE SET
         run_id = EXCLUDED.run_id,
         status = 'failed',
         attempt_count = job_runs.attempt_count + 1,
         finished_at = NOW(),
         error_code = EXCLUDED.error_code,
         error_message = EXCLUDED.error_message,
         updated_at = NOW()`,
      [runId, DAILY_METRIC_JOB_NAME, businessDate, error.code || 'ROLLUP_FAILED', String(error.message).slice(0, 500)]
    );
    throw error;
  } finally {
    if (client !== db && typeof client.release === 'function') client.release();
  }
}

export async function recalculateDailyMetricRange(db, startDate, endDate, options = {}) {
  const dates = buildBusinessDateRange(startDate, endDate, options.maxDays || 31);
  const results = [];
  for (const date of dates) {
    results.push(await recalculateDailyMetricRollup(db, date, options));
  }
  return results;
}
