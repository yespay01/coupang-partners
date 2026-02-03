"use client";

import { useMemo, useState } from "react";
import { useCoupangReports } from "@/hooks/useCoupangReports";
import { useSystemSettings } from "@/hooks/useSystemSettings";

/**
 * 숫자를 원화 형식으로 포맷
 */
function formatCurrency(value: number): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "₩0";
  }
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * 숫자 포맷 (콤마)
 */
function formatNumber(value: number): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0";
  }
  return value.toLocaleString();
}

type PeriodDays = 7 | 14 | 30;

/**
 * 종합 리포트 대시보드
 * - 클릭 수
 * - 주문 정보
 * - 취소 정보
 * - 수익 정보
 */
export function ReportsOverview() {
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);
  const { isLoading: isSettingsLoading } = useSystemSettings();

  const {
    clicks,
    orders,
    cancels,
    commission,
    summary,
    isEnabled,
    isLoading: isReportsLoading,
    error,
    refetch,
  } = useCoupangReports(periodDays);

  const isLoading = isSettingsLoading || isReportsLoading;

  // 통계 계산
  const stats = useMemo(() => {
    if (!summary) {
      return {
        totalClicks: 0,
        totalOrders: 0,
        totalCancels: 0,
        totalCommission: 0,
        totalGmv: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        cancelRate: 0,
      };
    }

    const totalClicks = summary.totalClicks ?? 0;
    const totalOrders = summary.totalOrders ?? 0;
    const totalCancels = summary.totalCancels ?? 0;
    const totalCommission = summary.totalCommission ?? 0;
    const totalGmv = summary.totalGmv ?? 0;

    const avgOrderValue = totalOrders > 0 ? totalGmv / totalOrders : 0;
    const conversionRate = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;
    const cancelRate = totalOrders > 0 ? (totalCancels / totalOrders) * 100 : 0;

    return {
      totalClicks,
      totalOrders,
      totalCancels,
      totalCommission,
      totalGmv,
      avgOrderValue,
      conversionRate,
      cancelRate,
    };
  }, [summary]);

  // 날짜별 정렬 (최신순)
  const sortedClicks = useMemo(() => {
    return [...clicks].sort((a, b) => b.date.localeCompare(a.date));
  }, [clicks]);

  // API 미연동
  if (!isEnabled) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">실적 리포트</h2>
        <p className="mt-2 text-sm text-slate-500">
          쿠팡 파트너스 API를 연동하면 실적 데이터를 확인할 수 있습니다.
        </p>
        <a
          href="/admin/settings"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          설정 페이지로 이동 →
        </a>
      </section>
    );
  }

  // 로딩 중
  if (isLoading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">실적 리포트</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  // 에러
  if (error) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">실적 리포트</h2>
            <p className="mt-1 text-sm text-red-500">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            다시 시도
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">실적 리포트</h2>
          <p className="mt-1 text-xs text-slate-500">
            쿠팡 파트너스 실적 (매일 오후 15:00 업데이트)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {([7, 14, 30] as PeriodDays[]).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                periodDays === days
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {days}일
            </button>
          ))}
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-2 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 메트릭 카드 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 클릭 수 */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              총 클릭
            </span>
            <svg
              className="h-5 w-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatNumber(stats.totalClicks)}</p>
          <p className="mt-1 text-xs text-slate-500">전환율: {stats.conversionRate.toFixed(2)}%</p>
        </div>

        {/* 주문 수 */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-green-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              총 주문
            </span>
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatNumber(stats.totalOrders)}</p>
          <p className="mt-1 text-xs text-slate-500">평균: {formatCurrency(stats.avgOrderValue)}</p>
        </div>

        {/* 취소 수 */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-red-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              총 취소
            </span>
            <svg
              className="h-5 w-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatNumber(stats.totalCancels)}</p>
          <p className="mt-1 text-xs text-slate-500">취소율: {stats.cancelRate.toFixed(2)}%</p>
        </div>

        {/* 수익 */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              총 수익
            </span>
            <svg
              className="h-5 w-5 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(stats.totalCommission)}</p>
          <p className="mt-1 text-xs text-slate-500">GMV: {formatCurrency(stats.totalGmv)}</p>
        </div>
      </div>

      {/* 상세 테이블 */}
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                날짜
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                클릭
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                주문
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                취소
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                수익
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedClicks.slice(0, 10).map((click, idx) => {
              const order = orders.find((o) => o.date === click.date);
              const cancel = cancels.find((c) => c.date === click.date);
              const comm = commission.find((c) => c.date === click.date);

              return (
                <tr key={`${click.date}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {click.date.slice(4, 6)}/{click.date.slice(6, 8)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    {formatNumber(click.clicks ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    {order ? formatNumber(order.orderCnt ?? 0) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    {cancel ? formatNumber(cancel.cancelCnt ?? 0) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    {comm ? formatCurrency(comm.commission ?? 0) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
