"use client";

import { useEffect, useState } from "react";

type ClickStats = {
  total: number;
  byPosition: { position: string; count: number }[];
  byDate: { date: string; count: number }[];
  byReview: {
    reviewId: number | null;
    slug: string | null;
    productName: string | null;
    clicks: number;
    views: number;
    ctr: number | null;
  }[];
  recentClicks: {
    id: number;
    review_slug: string | null;
    product_name: string | null;
    position: string;
    device_type: string | null;
    created_at: string;
  }[];
};

type NaverSaData = {
  configured: boolean;
  message?: string;
  cookieStatus?: "active" | "expired" | "error";
  cookieUpdatedAt?: string;
  keywords: {
    keyword: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  pages: {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
};

type GscData = {
  configured: boolean;
  keywords: {
    keyword: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  pages: {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
};

type AnalyticsStats = {
  total: number;
  byDate: { date: string; count: number }[];
  byReferrer: { domain: string; count: number }[];
  byKeyword: { keyword: string; count: number }[];
  byDevice: { device: string; count: number }[];
  byPageType: { page_type: string; count: number }[];
  recentVisitors: {
    id: number;
    page_type: string;
    page_slug: string;
    page_url: string;
    referrer_domain: string;
    keyword: string;
    device_type: string;
    ip_address: string;
    created_at: string;
  }[];
};

const POSITION_LABELS: Record<string, string> = {
  top: "상단 버튼",
  image: "상품 이미지",
  mid: "본문 중간",
  bottom: "하단 카드",
  sticky: "하단 고정바",
  unknown: "기타",
};

const DATE_RANGES = [
  { label: "24시간", value: "24h" },
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "전체", value: "all" },
];

const DEVICE_LABELS: Record<string, string> = {
  mobile: "모바일",
  tablet: "태블릿",
  desktop: "데스크탑",
  unknown: "알 수 없음",
};

const DEVICE_COLORS: Record<string, string> = {
  mobile: "bg-blue-500",
  tablet: "bg-purple-500",
  desktop: "bg-green-500",
  unknown: "bg-slate-400",
};

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: "홈",
  review: "리뷰",
  recipe: "레시피",
  news: "뉴스",
  reviews: "리뷰 목록",
  recipes: "레시피 목록",
  "news-list": "뉴스 목록",
  other: "기타",
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [clickStats, setClickStats] = useState<ClickStats | null>(null);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [naverSaData, setNaverSaData] = useState<NaverSaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");
  const [keywordTab, setKeywordTab] = useState<"google" | "naver">("google");
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitorRes, clickRes, gscRes, naverSaRes] = await Promise.all([
        fetch(`/api/admin/analytics/stats?dateRange=${dateRange}`),
        fetch(`/api/admin/analytics/clicks?dateRange=${dateRange}`),
        fetch(`/api/admin/analytics/search-console?dateRange=${dateRange}`),
        fetch(`/api/admin/analytics/naver-sa?dateRange=${dateRange}`),
      ]);
      const data = await visitorRes.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || data.message || "통계 조회 실패");
      }
      const clickData = await clickRes.json().catch(() => null);
      setClickStats(clickData?.success ? clickData.data : null);
      const gscResult = await gscRes.json().catch(() => null);
      setGscData(gscResult?.success ? gscResult.data : null);
      const naverSaResult = await naverSaRes.json().catch(() => null);
      setNaverSaData(naverSaResult?.success ? naverSaResult.data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "통계 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
            <p className="mt-4 text-sm text-slate-500">통계 분석 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-800">오류: {error}</p>
            <button
              onClick={fetchStats}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const maxDate = Math.max(...stats.byDate.map((d) => Number(d.count)), 1);
  const maxReferrer = Math.max(
    ...stats.byReferrer.map((r) => Number(r.count)),
    1
  );
  const totalDevice = stats.byDevice.reduce(
    (sum, d) => sum + Number(d.count),
    0
  );
  const reviewVisits = Number(
    stats.byPageType.find((p) => p.page_type === "review")?.count || 0
  );
  const coupangClicks = clickStats?.total ?? 0;
  const coupangCtr =
    reviewVisits > 0 ? ((coupangClicks / reviewVisits) * 100).toFixed(1) : "-";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">방문자 분석</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              유입 경로, 검색 키워드, 전환 데이터를 한눈에 확인합니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDateRange(r.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    dateRange === r.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchStats}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              title="새로고침"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* KPI 카드 5개 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
            <p className="text-xs font-medium text-slate-500">방문자</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {stats.total.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {DATE_RANGES.find((r) => r.value === dateRange)?.label}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
            <p className="text-xs font-medium text-slate-500">쿠팡 클릭</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">
              {coupangClicks.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">수익 전환 클릭</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
            <p className="text-xs font-medium text-slate-500">클릭률</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {coupangCtr}
              {coupangCtr !== "-" && <span className="text-lg">%</span>}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">리뷰 방문 대비</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
            <p className="text-xs font-medium text-slate-500">구글 노출</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">
              {gscData?.configured
                ? gscData.totalImpressions.toLocaleString()
                : "-"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              클릭 {gscData?.configured ? gscData.totalClicks.toLocaleString() : "-"}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
            <p className="text-xs font-medium text-slate-500">네이버 노출</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {naverSaData?.configured
                ? naverSaData.totalImpressions.toLocaleString()
                : "-"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              클릭 {naverSaData?.configured ? naverSaData.totalClicks.toLocaleString() : "-"}
            </p>
          </div>
        </div>

        {/* 쿠팡 클릭 분석 */}
        {clickStats && (
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              쿠팡 클릭 분석
            </h2>
            {clickStats.byPosition.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {clickStats.byPosition.map((p) => (
                  <div
                    key={p.position}
                    className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2"
                  >
                    <span className="text-xs text-slate-600">
                      {POSITION_LABELS[p.position] || p.position}
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      {Number(p.count).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                아직 수집된 클릭이 없습니다.
              </p>
            )}
            {clickStats.byReview.length > 0 && (
              <div className="mt-4 max-h-[320px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="pb-2 pr-4">상품</th>
                      <th className="pb-2 pr-4 text-right">클릭</th>
                      <th className="pb-2 pr-4 text-right">조회</th>
                      <th className="pb-2 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickStats.byReview.map((r, i) => (
                      <tr
                        key={`${r.reviewId}-${i}`}
                        className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-orange-50/50`}
                      >
                        <td className="py-2 pr-4">
                          {r.slug ? (
                            <a
                              href={`/reviews/${r.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {r.productName || r.slug}
                            </a>
                          ) : (
                            <span className="text-slate-700">
                              {r.productName || `리뷰 #${r.reviewId}`}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right font-semibold text-orange-600">
                          {r.clicks.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-right text-slate-600">
                          {r.views.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {r.ctr !== null ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              {r.ctr}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2컬럼: 날짜별 추이 + 유입 소스 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* 날짜별 방문 추이 */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              날짜별 방문 추이
            </h2>
            <div className="mt-3 space-y-1.5 max-h-[300px] overflow-y-auto">
              {[...stats.byDate]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((d) => (
                  <div key={d.date} className="flex items-center gap-2">
                    <span className="w-20 flex-shrink-0 text-right text-xs font-medium text-slate-500">
                      {d.date.slice(5)}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-4">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${(Number(d.count) / maxDate) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 flex-shrink-0 text-right text-xs font-bold text-slate-700">
                      {Number(d.count).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* 유입 소스 */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              유입 소스 Top 10
            </h2>
            <div className="mt-3 space-y-1.5">
              {stats.byReferrer.map((r) => (
                <div key={r.domain} className="flex items-center gap-2">
                  <span className="w-28 flex-shrink-0 truncate text-xs font-medium text-slate-600">
                    {r.domain}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-4">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${(Number(r.count) / maxReferrer) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-10 flex-shrink-0 text-right text-xs font-bold text-slate-700">
                    {Number(r.count).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2컬럼: 기기 유형 + 페이지 유형 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* 기기 유형 */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">기기 유형</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {stats.byDevice.map((d) => (
                <div
                  key={d.device}
                  className="rounded-lg bg-slate-50 p-3 text-center"
                >
                  <div
                    className={`mx-auto inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white ${
                      DEVICE_COLORS[d.device] || "bg-slate-400"
                    }`}
                  >
                    {DEVICE_LABELS[d.device] || d.device}
                  </div>
                  <div className="mt-1.5 text-lg font-bold text-slate-800">
                    {Number(d.count).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {totalDevice > 0
                      ? ((Number(d.count) / totalDevice) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 페이지 유형 */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              페이지 유형별 방문
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {stats.byPageType.map((p) => (
                <div
                  key={p.page_type}
                  className="rounded-lg bg-slate-50 p-3 text-center"
                >
                  <div className="text-[10px] font-semibold uppercase text-slate-400">
                    {PAGE_TYPE_LABELS[p.page_type] || p.page_type}
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-800">
                    {Number(p.count).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 검색 키워드 (구글 | 네이버 탭) */}
        <div className="rounded-xl bg-white shadow-sm border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 pt-4 pb-0">
            <div className="flex gap-0">
              <button
                onClick={() => setKeywordTab("google")}
                className={`border-b-2 px-4 pb-3 text-sm font-medium transition ${
                  keywordTab === "google"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                구글 검색
              </button>
              <button
                onClick={() => setKeywordTab("naver")}
                className={`border-b-2 px-4 pb-3 text-sm font-medium transition ${
                  keywordTab === "naver"
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                네이버 검색
                {naverSaData?.cookieStatus === "expired" && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500"></span>
                )}
              </button>
            </div>
            <span className="pb-3 text-[10px] text-slate-400">
              {keywordTab === "google"
                ? "Search Console API (2~3일 지연)"
                : naverSaData?.cookieUpdatedAt
                  ? `갱신: ${new Date(naverSaData.cookieUpdatedAt).toLocaleDateString("ko-KR")}`
                  : "서치어드바이저"}
            </span>
          </div>

          <div className="p-5">
            {/* 구글 탭 */}
            {keywordTab === "google" && (
              <>
                {gscData && gscData.configured ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "총 클릭", value: gscData.totalClicks },
                        { label: "총 노출", value: gscData.totalImpressions },
                        { label: "평균 CTR", value: `${gscData.averageCtr}%`, raw: true },
                        { label: "평균 순위", value: gscData.averagePosition, raw: true },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className="rounded-lg bg-indigo-50/60 p-3 text-center"
                        >
                          <div className="text-[10px] font-semibold text-slate-500">
                            {m.label}
                          </div>
                          <div className="mt-1 text-xl font-bold text-indigo-600">
                            {m.raw ? m.value : Number(m.value).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    {gscData.keywords.length > 0 ? (
                      <div className="mt-4 max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-white">
                            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                              <th className="pb-2 pr-3 w-8">#</th>
                              <th className="pb-2 pr-3">키워드</th>
                              <th className="pb-2 pr-3 text-right">클릭</th>
                              <th className="pb-2 pr-3 text-right">노출</th>
                              <th className="pb-2 pr-3 text-right">CTR</th>
                              <th className="pb-2 text-right">순위</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gscData.keywords.map((k, i) => (
                              <tr
                                key={k.keyword}
                                className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-indigo-50/30`}
                              >
                                <td className="py-1.5 pr-3 text-xs text-slate-400">
                                  {i + 1}
                                </td>
                                <td className="py-1.5 pr-3 text-slate-700">
                                  {k.keyword}
                                </td>
                                <td className="py-1.5 pr-3 text-right font-semibold text-indigo-600">
                                  {k.clicks.toLocaleString()}
                                </td>
                                <td className="py-1.5 pr-3 text-right text-slate-500">
                                  {k.impressions.toLocaleString()}
                                </td>
                                <td className="py-1.5 pr-3 text-right">
                                  <span className="text-xs text-indigo-700">
                                    {k.ctr}%
                                  </span>
                                </td>
                                <td className="py-1.5 text-right text-slate-500">
                                  {k.position}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400">
                        해당 기간에 수집된 데이터가 없습니다.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 p-8 text-center">
                    <p className="text-sm font-medium text-indigo-600">
                      Google Search Console 연동이 필요합니다
                    </p>
                    <p className="mt-1 text-xs text-indigo-400">
                      서버 환경변수에 GOOGLE_SERVICE_ACCOUNT_EMAIL 등을 설정하세요.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* 네이버 탭 */}
            {keywordTab === "naver" && (
              <>
                {naverSaData && naverSaData.configured ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: "총 클릭", value: naverSaData.totalClicks },
                        { label: "총 노출", value: naverSaData.totalImpressions },
                        { label: "평균 CTR", value: `${naverSaData.averageCtr}%`, raw: true },
                      ].map((m) => (
                        <div
                          key={m.label}
                          className="rounded-lg bg-green-50/60 p-3 text-center"
                        >
                          <div className="text-[10px] font-semibold text-slate-500">
                            {m.label}
                          </div>
                          <div className="mt-1 text-xl font-bold text-green-600">
                            {m.raw ? m.value : Number(m.value).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    {naverSaData.keywords.length > 0 ? (
                      <div className="mt-4 max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-white">
                            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                              <th className="pb-2 pr-3 w-8">#</th>
                              <th className="pb-2 pr-3">키워드</th>
                              <th className="pb-2 pr-3 text-right">클릭</th>
                              <th className="pb-2 pr-3 text-right">노출</th>
                              <th className="pb-2 pr-3 text-right">CTR</th>
                              <th className="pb-2 text-right">순위</th>
                            </tr>
                          </thead>
                          <tbody>
                            {naverSaData.keywords.map((k, i) => (
                              <tr
                                key={k.keyword}
                                className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-green-50/30`}
                              >
                                <td className="py-1.5 pr-3 text-xs text-slate-400">
                                  {i + 1}
                                </td>
                                <td className="py-1.5 pr-3 text-slate-700">
                                  {k.keyword}
                                </td>
                                <td className="py-1.5 pr-3 text-right font-semibold text-green-600">
                                  {k.clicks.toLocaleString()}
                                </td>
                                <td className="py-1.5 pr-3 text-right text-slate-500">
                                  {k.impressions.toLocaleString()}
                                </td>
                                <td className="py-1.5 pr-3 text-right">
                                  <span className="text-xs text-green-700">
                                    {k.ctr}%
                                  </span>
                                </td>
                                <td className="py-1.5 text-right text-slate-500">
                                  {k.position}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400">
                        해당 기간에 수집된 데이터가 없습니다.
                      </p>
                    )}
                    {naverSaData.pages.length > 0 && (
                      <>
                        <h3 className="mt-5 text-sm font-semibold text-slate-600">
                          웹문서 Top 10
                        </h3>
                        <div className="mt-2 max-h-[280px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                                <th className="pb-2 pr-3 w-8">#</th>
                                <th className="pb-2 pr-3">페이지</th>
                                <th className="pb-2 pr-3 text-right">클릭</th>
                                <th className="pb-2 pr-3 text-right">노출</th>
                                <th className="pb-2 text-right">CTR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {naverSaData.pages.slice(0, 10).map((p, i) => (
                                <tr
                                  key={p.page}
                                  className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-green-50/30`}
                                >
                                  <td className="py-1.5 pr-3 text-xs text-slate-400">
                                    {i + 1}
                                  </td>
                                  <td className="py-1.5 pr-3 max-w-[250px] truncate">
                                    <a
                                      href={p.page}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-xs"
                                      title={p.page}
                                    >
                                      {p.page.replace("https://semolink.store", "")}
                                    </a>
                                  </td>
                                  <td className="py-1.5 pr-3 text-right font-semibold text-green-600">
                                    {p.clicks.toLocaleString()}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right text-slate-500">
                                    {p.impressions.toLocaleString()}
                                  </td>
                                  <td className="py-1.5 text-right">
                                    <span className="text-xs text-green-700">
                                      {p.ctr}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-green-200 bg-green-50/30 p-8 text-center">
                    <p className="text-sm font-medium text-green-600">
                      {naverSaData?.message ||
                        "네이버 서치어드바이저 연동이 필요합니다"}
                    </p>
                    <p className="mt-1 text-xs text-green-400">
                      NAVER_SA_COOKIES 환경변수를 설정하세요.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 최근 방문 로그 (접기/펼치기) */}
        <div className="rounded-xl bg-white shadow-sm border border-slate-200">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <h2 className="text-base font-semibold text-slate-900">
              최근 방문 로그
            </h2>
            <svg
              className={`h-5 w-5 text-slate-400 transition-transform ${showLogs ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showLogs && (
            <div className="max-h-[400px] overflow-auto border-t border-slate-100 px-5 pb-5">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="py-2 pr-3">시간</th>
                    <th className="py-2 pr-3">페이지</th>
                    <th className="py-2 pr-3">유입</th>
                    <th className="py-2 pr-3">키워드</th>
                    <th className="py-2 pr-3">기기</th>
                    <th className="py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentVisitors.map((v, i) => (
                    <tr
                      key={v.id}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/30`}
                    >
                      <td className="py-1.5 pr-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(v.created_at).toLocaleString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          {PAGE_TYPE_LABELS[v.page_type] || v.page_type}
                        </span>
                        {v.page_slug && (
                          <span className="ml-1 text-[10px] text-slate-400 truncate max-w-[100px] inline-block align-bottom">
                            {(() => {
                              try {
                                return decodeURIComponent(v.page_slug);
                              } catch {
                                return v.page_slug;
                              }
                            })()}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-xs text-slate-500">
                        {v.referrer_domain || "direct"}
                      </td>
                      <td className="py-1.5 pr-3 text-xs text-slate-500">
                        {v.keyword || "-"}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] text-white ${
                            DEVICE_COLORS[v.device_type] || "bg-slate-400"
                          }`}
                        >
                          {DEVICE_LABELS[v.device_type] || v.device_type || "?"}
                        </span>
                      </td>
                      <td className="py-1.5 text-[10px] text-slate-400">
                        {v.ip_address || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
