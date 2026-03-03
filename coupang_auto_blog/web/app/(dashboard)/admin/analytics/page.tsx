"use client";

import { useEffect, useState } from "react";

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
      const response = await fetch(
        `/api/admin/analytics/stats?dateRange=${dateRange}`
      );
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || data.message || "통계 조회 실패");
      }
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

        {/* 총 방문자 수 */}
        <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-6">
          <h2 className="text-lg font-bold text-blue-900">총 방문자 수</h2>
          <p className="mt-2 text-4xl font-bold text-blue-600">
            {stats.total.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-blue-700">
            {DATE_RANGES.find((r) => r.value === dateRange)?.label} 기준
          </p>
        </div>

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

        {/* 검색 키워드 Top 20 */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              검색 키워드 Top 20
            </h2>
            <span className="text-xs text-slate-400">네이버 검색만 수집 가능 (구글은 보안 정책상 미지원)</span>
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
