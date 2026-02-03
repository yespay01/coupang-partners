"use client";

import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";
import type {
  ReportType,
  ClickReportItem,
  OrderReportItem,
  CancelReportItem,
  CommissionReportItem,
  ReportSummary,
} from "@/types/settings";

/**
 * 날짜를 YYYYMMDD 형식으로 포맷
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * N일 전 날짜 계산
 */
function getDateBefore(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * 날짜별 중복 제거 (같은 날짜가 여러 개 있을 경우 첫 번째만 유지)
 */
function deduplicateByDate<T extends { date: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (!map.has(item.date)) {
      map.set(item.date, item);
    }
  });
  return Array.from(map.values());
}

interface FetchReportParams {
  accessKey: string;
  secretKey: string;
  reportType: ReportType;
  startDate: string;
  endDate: string;
}

async function fetchReport<T>(params: FetchReportParams): Promise<T[]> {
  const response = await fetch("/api/coupang/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("리포트 조회 실패");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || "리포트 조회 실패");
  }

  return result.data;
}

/**
 * 쿠팡 리포트 조회 훅
 * @param days 조회할 기간 (일 수, 기본 30일)
 */
export function useCoupangReports(days: number = 30) {
  const { settings } = useSettingsStore();
  const { coupang } = settings;

  const endDate = formatDate(new Date());
  const startDate = formatDate(getDateBefore(days));

  const isEnabled = coupang.enabled && !!coupang.accessKey && !!coupang.secretKey;

  // 클릭 리포트
  const clicksQuery = useQuery({
    queryKey: ["coupang-reports", "clicks", startDate, endDate],
    queryFn: () =>
      fetchReport<ClickReportItem>({
        accessKey: coupang.accessKey,
        secretKey: coupang.secretKey,
        reportType: "clicks",
        startDate,
        endDate,
      }),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 15, // 15분
    gcTime: 1000 * 60 * 60, // 1시간
    retry: 1,
  });

  // 주문 리포트
  const ordersQuery = useQuery({
    queryKey: ["coupang-reports", "orders", startDate, endDate],
    queryFn: () =>
      fetchReport<OrderReportItem>({
        accessKey: coupang.accessKey,
        secretKey: coupang.secretKey,
        reportType: "orders",
        startDate,
        endDate,
      }),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  // 취소 리포트
  const cancelsQuery = useQuery({
    queryKey: ["coupang-reports", "cancels", startDate, endDate],
    queryFn: () =>
      fetchReport<CancelReportItem>({
        accessKey: coupang.accessKey,
        secretKey: coupang.secretKey,
        reportType: "cancels",
        startDate,
        endDate,
      }),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  // 수익 리포트
  const commissionQuery = useQuery({
    queryKey: ["coupang-reports", "commission", startDate, endDate],
    queryFn: () =>
      fetchReport<CommissionReportItem>({
        accessKey: coupang.accessKey,
        secretKey: coupang.secretKey,
        reportType: "commission",
        startDate,
        endDate,
      }),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });

  // 요약 데이터 계산 (중복 제거 후)
  // commission API가 clicks와 orders 정보를 포함하고 있으므로 이를 우선 사용
  const summary: ReportSummary | null =
    commissionQuery.data && cancelsQuery.data
      ? {
          // commission 데이터에서 clicks/orders 합산
          totalClicks: deduplicateByDate(commissionQuery.data).reduce((sum, item) => sum + ((item as any).clicks ?? 0), 0),
          totalOrders: deduplicateByDate(commissionQuery.data).reduce((sum, item) => sum + ((item as any).orders ?? 0), 0),
          totalGmv: deduplicateByDate(commissionQuery.data).reduce((sum, item) => sum + ((item as any).gmv ?? 0), 0),
          totalCommission: deduplicateByDate(commissionQuery.data).reduce((sum, item) => sum + (item.commission ?? 0), 0),
          totalCancels: deduplicateByDate(cancelsQuery.data).reduce((sum, item) => sum + (item.cancelCnt ?? 0), 0),
          period: { startDate, endDate },
        }
      : null;

  const isLoading =
    clicksQuery.isLoading ||
    ordersQuery.isLoading ||
    cancelsQuery.isLoading ||
    commissionQuery.isLoading;

  const error =
    clicksQuery.error || ordersQuery.error || cancelsQuery.error || commissionQuery.error;

  return {
    // 데이터 (중복 제거)
    clicks: deduplicateByDate(clicksQuery.data ?? []),
    orders: deduplicateByDate(ordersQuery.data ?? []),
    cancels: deduplicateByDate(cancelsQuery.data ?? []),
    commission: deduplicateByDate(commissionQuery.data ?? []),
    summary,

    // 상태
    isEnabled,
    isLoading,
    error: error instanceof Error ? error.message : error ? "리포트 조회 실패" : null,

    // 리프레시
    refetch: () => {
      clicksQuery.refetch();
      ordersQuery.refetch();
      cancelsQuery.refetch();
      commissionQuery.refetch();
    },
  };
}

/**
 * 오늘의 수익 조회 훅
 */
export function useTodayCommission() {
  const { settings } = useSettingsStore();
  const { coupang } = settings;

  const today = formatDate(new Date());
  const isEnabled = coupang.enabled && !!coupang.accessKey && !!coupang.secretKey;

  const query = useQuery({
    queryKey: ["coupang-today-commission", today],
    queryFn: () =>
      fetchReport<CommissionReportItem>({
        accessKey: coupang.accessKey,
        secretKey: coupang.secretKey,
        reportType: "commission",
        startDate: today,
        endDate: today,
      }),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    retry: 1,
  });

  const todayCommission = query.data?.[0]?.commission ?? 0;

  return {
    todayCommission,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
