import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DAILY_METRICS_QUERY,
  buildBusinessDateRange,
  calculateQualifiedCtr,
  detectMetricAnomalies,
  getKstBusinessDate,
  normalizeDailyMetrics,
  recalculateDailyMetricRollup,
} from '../src/services/dailyMetrics.js';

test('KST 사업일과 최대 31일 재계산 범위를 엄격히 계산한다', () => {
  assert.equal(getKstBusinessDate(new Date('2026-08-24T15:00:00.000Z')), '2026-08-25');
  assert.deepEqual(buildBusinessDateRange('2026-08-24', '2026-08-25'), [
    '2026-08-24',
    '2026-08-25',
  ]);
  assert.throws(() => buildBusinessDateRange('2026-01-01', '2026-02-01'), /최대 31일/);
  assert.throws(() => buildBusinessDateRange('2026-02-30', '2026-03-01'), /YYYY-MM-DD/);
});

test('primary CTR은 impression과 outbound의 세션 교집합이며 100%를 넘지 않는다', () => {
  assert.equal(calculateQualifiedCtr(1, 1), 100);
  assert.equal(calculateQualifiedCtr(2, 1), 100);
  assert.equal(calculateQualifiedCtr(1, 4), 25);
  assert.match(DAILY_METRICS_QUERY, /SELECT DISTINCT session_id_hash/);
  assert.match(DAILY_METRICS_QUERY, /INNER JOIN impression_sessions/);
  assert.match(DAILY_METRICS_QUERY, /event_name IN \('product_card_impression', 'cta_impression'\)/);
  assert.doesNotMatch(DAILY_METRICS_QUERY, /is_duplicate\s*=\s*FALSE/i);
});

test('impression/outbound 재시도 플래그는 품질 집계에 남되 유효 세션 CTR을 제거하지 않는다', () => {
  const metrics = normalizeDailyMetrics({
    eligible_impression_sessions: '1',
    qualified_outbound_sessions: '1',
    raw_outbound_sessions: '1',
    impression_events: '1',
    outbound_events: '1',
    total_events: '2',
    bot_events: '0',
    duplicate_events: '2',
  }, '2026-08-24', new Date('2026-08-25T03:00:00Z'));

  assert.equal(metrics.eligibleImpressionSessions, 1);
  assert.equal(metrics.qualifiedOutboundSessions, 1);
  assert.equal(metrics.qualifiedOutboundCtrPct, 100);
  assert.equal(metrics.duplicateEvents, 2);
});

test('원시 outbound가 분모보다 커도 qualified와 CTR은 안전하게 clamp한다', () => {
  const metrics = normalizeDailyMetrics({
    eligible_impression_sessions: 2,
    qualified_outbound_sessions: 8,
    raw_outbound_sessions: 9,
    total_events: 10,
  }, '2026-08-24', new Date('2026-08-25T03:00:00Z'));
  assert.equal(metrics.qualifiedOutboundSessions, 2);
  assert.equal(metrics.qualifiedOutboundCtrPct, 100);
  assert.equal(metrics.orphanOutboundSessions, 7);
});

test('no_data와 데이터 품질 이상을 성과 하락과 구분한다', () => {
  const anomalies = detectMetricAnomalies({
    dataStatus: 'no_data',
    rawOutboundSessions: 10,
    orphanOutboundSessions: 3,
    totalEvents: 20,
    botEvents: 11,
    duplicateEvents: 7,
  });
  assert.deepEqual(
    anomalies.map((item) => item.anomalyType).sort(),
    ['high_bot_ratio', 'high_duplicate_ratio', 'high_orphan_ratio', 'no_data'].sort()
  );
});

function createRollupDb(metricRows) {
  const queries = [];
  let metricIndex = 0;
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (/pg_try_advisory_xact_lock/.test(sql)) return { rows: [{ acquired: true }], rowCount: 1 };
      if (/WITH eligible_events/.test(sql)) {
        const row = metricRows[Math.min(metricIndex, metricRows.length - 1)];
        metricIndex += 1;
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  return {
    queries,
    async connect() { return client; },
    async query(sql, params = []) {
      queries.push({ sql, params });
      return { rows: [], rowCount: 1 };
    },
  };
}

test('동일 날짜는 late event를 포함해 전체 집계를 ON CONFLICT로 멱등 재계산한다', async () => {
  const db = createRollupDb([
    {
      eligible_impression_sessions: 2,
      qualified_outbound_sessions: 1,
      raw_outbound_sessions: 1,
      impression_events: 2,
      outbound_events: 1,
      total_events: 3,
    },
    {
      eligible_impression_sessions: 4,
      qualified_outbound_sessions: 3,
      raw_outbound_sessions: 3,
      impression_events: 4,
      outbound_events: 3,
      total_events: 7,
    },
  ]);

  const first = await recalculateDailyMetricRollup(db, '2026-08-24', {
    now: new Date('2026-08-25T03:00:00Z'),
  });
  const second = await recalculateDailyMetricRollup(db, '2026-08-24', {
    now: new Date('2026-08-25T03:00:00Z'),
  });

  assert.equal(first.qualifiedOutboundCtrPct, 50);
  assert.equal(second.qualifiedOutboundCtrPct, 75);
  assert.equal(second.eligibleImpressionSessions, 4);
  const upserts = db.queries.filter((query) => /INSERT INTO daily_metric_rollups/.test(query.sql));
  assert.equal(upserts.length, 2);
  assert.ok(upserts.every((query) => /ON CONFLICT \(business_date_kst\) DO UPDATE/.test(query.sql)));
  assert.equal(db.queries.filter((query) => query.sql === 'COMMIT').length, 2);
});
