import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  fetchDailyMetricRollups,
  generateImprovementCandidates,
  normalizeDailyMetricRollup,
  persistProposedCandidates,
  runImprovementCandidateJob,
  transitionImprovementCandidate,
  validateImprovementCandidate,
} from '../src/services/improvementCandidates.js';

const NOW = new Date('2026-08-25T08:00:00.000Z');
const END_DATE = '2026-08-24';

function addDays(date, amount) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function completeRows({ days = 14, previousOutbound = 20, recentOutbound = 20 } = {}) {
  return Array.from({ length: days }, (_, index) => {
    const businessDate = addDays(END_DATE, index - days + 1);
    const outbound = index < days - 7 ? previousOutbound : recentOutbound;
    return {
      business_date_kst: businessDate,
      eligible_impression_sessions: 200,
      qualified_outbound_sessions: outbound,
      raw_outbound_sessions: outbound,
      orphan_outbound_sessions: 0,
      qualified_outbound_ctr_pct: (100 * outbound) / 200,
      impression_events: 240,
      outbound_events: outbound,
      total_events: 300,
      bot_events: 5,
      duplicate_events: 3,
      source_max_received_at: `${businessDate}T14:00:00.000Z`,
      data_status: 'complete',
      calculation_version: 1,
    };
  });
}

test('affiliate backend overall rollup 계약을 camelCase 진단 입력으로 정규화한다', () => {
  const row = normalizeDailyMetricRollup(completeRows({ days: 1 })[0]);

  assert.equal(row.businessDateKst, END_DATE);
  assert.equal(row.dimensionType, 'all');
  assert.equal(row.eligibleSessions, 200);
  assert.equal(row.outboundSessions, 20);
  assert.equal(row.dataStatus, 'complete');
});

test('no_data는 성과 0이 아닌 데이터 품질 후보로만 분류한다', () => {
  const result = generateImprovementCandidates([
    { business_date_kst: END_DATE, data_status: 'no_data', total_events: 0 },
  ], { businessDateKst: END_DATE, now: NOW });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].candidateKey, 'data_quality:no_data:all');
  assert.equal(result.candidates[0].candidateType, 'data_quality');
  assert.equal(result.candidates[0].winnerDeclared, false);
});

test('partial 일자는 성과 제안 없이 불완전 데이터 후보로 끝낸다', () => {
  const rows = completeRows({ days: 14 });
  rows.at(-1).data_status = 'partial';
  const result = generateImprovementCandidates(rows, { businessDateKst: END_DATE, now: NOW });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].candidateKey, 'data_quality:partial_data:all');
  assert.equal(result.candidates.some((candidate) => candidate.candidateType === 'ux_experiment'), false);
});

test('eligible 세션 100 미만이면 UX 제안과 승자 선언을 금지한다', () => {
  const rows = completeRows({ days: 14 });
  rows.at(-1).eligible_impression_sessions = 99;
  rows.at(-1).qualified_outbound_sessions = 4;
  const result = generateImprovementCandidates(rows, { businessDateKst: END_DATE, now: NOW });

  assert.ok(result.candidates.some((candidate) => candidate.candidateKey.includes('insufficient_daily_sample')));
  const candidate = result.candidates.find((item) => item.candidateKey.includes('insufficient_daily_sample'));
  assert.equal(candidate.title, '유효 노출 세션 부족 · 유입 확대 우선');
  assert.equal(candidate.recommendation.action, 'increase_eligible_exposure');
  assert.match(candidate.recommendation.nextAction, /Search Console/);
  assert.equal(result.candidates.some((candidate) => candidate.candidateType === 'ux_experiment'), false);
  assert.ok(result.candidates.every((candidate) => candidate.winnerDeclared === false));
});

test('이벤트 0건은 측정 장애와 실제 노출 부족을 구분하도록 제안한다', () => {
  const result = generateImprovementCandidates([
    { business_date_kst: END_DATE, data_status: 'no_data', total_events: 0 },
  ], { businessDateKst: END_DATE, now: NOW });
  const candidate = result.candidates[0];

  assert.equal(candidate.recommendation.action, 'diagnose_zero_traffic');
  assert.match(candidate.hypothesis, /유입·노출 부족/);
  assert.ok(candidate.recommendation.checks.includes('search_impressions'));
});

test('검색 데이터로 Google 발견 부족과 네이버 검색 CTR 부족을 각각 제안한다', () => {
  const rows = completeRows({ days: 14 });
  const result = generateImprovementCandidates(rows, {
    businessDateKst: END_DATE,
    now: NOW,
    searchPerformance: {
      windowDays: 30,
      capturedAt: NOW.toISOString(),
      sources: [
        { source: 'google', configured: true, impressions: 6, clicks: 0, ctrPct: 0 },
        {
          source: 'naver', configured: true, impressions: 19659, clicks: 202, ctrPct: 1.03,
          pages: [
            { page: 'https://semolink.store/reviews/legacy-product', impressions: 738, clicks: 4, ctrPct: 0.5 },
            { page: 'https://semolink.store/products/2', impressions: 284, clicks: 4, ctrPct: 1.4 },
          ],
          keywords: [{ keyword: '홈플래닛 선풍기', impressions: 228, clicks: 3, ctrPct: 1.3 }],
        },
      ],
    },
  });
  const google = result.candidates.find((item) => item.candidateKey === 'acquisition:google:search_discovery');
  const naver = result.candidates.find((item) => item.candidateKey === 'acquisition:naver:search_snippet_ctr');

  assert.equal(google.recommendation.action, 'improve_search_discovery');
  assert.equal(google.evidence.impressions, 6);
  assert.equal(naver.recommendation.action, 'improve_search_snippet');
  assert.equal(naver.evidence.ctrPct, 1.03);
  assert.equal(naver.evidence.targetPages[0].page, 'https://semolink.store/reviews/legacy-product');
  assert.equal(naver.evidence.targetKeywords[0].keyword, '홈플래닛 선풍기');
  assert.equal(naver.evidence.legacyReviewSharePct, 72.2);
  assert.match(naver.recommendation.nextAction, /영구 리디렉션/);
  assert.ok(result.candidates.every((candidate) => candidate.winnerDeclared === false));
});

test('검색 연동이 없거나 노출과 CTR이 기준 이상이면 검색 개선후보를 만들지 않는다', () => {
  const result = generateImprovementCandidates(completeRows(), {
    businessDateKst: END_DATE,
    now: NOW,
    searchPerformance: {
      windowDays: 30,
      sources: [
        { source: 'google', configured: false, impressions: 0, clicks: 0, ctrPct: 0 },
        { source: 'naver', configured: true, impressions: 1000, clicks: 30, ctrPct: 3, observedAt: NOW.toISOString() },
      ],
    },
  });

  assert.equal(result.candidates.some((item) => item.candidateKey.startsWith('acquisition:')), false);
});

test('오래된 검색 스냅샷은 노출 진단에 쓰지 않고 최신성 복구 후보로 분류한다', () => {
  const result = generateImprovementCandidates(completeRows(), {
    businessDateKst: END_DATE,
    now: NOW,
    searchPerformance: {
      windowDays: 30,
      sources: [{
        source: 'naver',
        configured: true,
        impressions: 19659,
        clicks: 202,
        ctrPct: 1.03,
        observedAt: '2026-08-20T00:00:00.000Z',
      }],
    },
  });

  assert.ok(result.candidates.some((item) => item.candidateKey === 'data_quality:naver_search_snapshot_stale:all'));
  assert.equal(result.candidates.some((item) => item.candidateKey.startsWith('acquisition:naver:')), false);
});

test('봇·중복·orphan 비율 이상은 데이터 품질 후보이며 UX 제안을 억제한다', () => {
  const rows = completeRows();
  Object.assign(rows.at(-1), {
    total_events: 100,
    bot_events: 30,
    duplicate_events: 20,
    raw_outbound_sessions: 100,
    orphan_outbound_sessions: 10,
  });
  const result = generateImprovementCandidates(rows, { businessDateKst: END_DATE, now: NOW });
  const keys = result.candidates.map((candidate) => candidate.candidateKey);

  assert.ok(keys.includes('data_quality:high_bot_rate:all'));
  assert.ok(keys.includes('data_quality:high_duplicate_rate:all'));
  assert.ok(keys.includes('data_quality:high_orphan_rate:all'));
  assert.equal(result.candidates.some((candidate) => candidate.candidateType === 'ux_experiment'), false);
});

test('14일 CTR 하락은 승자가 아닌 사람 승인 대기 실험 제안으로 만든다', () => {
  const result = generateImprovementCandidates(
    completeRows({ previousOutbound: 20, recentOutbound: 8 }),
    { businessDateKst: END_DATE, now: NOW }
  );
  const candidate = result.candidates.find((item) => item.candidateKey.includes('qualified_ctr_decline'));

  assert.ok(candidate);
  assert.equal(candidate.status, 'proposed');
  assert.equal(candidate.requiresHumanApproval, true);
  assert.equal(candidate.automaticChangeAllowed, false);
  assert.equal(candidate.winnerDeclared, false);
  assert.equal(candidate.recommendation.minimumRuntimeDays, 14);
  assert.equal(candidate.recommendation.minimumEligibleSessionsPerVariant, 1000);
  assert.ok(candidate.guardrails.some((guardrail) => guardrail.metric === 'EPC' && guardrail.blocksApproval));
  assert.ok(candidate.rollbackPlan.length > 10);
});

test('CTR 하락이 없어도 기준선 준비 완료 시 첫 실험 백로그를 한 건 제안한다', () => {
  const result = generateImprovementCandidates(completeRows(), {
    businessDateKst: END_DATE,
    now: NOW,
  });
  const candidate = result.candidates.find((item) => item.candidateKey === 'ux_experiment:baseline_ready:all');

  assert.ok(candidate);
  assert.equal(candidate.evidence.trendConclusion.includes('승패 판단 없음'), true);
  assert.equal(candidate.recommendation.changeOneVariableOnly, true);
  assert.ok(candidate.guardrails.some((guardrail) => guardrail.metric === 'cancel_rate' && guardrail.blocksApproval));
});

test('하루치 큰 상승도 승자를 선언하지 않고 14일 기준선 부족으로 보류한다', () => {
  const result = generateImprovementCandidates(completeRows({ days: 1, recentOutbound: 80 }), {
    businessDateKst: END_DATE,
    now: NOW,
  });

  assert.equal(result.candidates.some((candidate) => candidate.candidateType === 'ux_experiment'), false);
  assert.ok(result.candidates.some((candidate) => candidate.candidateKey.includes('incomplete_14_day_baseline')));
  assert.ok(result.candidates.every((candidate) => candidate.winnerDeclared === false));
});

test('후보 필수 계약과 사람 승인 상태 전이를 강제한다', () => {
  const candidate = generateImprovementCandidates(completeRows(), {
    businessDateKst: END_DATE,
    now: NOW,
  }).candidates[0];

  assert.equal(validateImprovementCandidate(candidate), candidate);
  assert.throws(() => validateImprovementCandidate({ ...candidate, rollbackPlan: '' }), /rollback/);
  assert.throws(() => transitionImprovementCandidate(candidate, 'approved'), /reviewedBy/);
  const approved = transitionImprovementCandidate(candidate, 'approved', {
    reviewedBy: 'admin',
    reviewNote: '실험 설계 검토',
    now: NOW,
  });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.automaticChangeAllowed, false);
  assert.throws(() => transitionImprovementCandidate(approved, 'rejected', { reviewedBy: 'admin' }), /invalid/);
});

test('저장 시 같은 key의 과거 proposed를 먼저 expired 처리하고 승인 행은 덮지 않는다', async () => {
  const candidate = generateImprovementCandidates(completeRows(), {
    businessDateKst: END_DATE,
    now: NOW,
  }).candidates[0];
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/INSERT INTO improvement_candidates/.test(sql)) return { rowCount: 1, rows: [{ candidate_id: params[0] }] };
      return { rowCount: 2, rows: [] };
    },
  };

  assert.equal(await persistProposedCandidates(db, [candidate]), 1);
  assert.match(calls[0].sql, /SET status = 'expired'/);
  assert.match(calls[0].sql, /status = 'proposed'/);
  assert.match(calls[1].sql, /WHERE improvement_candidates\.status = 'proposed'/);
  assert.match(calls[1].sql, /title = EXCLUDED\.title/);
  assert.match(calls[1].sql, /hypothesis = EXCLUDED\.hypothesis/);
  assert.doesNotMatch(calls.map((call) => call.sql).join('\n'), /UPDATE\s+(?:products|reviews)/i);
});

test('persist coordinator는 advisory lock과 job_runs를 사용해 같은 날짜를 멱등 재실행한다', async () => {
  const calls = [];
  const rows = completeRows();
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (/pg_try_advisory_xact_lock/.test(sql)) return { rows: [{ acquired: true }], rowCount: 1 };
      if (/FROM daily_metric_rollups/.test(sql)) return { rows: [...rows].reverse(), rowCount: rows.length };
      if (/INSERT INTO improvement_candidates/.test(sql)) return { rows: [{ candidate_id: params[0] }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const db = {
    async connect() { return client; },
    async query(sql, params = []) {
      calls.push({ sql, params });
      return { rows: [], rowCount: 1 };
    },
  };

  const first = await runImprovementCandidateJob(db, {
    businessDateKst: END_DATE,
    now: NOW,
    persist: true,
  });
  const second = await runImprovementCandidateJob(db, {
    businessDateKst: END_DATE,
    now: NOW,
    persist: true,
  });

  assert.equal(first.status, 'success');
  assert.equal(second.status, 'success');
  assert.deepEqual(first.candidates.map((candidate) => candidate.candidateKey), second.candidates.map((candidate) => candidate.candidateKey));
  assert.equal(calls.filter((call) => call.sql === 'COMMIT').length, 2);
  assert.equal(calls.filter((call) => /pg_try_advisory_xact_lock/.test(call.sql)).length, 2);
  const jobUpserts = calls.filter((call) => /INSERT INTO job_runs/.test(call.sql));
  assert.equal(jobUpserts.length, 2);
  assert.ok(jobUpserts.every((call) => call.params.includes('daily_improvement_candidates')));
  assert.ok(calls.some((call) => /ON CONFLICT \(candidate_key, business_date_kst\) DO UPDATE/.test(call.sql)));
  const sql = calls.map((call) => call.sql).join('\n');
  assert.doesNotMatch(sql, /UPDATE\s+(?:products|reviews|settings)/i);
  assert.doesNotMatch(sql, /INSERT INTO\s+(?:products|reviews|settings)/i);
});

test('rollup 조회는 확정 overall 필드와 KST 기준일만 읽는다', async () => {
  const calls = [];
  const rows = completeRows({ days: 2 });
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [...rows].reverse() };
    },
  };
  const result = await fetchDailyMetricRollups(db, { businessDateKst: END_DATE, lookbackDays: 28 });

  assert.equal(result.length, 2);
  assert.match(calls[0].sql, /FROM daily_metric_rollups/);
  assert.match(calls[0].sql, /eligible_impression_sessions/);
  assert.doesNotMatch(calls[0].sql, /INSERT|UPDATE|DELETE/i);
});

test('migration은 승인 상태와 자동 변경 금지를 DB 제약으로 고정한다', async () => {
  const migrationUrl = new URL('../db/migrate-improvement-candidates.sql', import.meta.url);
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS improvement_candidates/);
  assert.match(sql, /'proposed', 'approved', 'rejected', 'expired'/);
  assert.match(sql, /winner_declared = FALSE/);
  assert.match(sql, /requires_human_approval = TRUE/);
  assert.match(sql, /automatic_change_allowed = FALSE/);
  assert.match(sql, /UNIQUE \(candidate_key, business_date_kst\)/);
});
