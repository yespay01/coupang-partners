import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getOptimizationSnapshot,
  mapAnomaly,
  mapCandidate,
  mapJob,
  mapRollup,
  parseOptimizationDateRange,
} from '../src/routes/optimization.js';

test('optimization dateRange는 최대 31일이며 KST 기준 종료일을 쓴다', () => {
  assert.deepEqual(
    parseOptimizationDateRange('2d', new Date('2026-08-24T15:00:00Z')),
    { days: 2, startDate: '2026-08-24', endDate: '2026-08-25' }
  );
  assert.deepEqual(
    parseOptimizationDateRange('24h', new Date('2026-08-24T15:00:00Z')),
    { days: 1, startDate: '2026-08-25', endDate: '2026-08-25' }
  );
  assert.deepEqual(
    parseOptimizationDateRange('all', new Date('2026-08-24T15:00:00Z')),
    { days: 31, startDate: '2026-07-26', endDate: '2026-08-25' }
  );
  assert.throws(() => parseOptimizationDateRange('32d'), /1d부터 31d/);
});

test('rollup DTO는 숫자형 PG 문자열을 camelCase 숫자로 변환한다', () => {
  const dto = mapRollup({
    business_date_kst: '2026-08-25',
    eligible_impression_sessions: '10',
    qualified_outbound_sessions: '4',
    qualified_outbound_ctr_pct: '40.0000',
    data_status: 'partial',
    calculation_version: '1',
  });
  assert.equal(dto.businessDate, '2026-08-25');
  assert.equal(dto.eligibleImpressionSessions, 10);
  assert.equal(dto.qualifiedOutboundCtrPct, 40);
  assert.equal(dto.dataStatus, 'incomplete');
  assert.equal(dto.calculationVersion, '1');
  assert.deepEqual(Object.keys(dto), [
    'businessDate', 'eligibleImpressionSessions', 'qualifiedOutboundSessions',
    'rawOutboundSessions', 'orphanOutboundSessions', 'qualifiedOutboundCtrPct',
    'impressionEventCount', 'outboundEventCount', 'totalEventCount', 'botEventCount',
    'duplicateEventCount', 'sourceMaxReceivedAt', 'dataStatus', 'calculationVersion',
    'calculatedAt', 'createdAt', 'updatedAt',
    'impressionEvents', 'outboundEvents', 'totalEvents', 'botEvents', 'duplicateEvents',
  ]);
  assert.equal(dto.impressionEvents, dto.impressionEventCount);
});

test('anomaly/candidate/job DTO는 frontend 필드 계약을 정확히 제공한다', () => {
  const anomaly = mapAnomaly({
    anomaly_id: 'a1',
    metric_name: 'duplicate_events',
    anomaly_type: 'high_duplicate_ratio',
    severity: 'warning',
    status: 'open',
    observed_value: '3',
    threshold_value: '0.3',
    details: { message: '중복 비율이 높습니다.' },
    detected_at: '2026-08-25T00:00:00Z',
  });
  assert.deepEqual(Object.keys(anomaly), [
    'id', 'title', 'metric', 'severity', 'status', 'reason', 'evidence', 'detectedAt',
  ]);
  assert.equal(anomaly.reason, '중복 비율이 높습니다.');

  const candidate = mapCandidate({
    candidate_id: 'c1',
    title: '표본 확대',
    status: 'proposed',
    hypothesis: '표본 부족으로 판단을 보류한다.',
    evidence: { eligible: 10 },
    sample: {
      totalEligibleSessions: 10,
      totalQualifiedOutboundSessions: 2,
      minimumEligibleSessionsPerVariant: 1000,
    },
    primary_metric: { uncertainty: '표본 부족' },
    recommendation: {},
    risks: ['오판 위험'],
    guardrails: [{ metric: 'EPC', status: 'not_available', condition: '악화 없음' }],
    created_at: '2026-08-25T00:00:00Z',
  });
  assert.deepEqual(Object.keys(candidate), [
    'id', 'title', 'status', 'rationale', 'evidence', 'expectedImpact', 'uncertainty',
    'risk', 'sample', 'guardrails', 'createdAt',
  ]);
  assert.deepEqual(candidate.sample, {
    eligibleSessions: 10,
    conversions: 2,
    requiredSessions: 1000,
  });
  assert.equal(candidate.guardrails[0].status, 'not_available');

  const job = mapJob({
    job_name: 'daily_metric_rollup',
    business_date_kst: '2026-08-25',
    status: 'success',
    started_at: '2026-08-25T00:00:00Z',
    finished_at: '2026-08-25T00:01:00Z',
    attempt_count: '2',
  });
  assert.deepEqual(job, {
    jobName: 'daily_metric_rollup',
    businessDate: '2026-08-25',
    status: 'success',
    startedAt: '2026-08-25T00:00:00Z',
    finishedAt: '2026-08-25T00:01:00Z',
    attempts: 2,
    error: null,
  });
});

test('optimization snapshot은 rollups/anomalies/candidates/jobs 통합 계약과 no_data를 제공한다', async () => {
  const calls = [];
  const db = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/daily_metric_rollups/.test(sql)) return { rows: [] };
      if (/metric_anomalies/.test(sql)) return { rows: [] };
      if (/job_runs/.test(sql)) return { rows: [] };
      if (/improvement_candidates/.test(sql)) {
        const error = new Error('not migrated');
        error.code = '42P01';
        throw error;
      }
      throw new Error('unexpected query');
    },
  };
  const snapshot = await getOptimizationSnapshot(db, {
    dateRange: '30d',
    now: new Date('2026-08-25T03:00:00Z'),
  });
  assert.deepEqual(snapshot, {
    generatedAt: '2026-08-25T03:00:00.000Z',
    dataStatus: 'no_data',
    rollups: [],
    anomalies: [],
    candidates: [],
    jobs: [],
  });
  const jobQuery = calls.find((call) => /job_runs/.test(call.sql));
  assert.match(jobQuery.sql, /job_name IN \(\$1, \$2\)/);
  assert.deepEqual(jobQuery.params.slice(0, 2), [
    'daily_metric_rollup',
    'daily_improvement_candidates',
  ]);
});
