/**
 * 관리자 대시보드 상수 및 설정
 */

import type { ReviewStatus, LogLevel } from "@/types";

// ==================== Status Badges ====================

export const statusBadgeClass: Record<ReviewStatus, string> = {
  draft: "bg-sky-100 text-sky-700 border-sky-200",
  needs_revision: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  published: "bg-slate-100 text-slate-700 border-slate-200",
};

export const statusLabel: Record<ReviewStatus, string> = {
  draft: "초안",
  needs_revision: "재검수 필요",
  approved: "승인 완료",
  published: "게시 완료",
};

export const workflowStatuses: ReviewStatus[] = ["draft", "needs_revision", "approved", "published"];

// ==================== Log Styles ====================

export const logToneClass: Record<LogLevel, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
};

export const logLevelOrder: LogLevel[] = ["info", "warn", "error"];

// ==================== Workflow Actions ====================

export type ActionTone = "primary" | "secondary" | "danger";

export type WorkflowAction = {
  label: string;
  nextStatus: ReviewStatus;
  tone: ActionTone;
};

export const workflowActions: Record<ReviewStatus, WorkflowAction[]> = {
  draft: [
    { label: "승인", nextStatus: "approved", tone: "primary" },
    { label: "재검수 요청", nextStatus: "needs_revision", tone: "secondary" },
  ],
  needs_revision: [
    { label: "재승인", nextStatus: "approved", tone: "primary" },
    { label: "임시 저장", nextStatus: "draft", tone: "secondary" },
  ],
  approved: [
    { label: "게시", nextStatus: "published", tone: "primary" },
    { label: "재검수 요청", nextStatus: "needs_revision", tone: "secondary" },
  ],
  published: [
    { label: "승인 단계로 되돌리기", nextStatus: "approved", tone: "secondary" },
  ],
};

export const actionToneClass: Record<ActionTone, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "border border-slate-200 text-slate-700 hover:bg-slate-100",
  danger: "border border-rose-200 text-rose-600 hover:bg-rose-50",
};

// ==================== Date Filters ====================

export const dateOptions = [
  { value: "all", label: "전체" },
  { value: "24h", label: "24시간" },
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
] as const;

export type DateFilter = (typeof dateOptions)[number]["value"];

export const dateDurations: Record<"24h" | "7d" | "30d", number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// ==================== Page Headers ====================

export type DashboardView = "overview" | "reviews" | "logs";

export const headerDefaults: Record<DashboardView, { title: string; description: string }> = {
  overview: {
    title: "쿠팡 파트너스 자동화 대시보드",
    description: "수집–생성–검수–발행까지 이어지는 AI 리뷰 파이프라인과 로그를 한 화면에서 점검하세요.",
  },
  reviews: {
    title: "리뷰 승인 워크플로우",
    description: "상태, 검색, 기간 필터로 AI 리뷰 초안을 검토하고 단건/일괄 승인 흐름을 관리합니다.",
  },
  logs: {
    title: "자동화 로그 탐색",
    description: "Cloud Functions, Firestore Trigger, Slack 알림 로그를 검색·필터링하며 안정성을 모니터링합니다.",
  },
};

// ==================== Automation Info ====================

export const automationTimeline = [
  { time: "02:00", title: "상품 자동 수집", description: "쿠팡 API에서 신규 상품 메타 데이터를 가져옵니다." },
  { time: "02:10", title: "AI 후기 생성", description: "OpenAI를 호출해 초안을 만들고 품질 규칙을 통과한 것만 저장합니다." },
  { time: "09:10", title: "승인 즉시 게시", description: "관리자 승인이 떨어지면 ISR 페이지와 sitemap을 자동 갱신합니다." },
  { time: "18:00", title: "수익 통계 갱신", description: "클릭/주문 데이터를 Firestore에 집계하고 로그로 추적합니다." },
];

export const systemFeatures = [
  { icon: "🔄", label: "자동 수집 & 재시도 큐", description: "상품 수집 실패 시 자동으로 재시도합니다." },
  { icon: "🤖", label: "OpenAI 품질 규칙", description: "톤 점수, 글자 수 검증을 통과한 리뷰만 저장됩니다." },
  { icon: "📊", label: "수익 대시보드", description: "클릭, 주문, 커미션을 실시간으로 추적합니다." },
  { icon: "🔔", label: "Slack 알림", description: "오류 발생 시 즉시 Slack으로 알림을 받습니다." },
];

// ==================== Utilities ====================

export function formatKoreanDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
