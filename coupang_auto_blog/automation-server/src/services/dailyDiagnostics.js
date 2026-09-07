import {
  buildBusinessDateRange,
  getKstBusinessDate,
  recalculateDailyMetricRange,
} from './dailyMetrics.js';
import { runImprovementCandidateJob } from './improvementCandidates.js';

export const MAX_DIAGNOSTIC_LOOKBACK_DAYS = 7;

export function isDailyDiagnosticsEnabled(env = process.env) {
  return env.CTR_DAILY_DIAGNOSTICS_ENABLED === 'true';
}

export function getPreviousKstBusinessDates(now = new Date(), lookbackDays = 7) {
  const days = Number(lookbackDays);
  if (!Number.isInteger(days) || days < 1 || days > MAX_DIAGNOSTIC_LOOKBACK_DAYS) {
    throw new Error(`자동 진단 재계산은 1일부터 ${MAX_DIAGNOSTIC_LOOKBACK_DAYS}일까지 가능합니다.`);
  }
  const today = new Date(`${getKstBusinessDate(now)}T00:00:00Z`);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return buildBusinessDateRange(
    start.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
    MAX_DIAGNOSTIC_LOOKBACK_DAYS
  );
}

export async function runDailyDiagnosticsCoordinator(db, {
  now = new Date(),
  lookbackDays = MAX_DIAGNOSTIC_LOOKBACK_DAYS,
  recalculate = recalculateDailyMetricRange,
  generateCandidates = runImprovementCandidateJob,
} = {}) {
  const dates = getPreviousKstBusinessDates(now, lookbackDays);
  const startDate = dates[0];
  const businessDateKst = dates[dates.length - 1];
  const rollups = await recalculate(db, startDate, businessDateKst, {
    now,
    maxDays: MAX_DIAGNOSTIC_LOOKBACK_DAYS,
  });
  const yesterdayRollup = rollups.find((item) => item.businessDateKst === businessDateKst);
  if (yesterdayRollup?.status !== 'success') {
    const error = new Error('전일 KST rollup이 성공하지 않아 개선 후보 생성을 건너뜁니다.');
    error.code = 'YESTERDAY_ROLLUP_NOT_SUCCESS';
    throw error;
  }

  // runImprovementCandidateJob가 advisory lock과 job_runs 성공/실패 기록을 소유한다.
  const candidateResult = await generateCandidates(db, {
    businessDateKst,
    persist: true,
    now,
  });
  return { businessDateKst, startDate, rollups, candidateResult, status: 'success' };
}
