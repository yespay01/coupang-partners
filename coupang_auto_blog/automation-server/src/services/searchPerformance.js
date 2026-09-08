function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function loadGoogleSearchPerformance(dateRange) {
  const { getSearchConsoleData } = await import('./googleSearchConsole.js');
  return getSearchConsoleData(dateRange);
}

async function loadNaverSearchPerformance(dateRange) {
  const { getNaverSearchData } = await import('./naverSearchAdvisor.js');
  return getNaverSearchData(dateRange);
}

export function normalizeSearchPerformanceSource(source, data, observedAt) {
  const impressions = finiteNumber(data?.totalImpressions);
  const clicks = finiteNumber(data?.totalClicks);
  const providedCtr = Number(data?.averageCtr);
  return {
    source,
    configured: data?.configured === true,
    impressions,
    clicks,
    ctrPct: Number.isFinite(providedCtr)
      ? providedCtr
      : impressions > 0 ? (100 * clicks) / impressions : 0,
    observedAt: data?.cookieUpdatedAt || observedAt,
    message: typeof data?.message === 'string' ? data.message : null,
  };
}

export async function loadSearchPerformanceSnapshot({
  now = new Date(),
  dateRange = '30d',
  loadGoogle = loadGoogleSearchPerformance,
  loadNaver = loadNaverSearchPerformance,
} = {}) {
  const observedAt = now.toISOString();
  const [googleResult, naverResult] = await Promise.allSettled([
    loadGoogle(dateRange),
    loadNaver(dateRange),
  ]);
  const resultData = (result) => result.status === 'fulfilled'
    ? result.value
    : { configured: false, message: result.reason?.message || '조회 실패' };

  return {
    windowDays: dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30,
    capturedAt: observedAt,
    sources: [
      normalizeSearchPerformanceSource('google', resultData(googleResult), observedAt),
      normalizeSearchPerformanceSource('naver', resultData(naverResult), observedAt),
    ],
  };
}
