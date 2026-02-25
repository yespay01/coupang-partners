/**
 * Hooks Index
 * 모든 custom hooks를 한 곳에서 export
 */

// React Query Hooks
export {
  useReviews,
  useReview,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
  useUpdateReviewStatus,
  reviewKeys,
} from "./useReviews";

// 기존 Hooks (하위 호환성)
export { useAdminDashboardData } from "./useAdminDashboardData";
export type { DashboardData, EarningsMetric, WorkflowItem, LogEntry } from "./useAdminDashboardData";

// 시스템 설정 Hooks
export {
  useSystemSettings,
  useSettingsValidation,
  useCoupangConnectionTest,
} from "./useSystemSettings";

// 쿠팡 리포트 Hooks
export { useCoupangReports, useTodayCommission } from "./useCoupangReports";

// 대시보드 메트릭스 Hooks
export { useDashboardMetrics } from "./useDashboardMetrics";
export type { DashboardMetric } from "./useDashboardMetrics";

// 광고 배너 Hooks
export { useCoupangAds } from "./useCoupangAds";
export type {
  AdsImpressionClick,
  AdsOrder,
  AdsCancel,
  AdsPerformance,
  AdsCommission,
  AdsSummary,
} from "./useCoupangAds";

// 상품 Hooks
export { useProducts, useProductStats } from "./useProducts";
