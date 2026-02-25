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
 * 날짜 문자열을 MM/DD 형식으로 포맷
 */
function formatDateShort(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${month}/${day}`;
}

type PeriodDays = 7 | 14 | 30;

/**
 * 수익 추이 차트 - 실제 쿠팡 파트너스 데이터 연동
 */
export function EarningsChart() {
  const [periodDays, setPeriodDays] = useState<PeriodDays>(7);

  // 설정을 먼저 로드 (Firestore에서)
  const { isLoading: isSettingsLoading } = useSystemSettings();

  const { commission, clicks, orders, summary, isEnabled, isLoading: isReportsLoading, error, refetch } =
    useCoupangReports(periodDays);

  const isLoading = isSettingsLoading || isReportsLoading;

  // 차트 데이터 계산 (최근 N일)
  const chartData = useMemo(() => {
    // 오늘부터 N일 전까지의 날짜 배열 생성
    const dates: string[] = [];
    const today = new Date();

    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dates.push(`${year}${month}${day}`);
    }

    // 날짜별 commission 맵 생성
    const commissionMap = new Map<string, number>();
    commission.forEach((item) => {
      commissionMap.set(item.date, item.commission);
    });

    // 모든 날짜에 대한 데이터 생성 (없으면 0)
    const dataPoints = dates.map((date) => ({
      date,
      dateLabel: formatDateShort(date),
      value: commissionMap.get(date) ?? 0,
    }));

    // 최대값 계산 (차트 높이 비율용)
    const maxValue = Math.max(...dataPoints.map((item) => item.value), 1);

    return dataPoints.map((item) => ({
      ...item,
      percentage: item.value > 0 ? (item.value / maxValue) * 100 : 0, // 0이면 0%
    }));
  }, [commission, periodDays]);

  // 통계 계산
  const stats = useMemo(() => {
    const totalClicks = summary?.totalClicks ?? 0;
    const totalCommission = summary?.totalCommission ?? 0;

    return {
      avgCommission: chartData.length > 0 ? totalCommission / chartData.length : 0,
      revenuePerClick: totalClicks > 0 ? totalCommission / totalClicks : 0,
      totalOrders: summary?.totalOrders ?? 0,
      totalGmv: summary?.totalGmv ?? 0,
    };
  }, [chartData.length, summary]);

  // API 연동 안됨
  if (!isEnabled) {
    return (
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">수익 추이</h2>
            <p className="mt-1 text-xs text-slate-500">
              쿠팡 파트너스 API를 연동하면 실제 수익 데이터를 확인할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="mt-6 flex h-40 items-center justify-center rounded-2xl bg-slate-50">
          <div className="text-center">
            <p className="text-sm text-slate-500">쿠팡 API 연동 필요</p>
            <a
              href="/admin/settings"
              className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
            >
              설정 페이지로 이동
            </a>
          </div>
        </div>
      </article>
    );
  }

  // 로딩 중
  if (isLoading) {
    return (
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">수익 추이</h2>
            <p className="mt-1 text-xs text-slate-500">데이터를 불러오는 중...</p>
          </div>
        </div>
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-100" />
      </article>
    );
  }

  // 에러
  if (error) {
    return (
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">수익 추이</h2>
            <p className="mt-1 text-xs text-red-500">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            다시 시도
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">수익 추이</h2>
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
        </div>
      </div>

      {/* 차트 */}
      <div className="mt-6 flex gap-4">
        {/* Y축 레이블 (금액) */}
        {chartData.length > 0 && (
          <div className="flex h-48 flex-col justify-between py-2 text-xs text-slate-500">
            <div className="text-right">{formatCurrency(Math.max(...chartData.map(d => d.value)))}</div>
            <div className="text-right">{formatCurrency(Math.max(...chartData.map(d => d.value)) / 2)}</div>
            <div className="text-right">₩0</div>
          </div>
        )}

        {/* 차트 영역 */}
        <div className="flex-1">
          <div className="h-48 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
            {chartData.length > 0 ? (
              <div className="flex h-full items-end justify-center gap-2">
                {chartData.map((item) => (
                  <div
                    key={item.date}
                    className="group relative flex h-full flex-col justify-end"
                    style={{ width: `${100 / chartData.length - 2}%`, maxWidth: "40px" }}
                  >
                    <div
                      style={{ height: item.percentage > 0 ? `${item.percentage}%` : "0" }}
                      className="w-full rounded-t-md bg-sky-500 transition-all group-hover:bg-sky-600"
                    />
                    {/* 툴팁 */}
                    <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
                      <div className="font-medium">{item.dateLabel}</div>
                      <div className="text-sky-200">{formatCurrency(item.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                데이터가 없습니다
              </div>
            )}
          </div>

          {/* X축 레이블 (날짜) */}
          {chartData.length > 0 && (
            <div className="mt-2 flex justify-center gap-2 text-[10px] text-slate-500">
              {chartData.map((item, idx) => {
                // 7일: 모두 표시, 14일: 짝수만, 30일: 5일마다
                const shouldShow =
                  periodDays === 7 ||
                  (periodDays === 14 && idx % 2 === 0) ||
                  (periodDays === 30 && idx % 5 === 0);

                return (
                  <div
                    key={item.date}
                    className="text-center"
                    style={{ width: `${100 / chartData.length - 2}%`, maxWidth: "40px" }}
                  >
                    {shouldShow ? item.dateLabel : ""}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 통계 */}
      <dl className="mt-6 grid grid-cols-2 gap-4 text-xs text-slate-600 sm:grid-cols-4">
        <div>
          <dt className="font-semibold text-slate-500">총 수익</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">
            {formatCurrency(summary?.totalCommission ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">평균 수익/일</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">
            {formatCurrency(stats.avgCommission)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">총 클릭</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">
            {(summary?.totalClicks ?? 0).toLocaleString()}회
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">클릭당 수익</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900">
            {formatCurrency(stats.revenuePerClick)}
          </dd>
        </div>
      </dl>

      {/* 추가 정보 */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <div className="flex gap-4">
          <span>
            주문: <strong className="text-slate-700">{stats.totalOrders.toLocaleString()}건</strong>
          </span>
          <span>
            매출: <strong className="text-slate-700">{formatCurrency(stats.totalGmv)}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="font-medium text-blue-600 hover:underline"
        >
          새로고침
        </button>
      </div>
    </article>
  );
}
