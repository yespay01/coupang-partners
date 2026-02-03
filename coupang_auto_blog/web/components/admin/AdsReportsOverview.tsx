"use client";

import { useMemo, useState } from "react";
import { useCoupangAds } from "@/hooks/useCoupangAds";

/**
 * 숫자를 원화 형식으로 포맷
 */
function formatCurrency(value: number): string {
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
  return value.toLocaleString();
}

type PeriodDays = 7 | 14;

/**
 * 광고 배너 리포트 대시보드
 * - 노출/클릭 수
 * - 주문/취소 정보
 * - eCPM
 * - 수익 정보
 */
export function AdsReportsOverview() {
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);

  const {
    impressionClick,
    orders,
    cancels,
    performance,
    commission,
    summary,
    isEnabled,
    isLoading,
    error,
    refetch,
  } = useCoupangAds(periodDays);

  // 일별 집계 데이터
  const dailyStats = useMemo(() => {
    // 날짜별 맵 생성
    const dateMap = new Map<
      string,
      {
        impressions: number;
        clicks: number;
        orders: number;
        cancels: number;
        commission: number;
        ecpm: number;
      }
    >();

    // impression-click 집계
    impressionClick.forEach((item) => {
      const existing = dateMap.get(item.date) || {
        impressions: 0,
        clicks: 0,
        orders: 0,
        cancels: 0,
        commission: 0,
        ecpm: 0,
      };
      existing.impressions += item.impression ?? 0;
      existing.clicks += item.click ?? 0;
      dateMap.set(item.date, existing);
    });

    // orders 집계
    orders.forEach((item) => {
      const existing = dateMap.get(item.date) || {
        impressions: 0,
        clicks: 0,
        orders: 0,
        cancels: 0,
        commission: 0,
        ecpm: 0,
      };
      existing.orders += 1;
      dateMap.set(item.date, existing);
    });

    // cancels 집계
    cancels.forEach((item) => {
      const existing = dateMap.get(item.date) || {
        impressions: 0,
        clicks: 0,
        orders: 0,
        cancels: 0,
        commission: 0,
        ecpm: 0,
      };
      existing.cancels += 1;
      dateMap.set(item.date, existing);
    });

    // commission 집계
    commission.forEach((item) => {
      const existing = dateMap.get(item.date) || {
        impressions: 0,
        clicks: 0,
        orders: 0,
        cancels: 0,
        commission: 0,
        ecpm: 0,
      };
      existing.commission += item.commission ?? 0;
      dateMap.set(item.date, existing);
    });

    // performance (eCPM) 집계
    performance.forEach((item) => {
      const dateStr = String(item.date);
      const existing = dateMap.get(dateStr) || {
        impressions: 0,
        clicks: 0,
        orders: 0,
        cancels: 0,
        commission: 0,
        ecpm: 0,
      };
      existing.ecpm = item.ecpm ?? 0;
      dateMap.set(dateStr, existing);
    });

    // 날짜순 정렬 (최신순)
    return Array.from(dateMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [impressionClick, orders, cancels, commission, performance]);

  // API 미연동
  if (!isEnabled) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          광고 배너 리포트
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          쿠팡 파트너스 API를 연동하면 광고 배너 실적 데이터를 확인할 수
          있습니다.
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
        <h2 className="text-xl font-semibold text-slate-900">
          광고 배너 리포트
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-slate-100"
            />
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
            <h2 className="text-xl font-semibold text-slate-900">
              광고 배너 리포트
            </h2>
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
          <h2 className="text-xl font-semibold text-slate-900">
            광고 배너 리포트
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            카테고리 & 다이나믹 배너 (최대 14일 조회 가능)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {([7, 14] as PeriodDays[]).map((days) => (
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
        {/* 노출 수 */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              총 노출
            </span>
            <svg
              className="h-5 w-5 text-indigo-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatNumber(summary.totalImpressions)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            클릭: {formatNumber(summary.totalClicks)} (
            {summary.ctr.toFixed(2)}%)
          </p>
        </div>

        {/* 광고 주문 */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-teal-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              광고 주문
            </span>
            <svg
              className="h-5 w-5 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatNumber(summary.totalOrders)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            취소: {formatNumber(summary.totalCancels)}
          </p>
        </div>

        {/* eCPM */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              평균 eCPM
            </span>
            <svg
              className="h-5 w-5 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatCurrency(summary.avgEcpm)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            노출 1,000회당 수익
          </p>
        </div>

        {/* 광고 수익 */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              광고 수익
            </span>
            <svg
              className="h-5 w-5 text-emerald-500"
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
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatCurrency(summary.totalCommission)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            GMV: {formatCurrency(summary.totalGmv)}
          </p>
        </div>
      </div>

      {/* 일별 상세 테이블 */}
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                날짜
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                노출
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                클릭
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                주문
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                eCPM
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                수익
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {dailyStats.slice(0, 10).map((stat) => {
              const ctr =
                stat.impressions > 0
                  ? (stat.clicks / stat.impressions) * 100
                  : 0;

              return (
                <tr key={stat.date} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {stat.date.slice(4, 6)}/{stat.date.slice(6, 8)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    {formatNumber(stat.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    {formatNumber(stat.clicks)}
                    <span className="ml-1 text-xs text-slate-500">
                      ({ctr.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    {formatNumber(stat.orders)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-amber-600">
                    {stat.ecpm > 0 ? formatCurrency(stat.ecpm) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                    {stat.commission > 0
                      ? formatCurrency(stat.commission)
                      : "-"}
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
