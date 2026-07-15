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

const POSITION_LABELS: Record<string, string> = {
  top: "상단 버튼",
  image: "상품 이미지",
  mid: "본문 중간",
  bottom: "하단 카드",
  sticky: "하단 고정바",
  unknown: "기타",
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

const DATE_RANGES = [
  { label: "24시간", value: "24h" },
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "전체", value: "all" },
];

const DEVICE_COLORS: Record<string, string> = {
  mobile: "bg-blue-500",
  tablet: "bg-purple-500",
  desktop: "bg-green-500",
  unknown: "bg-slate-400",
};

const DEVICE_LABELS: Record<string, string> = {
  mobile: "모바일",
  tablet: "태블릿",
  desktop: "데스크탑",
  unknown: "알 수 없음",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitorRes, clickRes, gscRes] = await Promise.all([
        fetch(`/api/admin/analytics/stats?dateRange=${dateRange}`),
        fetch(`/api/admin/analytics/clicks?dateRange=${dateRange}`),
        fetch(`/api/admin/analytics/search-console?dateRange=${dateRange}`),
      ]);
      const data = await visitorRes.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || data.message || "통계 조회 실패");
      }
      // 클릭 통계는 실패해도 방문자 통계는 표시
      const clickData = await clickRes.json().catch(() => null);
      setClickStats(clickData?.success ? clickData.data : null);
      // GSC 데이터도 실패해도 기존 통계는 표시
      const gscResult = await gscRes.json().catch(() => null);
      setGscData(gscResult?.success ? gscResult.data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "통계 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
            <p className="mt-4 text-sm text-slate-600">방문자 통계 분석 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">오류: {error}</p>
            <button
              onClick={fetchStats}
              className="mt-2 rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">방문자 분석</h1>
            <p className="mt-1 text-sm text-slate-500">
              블로그 방문자의 유입 경로와 기기 정보를 확인합니다.
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            새로고침
          </button>
        </div>

        {/* 날짜 필터 */}
        <div className="flex gap-2">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                dateRange === r.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 핵심 지표: 방문자 · 쿠팡 클릭 · 클릭률 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-6">
            <h2 className="text-lg font-bold text-blue-900">총 방문자 수</h2>
            <p className="mt-2 text-4xl font-bold text-blue-600">
              {stats.total.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-blue-700">
              {DATE_RANGES.find((r) => r.value === dateRange)?.label} 기준
            </p>
          </div>
          <div className="rounded-lg border-2 border-orange-500 bg-orange-50 p-6">
            <h2 className="text-lg font-bold text-orange-900">쿠팡 링크 클릭</h2>
            <p className="mt-2 text-4xl font-bold text-orange-600">
              {(clickStats?.total ?? 0).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-orange-700">
              수익으로 이어지는 클릭 수
            </p>
          </div>
          <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-6">
            <h2 className="text-lg font-bold text-emerald-900">리뷰 → 쿠팡 클릭률</h2>
            <p className="mt-2 text-4xl font-bold text-emerald-600">
              {(() => {
                const reviewVisits = Number(
                  stats.byPageType.find((p) => p.page_type === "review")
                    ?.count || 0
                );
                const clicks = clickStats?.total ?? 0;
                return reviewVisits > 0
                  ? `${((clicks / reviewVisits) * 100).toFixed(1)}%`
                  : "-";
              })()}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              리뷰 방문 대비 쿠팡 클릭
            </p>
          </div>
        </div>

        {/* 쿠팡 클릭 분석 */}
        {clickStats && (
          <div className="rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">쿠팡 클릭 분석</h2>

            {/* 버튼 위치별 클릭 */}
            <h3 className="mt-4 text-sm font-semibold text-slate-600">
              버튼 위치별 클릭
            </h3>
            {clickStats.byPosition.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {clickStats.byPosition.map((p) => (
                  <div
                    key={p.position}
                    className="rounded-lg border border-orange-100 bg-orange-50/50 p-3 text-center"
                  >
                    <div className="text-xs font-semibold text-slate-500">
                      {POSITION_LABELS[p.position] || p.position}
                    </div>
                    <div className="mt-1 text-xl font-bold text-orange-600">
                      {Number(p.count).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                아직 수집된 클릭이 없습니다. 방문자가 쿠팡 버튼을 누르면 여기에
                집계됩니다.
              </p>
            )}

            {/* 글별 클릭 Top 20 */}
            {clickStats.byReview.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold text-slate-600">
                  글별 쿠팡 클릭 Top 20
                </h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="pb-2 pr-4">상품</th>
                        <th className="pb-2 pr-4 text-right">클릭</th>
                        <th className="pb-2 pr-4 text-right">조회</th>
                        <th className="pb-2 text-right">클릭률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clickStats.byReview.map((r, i) => (
                        <tr key={`${r.reviewId}-${i}`} className="hover:bg-slate-50">
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
              </>
            )}
          </div>
        )}

        {/* 기기 유형 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">기기 유형</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.byDevice.map((d) => (
              <div
                key={d.device}
                className="rounded-lg border border-slate-200 p-4 text-center"
              >
                <div
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${
                    DEVICE_COLORS[d.device] || "bg-slate-400"
                  }`}
                >
                  {DEVICE_LABELS[d.device] || d.device}
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-800">
                  {Number(d.count).toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {totalDevice > 0
                    ? ((Number(d.count) / totalDevice) * 100).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 날짜별 방문 추이 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">날짜별 방문 추이</h2>
          <div className="mt-4 space-y-2">
            {[...stats.byDate]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="w-24 text-right text-sm font-medium text-slate-700">
                    {d.date}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-5">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{
                        width: `${(Number(d.count) / maxDate) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold text-slate-600">
                    {Number(d.count).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* 유입 소스 Top 10 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">유입 소스 Top 10</h2>
          <div className="mt-4 space-y-2">
            {stats.byReferrer.map((r) => (
              <div key={r.domain} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm font-medium text-slate-700">
                  {r.domain}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-5">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{
                      width: `${(Number(r.count) / maxReferrer) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-semibold text-slate-600">
                  {Number(r.count).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 페이지 유형 분포 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">페이지 유형별 방문</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.byPageType.map((p) => (
              <div
                key={p.page_type}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center"
              >
                <div className="text-xs font-semibold text-slate-500">
                  {PAGE_TYPE_LABELS[p.page_type] || p.page_type}
                </div>
                <div className="mt-1 text-xl font-bold text-slate-800">
                  {Number(p.count).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 구글 검색 키워드 (Search Console) */}
        <div className="rounded-lg border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              구글 검색 키워드
            </h2>
            <span className="text-xs text-slate-400">Google Search Console API (2~3일 지연)</span>
          </div>
          {gscData && gscData.configured ? (
            <>
              {/* GSC 요약 지표 */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-center">
                  <div className="text-xs font-semibold text-slate-500">총 클릭</div>
                  <div className="mt-1 text-xl font-bold text-indigo-600">
                    {gscData.totalClicks.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-center">
                  <div className="text-xs font-semibold text-slate-500">총 노출</div>
                  <div className="mt-1 text-xl font-bold text-indigo-600">
                    {gscData.totalImpressions.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-center">
                  <div className="text-xs font-semibold text-slate-500">평균 CTR</div>
                  <div className="mt-1 text-xl font-bold text-indigo-600">
                    {gscData.averageCtr}%
                  </div>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-center">
                  <div className="text-xs font-semibold text-slate-500">평균 순위</div>
                  <div className="mt-1 text-xl font-bold text-indigo-600">
                    {gscData.averagePosition}
                  </div>
                </div>
              </div>

              {/* GSC 키워드 테이블 */}
              {gscData.keywords.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="pb-2 pr-4">#</th>
                        <th className="pb-2 pr-4">키워드</th>
                        <th className="pb-2 pr-4 text-right">클릭</th>
                        <th className="pb-2 pr-4 text-right">노출</th>
                        <th className="pb-2 pr-4 text-right">CTR</th>
                        <th className="pb-2 text-right">순위</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gscData.keywords.map((k, i) => (
                        <tr key={k.keyword} className="hover:bg-slate-50">
                          <td className="py-2 pr-4 text-xs font-bold text-slate-400">
                            {i + 1}
                          </td>
                          <td className="py-2 pr-4 text-sm text-slate-700">
                            {k.keyword}
                          </td>
                          <td className="py-2 pr-4 text-right font-semibold text-indigo-600">
                            {k.clicks.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right text-slate-600">
                            {k.impressions.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                              {k.ctr}%
                            </span>
                          </td>
                          <td className="py-2 text-right text-slate-600">
                            {k.position}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  해당 기간에 수집된 구글 검색 데이터가 없습니다.
                </p>
              )}
            </>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/30 p-6 text-center">
              <p className="text-sm font-medium text-indigo-700">
                Google Search Console 연동이 필요합니다
              </p>
              <p className="mt-2 text-xs text-indigo-500">
                서버 환경변수에 GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
                GOOGLE_SEARCH_CONSOLE_SITE_URL을 설정하세요.
              </p>
            </div>
          )}
        </div>

        {/* 검색 키워드 Top 20 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              검색 키워드 Top 20 (네이버)
            </h2>
            <span className="text-xs text-slate-400">네이버 검색만 수집 가능 (referrer 기반)</span>
          </div>
          {stats.byKeyword.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {stats.byKeyword.map((k, i) => (
                <div
                  key={k.keyword}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      #{i + 1}
                    </span>
                    <span className="text-sm text-slate-700">{k.keyword}</span>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {Number(k.count)}회
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              아직 수집된 키워드가 없습니다. 네이버 검색을 통해 방문한 경우에만 표시됩니다.
            </p>
          )}
        </div>

        {/* 최근 방문 로그 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">최근 방문 로그</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="pb-2 pr-4">시간</th>
                  <th className="pb-2 pr-4">페이지</th>
                  <th className="pb-2 pr-4">유입 소스</th>
                  <th className="pb-2 pr-4">키워드</th>
                  <th className="pb-2 pr-4">기기</th>
                  <th className="pb-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentVisitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(v.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {PAGE_TYPE_LABELS[v.page_type] || v.page_type}
                      </span>
                      {v.page_slug && (
                        <span className="ml-1 text-xs text-slate-500 truncate max-w-[120px] inline-block align-bottom">
                          {(() => { try { return decodeURIComponent(v.page_slug); } catch { return v.page_slug; } })()}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-600">
                      {v.referrer_domain || "direct"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-600">
                      {v.keyword || "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs text-white ${
                          DEVICE_COLORS[v.device_type] || "bg-slate-400"
                        }`}
                      >
                        {DEVICE_LABELS[v.device_type] || v.device_type || "?"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-slate-400">
                      {v.ip_address || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
