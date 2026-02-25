import { useQuery } from "@tanstack/react-query";
import { useSettingsStore } from "@/stores/settingsStore";

/**
 * 광고 배너 - 노출/클릭 데이터
 */
export interface AdsImpressionClick {
  date: string;
  hour: string;
  trackingCode: string;
  subId: string;
  pageId: string;
  subParam: string;
  widgetId: number;
  widgetType: "STATIC" | "DYNAMIC";
  request: number;
  response: number;
  impression: number;
  click: number;
}

/**
 * 광고 배너 - 주문 데이터
 */
export interface AdsOrder {
  date: string;
  trackingCode: string;
  subId: string;
  pageId: string;
  subParam: string;
  widgetId: number;
  widgetType: "STATIC" | "DYNAMIC";
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  gmv: number;
  commissionRate: number;
  commission: number;
}

/**
 * 광고 배너 - 취소 데이터
 */
export interface AdsCancel {
  orderDate: string;
  date: string;
  trackingCode: string;
  subId: string;
  pageId: string;
  subParam: string;
  widgetId: number;
  widgetType: "STATIC" | "DYNAMIC";
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  gmv: number;
  commissionRate: number;
  commission: number;
}

/**
 * 광고 배너 - eCPM 데이터
 */
export interface AdsPerformance {
  date: number;
  trackingCode: string;
  subId: string;
  pageId: string;
  ecpm: number;
}

/**
 * 광고 배너 - 수익 데이터
 */
export interface AdsCommission {
  date: string;
  trackingCode: string;
  subId: string;
  pageId: string;
  subParam: string;
  widgetId: number;
  widgetType: "STATIC" | "DYNAMIC";
  commission: number;
}

/**
 * 광고 배너 - 집계 데이터
 */
export interface AdsSummary {
  totalImpressions: number;
  totalClicks: number;
  totalOrders: number;
  totalCancels: number;
  totalCommission: number;
  totalGmv: number;
  avgEcpm: number;
  ctr: number; // Click Through Rate
}

/**
 * 날짜 포맷팅: Date -> YYYYMMDD
 */
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 광고 배너 리포트 조회 (최대 14일)
 */
async function fetchAdsReport<T>(
  accessKey: string,
  secretKey: string,
  endpoint: string,
  days: number
): Promise<T[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days + 1);

  const response = await fetch("/api/coupang/ads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessKey,
      secretKey,
      endpoint,
      startDate: formatDateYYYYMMDD(startDate),
      endDate: formatDateYYYYMMDD(endDate),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "광고 리포트 조회 실패");
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || "광고 리포트 조회 실패");
  }

  return result.data;
}

/**
 * 광고 배너 리포트 데이터를 조회하는 React Query 훅 (최대 14일)
 */
export function useCoupangAds(days: 7 | 14 = 7) {
  const { settings } = useSettingsStore();
  const { coupang } = settings;

  const isEnabled = coupang.enabled && !!coupang.accessKey && !!coupang.secretKey;

  // impression-click
  const {
    data: impressionClick = [],
    isLoading: isImpressionClickLoading,
    error: impressionClickError,
    refetch: refetchImpressionClick,
  } = useQuery<AdsImpressionClick[]>({
    queryKey: ["coupang", "ads", "impression-click", days],
    queryFn: () => fetchAdsReport(coupang.accessKey, coupang.secretKey, "impression-click", days),
    enabled: isEnabled,
    staleTime: 15 * 60 * 1000, // 15분
    refetchOnWindowFocus: false,
  });

  // orders
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery<AdsOrder[]>({
    queryKey: ["coupang", "ads", "orders", days],
    queryFn: () => fetchAdsReport(coupang.accessKey, coupang.secretKey, "orders", days),
    enabled: isEnabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // cancels
  const {
    data: cancels = [],
    isLoading: isCancelsLoading,
    error: cancelsError,
    refetch: refetchCancels,
  } = useQuery<AdsCancel[]>({
    queryKey: ["coupang", "ads", "cancels", days],
    queryFn: () => fetchAdsReport(coupang.accessKey, coupang.secretKey, "cancels", days),
    enabled: isEnabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // performance (eCPM)
  const {
    data: performance = [],
    isLoading: isPerformanceLoading,
    error: performanceError,
    refetch: refetchPerformance,
  } = useQuery<AdsPerformance[]>({
    queryKey: ["coupang", "ads", "performance", days],
    queryFn: () => fetchAdsReport(coupang.accessKey, coupang.secretKey, "performance", days),
    enabled: isEnabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // commission
  const {
    data: commission = [],
    isLoading: isCommissionLoading,
    error: commissionError,
    refetch: refetchCommission,
  } = useQuery<AdsCommission[]>({
    queryKey: ["coupang", "ads", "commission", days],
    queryFn: () => fetchAdsReport(coupang.accessKey, coupang.secretKey, "commission", days),
    enabled: isEnabled,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 집계 계산
  const summary: AdsSummary = {
    totalImpressions: impressionClick.reduce(
      (sum, item) => sum + (item.impression ?? 0),
      0
    ),
    totalClicks: impressionClick.reduce(
      (sum, item) => sum + (item.click ?? 0),
      0
    ),
    totalOrders: orders.length,
    totalCancels: cancels.length,
    totalCommission: commission.reduce(
      (sum, item) => sum + (item.commission ?? 0),
      0
    ),
    totalGmv: orders.reduce((sum, item) => sum + (item.gmv ?? 0), 0),
    avgEcpm:
      performance.length > 0
        ? performance.reduce((sum, item) => sum + (item.ecpm ?? 0), 0) /
          performance.length
        : 0,
    ctr:
      impressionClick.reduce((sum, item) => sum + (item.impression ?? 0), 0) >
      0
        ? (impressionClick.reduce((sum, item) => sum + (item.click ?? 0), 0) /
            impressionClick.reduce(
              (sum, item) => sum + (item.impression ?? 0),
              0
            )) *
          100
        : 0,
  };

  const isLoading =
    isImpressionClickLoading ||
    isOrdersLoading ||
    isCancelsLoading ||
    isPerformanceLoading ||
    isCommissionLoading;

  const error =
    impressionClickError?.message ||
    ordersError?.message ||
    cancelsError?.message ||
    performanceError?.message ||
    commissionError?.message ||
    null;

  const refetch = () => {
    refetchImpressionClick();
    refetchOrders();
    refetchCancels();
    refetchPerformance();
    refetchCommission();
  };

  return {
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
  };
}
