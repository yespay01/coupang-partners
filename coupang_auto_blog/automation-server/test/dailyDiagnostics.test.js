import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPreviousKstBusinessDates,
  isDailyDiagnosticsEnabled,
  runDailyDiagnosticsCoordinator,
} from '../src/services/dailyDiagnostics.js';

test('자동 일일 진단은 명시적 true에서만 켜지고 전일까지 최대 7일만 선택한다', () => {
  assert.equal(isDailyDiagnosticsEnabled({}), false);
  assert.equal(isDailyDiagnosticsEnabled({ CTR_DAILY_DIAGNOSTICS_ENABLED: 'TRUE' }), false);
  assert.equal(isDailyDiagnosticsEnabled({ CTR_DAILY_DIAGNOSTICS_ENABLED: 'true' }), true);
  assert.deepEqual(
    getPreviousKstBusinessDates(new Date('2026-08-25T03:00:00Z'), 3),
    ['2026-08-22', '2026-08-23', '2026-08-24']
  );
  assert.throws(
    () => getPreviousKstBusinessDates(new Date('2026-08-25T03:00:00Z'), 8),
    /1일부터 7일까지/
  );
});

test('전일 rollup 성공 후에만 job_runs를 자체 관리하는 후보 coordinator를 호출한다', async () => {
  const order = [];
  const db = { async query() { throw new Error('coordinator must not duplicate job audit'); } };
  const result = await runDailyDiagnosticsCoordinator(db, {
    now: new Date('2026-08-25T03:00:00Z'),
    lookbackDays: 7,
    async recalculate(_db, startDate, endDate, options) {
      order.push({ type: 'rollup', startDate, endDate, options });
      return [{ businessDateKst: endDate, status: 'success' }];
    },
    async generateCandidates(_db, options) {
      order.push({ type: 'candidate', options });
      return { candidates: [{ candidateId: 'one' }], stored: 1, dataStatus: 'ready' };
    },
  });

  assert.equal(result.startDate, '2026-08-18');
  assert.equal(result.businessDateKst, '2026-08-24');
  assert.deepEqual(order.map((item) => item.type), ['rollup', 'candidate']);
  assert.equal(order[1].options.persist, true);
});

test('후보 job 실패는 자체 감사 구현을 존중하며 coordinator가 오류를 다시 전달한다', async () => {
  const db = { async query() { throw new Error('duplicate audit not allowed'); } };
  const candidateError = Object.assign(new Error('candidate generation failed'), { code: 'CANDIDATE_TEST' });
  await assert.rejects(
    () => runDailyDiagnosticsCoordinator(db, {
      now: new Date('2026-08-25T03:00:00Z'),
      lookbackDays: 1,
      async recalculate(_db, startDate, endDate) {
        return [{ businessDateKst: endDate, status: 'success' }];
      },
      async generateCandidates() { throw candidateError; },
    }),
    /candidate generation failed/
  );
});

test('전일 rollup이 성공하지 않으면 후보 생성 자체를 막는다', async () => {
  let generated = false;
  await assert.rejects(
    () => runDailyDiagnosticsCoordinator({ query() {} }, {
      now: new Date('2026-08-25T03:00:00Z'),
      lookbackDays: 1,
      async recalculate(_db, startDate, endDate) {
        return [{ businessDateKst: endDate, status: 'skipped_locked' }];
      },
      async generateCandidates() { generated = true; },
    }),
    /rollup이 성공하지 않아/
  );
  assert.equal(generated, false);
});
