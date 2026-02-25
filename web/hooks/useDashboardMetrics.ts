"use client";

import { useMemo } from "react";
import { useCoupangReports } from "./useCoupangReports";

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
 * 퍼센트 포맷
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * 숫자 포맷 (콤마)
 */
function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * 이번주 시작/종료 날짜 계산
 */
function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (일요일) ~ 6 (토요일)

  // 이번주 월요일
  const monday = new Date(now);
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 일요일이면 지난주 월요일
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  // 이번주 일요일
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * 지난주 시작/종료 날짜 계산
 */
function getLastWeekRange(): { start: Date; end: Date } {
  const thisWeek = getThisWeekRange();
  const lastWeekEnd = new Date(thisWeek.start);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
  lastWeekStart.setHours(0, 0, 0, 0);

  return { start: lastWeekStart, end: lastWeekEnd };
}

/**
 * 날짜를 YYYYMMDD 형식으로 포맷
 */
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  trend?: string;
};

/**
 * 대시보드 메트릭스 계산 훅
 */
export function useDashboardMetrics() {
  // 최근 30일 데이터 가져오기
  const { commission, clicks, orders, isEnabled, isLoading, error } = useCoupangReports(30);

  const metrics = useMemo((): DashboardMetric[] => {
    if (!isEnabled) {
      return [
        { id: "week-commission", label: "이번주 커미션", value: "-", trend: "API 미연동" },
        { id: "conversion", label: "클릭 → 주문 전환율", value: "-", trend: "API 미연동" },
        { id: "today-clicks", label: "금일 클릭 수", value: "-", trend: "API 미연동" },
      ];
    }

    if (isLoading) {
      return [
        { id: "week-commission", label: "이번주 커미션", value: "...", trend: "로딩 중" },
        { id: "conversion", label: "클릭 → 주문 전환율", value: "...", trend: "로딩 중" },
        { id: "today-clicks", label: "금일 클릭 수", value: "...", trend: "로딩 중" },
      ];
    }

    if (error || !commission.length || !clicks.length || !orders.length) {
      return [
        { id: "week-commission", label: "이번주 커미션", value: "₩0" },
        { id: "conversion", label: "클릭 → 주문 전환율", value: "0.0%" },
        { id: "today-clicks", label: "금일 클릭 수", value: "0" },
      ];
    }

    // 오늘 날짜
    const today = formatDateYYYYMMDD(new Date());

    // 이번주/지난주 범위
    const thisWeek = getThisWeekRange();
    const lastWeek = getLastWeekRange();
    const thisWeekStart = formatDateYYYYMMDD(thisWeek.start);
    const thisWeekEnd = formatDateYYYYMMDD(thisWeek.end);
    const lastWeekStart = formatDateYYYYMMDD(lastWeek.start);
    const lastWeekEnd = formatDateYYYYMMDD(lastWeek.end);

    // 1. 이번주 커미션
    const thisWeekCommission = commission
      .filter((item) => item.date >= thisWeekStart && item.date <= thisWeekEnd)
      .reduce((sum, item) => sum + item.commission, 0);

    // 지난주 커미션 (WoW 계산용)
    const lastWeekCommission = commission
      .filter((item) => item.date >= lastWeekStart && item.date <= lastWeekEnd)
      .reduce((sum, item) => sum + item.commission, 0);

    const weekCommissionChange =
      lastWeekCommission > 0
        ? ((thisWeekCommission - lastWeekCommission) / lastWeekCommission) * 100
        : 0;

    // 2. 금일 클릭 수
    const todayClicks = clicks
      .filter((item) => item.date === today)
      .reduce((sum, item) => sum + item.clicks, 0);

    // 어제 클릭 수 (변화율 계산용)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = formatDateYYYYMMDD(yesterday);
    const yesterdayClicks = clicks
      .filter((item) => item.date === yesterdayDate)
      .reduce((sum, item) => sum + item.clicks, 0);

    const clicksChange =
      yesterdayClicks > 0 ? ((todayClicks - yesterdayClicks) / yesterdayClicks) * 100 : 0;

    // 3. 클릭 → 주문 전환율 (최근 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoDate = formatDateYYYYMMDD(sevenDaysAgo);

    const recentClicks = clicks
      .filter((item) => item.date >= sevenDaysAgoDate && item.date <= today)
      .reduce((sum, item) => sum + item.clicks, 0);

    const recentOrders = orders
      .filter((item) => item.date >= sevenDaysAgoDate && item.date <= today)
      .reduce((sum, item) => sum + item.orderCnt, 0);

    const conversionRate = recentClicks > 0 ? (recentOrders / recentClicks) * 100 : 0;

    // 이전 7일 전환율 (변화 계산용)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoDate = formatDateYYYYMMDD(fourteenDaysAgo);

    const prevClicks = clicks
      .filter((item) => item.date >= fourteenDaysAgoDate && item.date < sevenDaysAgoDate)
      .reduce((sum, item) => sum + item.clicks, 0);

    const prevOrders = orders
      .filter((item) => item.date >= fourteenDaysAgoDate && item.date < sevenDaysAgoDate)
      .reduce((sum, item) => sum + item.orderCnt, 0);

    const prevConversionRate = prevClicks > 0 ? (prevOrders / prevClicks) * 100 : 0;
    const conversionChange = conversionRate - prevConversionRate;

    return [
      {
        id: "week-commission",
        label: "이번주 커미션",
        value: formatCurrency(thisWeekCommission),
        trend:
          weekCommissionChange !== 0
            ? `${weekCommissionChange > 0 ? "+" : ""}${formatPercent(weekCommissionChange)} WoW`
            : undefined,
      },
      {
        id: "conversion",
        label: "클릭 → 주문 전환율",
        value: formatPercent(conversionRate),
        trend:
          conversionChange !== 0
            ? `${conversionChange > 0 ? "+" : ""}${conversionChange.toFixed(1)}pp`
            : undefined,
      },
      {
        id: "today-clicks",
        label: "금일 클릭 수",
        value: formatNumber(todayClicks),
        trend:
          clicksChange !== 0
            ? `${clicksChange > 0 ? "+" : ""}${formatPercent(clicksChange)} DoD`
            : undefined,
      },
    ];
  }, [commission, clicks, orders, isEnabled, isLoading, error]);

  return {
    metrics,
    isEnabled,
    isLoading,
    error,
  };
}
