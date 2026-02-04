import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export type EarningsMetric = {
  id?: string;
  label: string;
  value: string;
  trend?: string;
};

export type WorkflowItem = {
  id?: string;
  productId?: string;
  product: string;
  author: string;
  status: "draft" | "needs_revision" | "approved" | "published";
  updatedAt: string;
  createdAt?: string;
  content?: string;
  toneScore?: number;
  charCount?: number;
  slug?: string;
  publishedAt?: string;
  media?: Array<{ type: string; url: string; alt?: string }>;
};

export type LogEntry = {
  id?: string;
  level: "info" | "warn" | "error";
  message: string;
  createdAt: string;
  context: string;
  payload?: Record<string, unknown>;
};

export type DashboardData = {
  metrics: EarningsMetric[];
  workflow: WorkflowItem[];
  logs: LogEntry[];
  isLoading: boolean;
  reviewLimit: number;
  setReviewLimit: (nextLimit: number) => void;
  hasNextReviewPage: boolean;
  hasPrevReviewPage: boolean;
  goToNextReviewPage: () => Promise<void>;
  goToPrevReviewPage: () => Promise<void>;
  reviewPageIndex: number;
  totalReviewCount: number | null;
  hasNextLogPage: boolean;
  hasPrevLogPage: boolean;
  goToNextLogPage: () => Promise<void>;
  goToPrevLogPage: () => Promise<void>;
  logPageIndex: number;
  totalLogCount: number | null;
  refreshReviews: () => Promise<void>;
  refreshLogs: () => Promise<void>;
};

const FALLBACK_METRICS: EarningsMetric[] = [
  { label: "이번주 커미션", value: "₩184,500", trend: "+12% WoW" },
  { label: "클릭 → 주문 전환율", value: "3.4%", trend: "+0.6pp" },
  { label: "금일 클릭 수", value: "1,248", trend: "-4% QoQ" },
];

const FALLBACK_WORKFLOW: WorkflowItem[] = [
  {
    id: "fallback-1",
    productId: "prod_fallback_1",
    product: "샤오미 무선 청소기 G11",
    author: "auto-bot-4",
    status: "needs_revision",
    updatedAt: "2024-07-14T08:42:00+09:00",
    createdAt: "2024-07-14T08:00:00+09:00",
    toneScore: 0.42,
    charCount: 128,
    content: "먼지통 청소와 배터리 관리 팁을 추가하면 더 완성도 있는 리뷰가 될 것 같습니다.",
  },
  {
    id: "fallback-2",
    productId: "prod_fallback_2",
    product: "삼성 비스포크 냉장고 700L",
    author: "auto-bot-2",
    status: "draft",
    updatedAt: "2024-07-14T08:10:00+09:00",
    createdAt: "2024-07-14T07:30:00+09:00",
    toneScore: 0.58,
    charCount: 142,
    content: "용량 대비 전력 효율을 강조했고, 내부 수납 구성에 대한 한줄 요약까지 준비되어 있습니다.",
  },
  {
    id: "fallback-3",
    productId: "prod_fallback_3",
    product: "필립스 에어프라이어 5.5L",
    author: "manager-jy",
    status: "approved",
    updatedAt: "2024-07-14T07:55:00+09:00",
    createdAt: "2024-07-14T07:10:00+09:00",
    toneScore: 0.76,
    charCount: 151,
    content: "에어프라이어 기본 온도 세팅과 예열 팁을 담아 초보자도 이해하기 쉽게 정리했습니다.",
  },
  {
    id: "fallback-4",
    productId: "prod_fallback_4",
    product: "로지텍 MX Keys S",
    author: "manager-hs",
    status: "published",
    updatedAt: "2024-07-14T07:10:00+09:00",
    createdAt: "2024-07-14T06:40:00+09:00",
    toneScore: 0.83,
    charCount: 137,
    content: "스위치 감도와 백라이트 반응 속도를 비교해주어 구매 전 고민 포인트를 해소해줍니다.",
  },
];

const FALLBACK_LOGS: LogEntry[] = [
  {
    level: "info",
    message: "review_retry_queue 작업 처리 완료",
    createdAt: "2024-07-14 07:58",
    context: "productId=prod_7831, attempt=2",
  },
  {
    level: "warn",
    message: "톤 점수 0.38 → 재생성 큐 등록",
    createdAt: "2024-07-14 07:47",
    context: "productId=prod_5421",
  },
  {
    level: "error",
    message: "Slack Webhook 응답 지연으로 재시도",
    createdAt: "2024-07-14 07:40",
    context: "retryAttempt=1",
  },
];

const REVIEW_STATUSES = ["draft", "needs_revision", "approved", "published"] as const;
const LOG_LEVELS = ["info", "warn", "error"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];
type LogLevel = (typeof LOG_LEVELS)[number];
type DatePreset = "all" | "24h" | "7d" | "30d";

type DashboardOptions = {
  defaultReviewLimit?: number;
  onReviewPageChange?: (index: number) => void;
  onLogPageChange?: (index: number) => void;
  reviewStatusFilter?: Record<ReviewStatus, boolean>;
  reviewDateRange?: DatePreset;
  logLevelFilter?: Record<LogLevel, boolean>;
  logDateRange?: DatePreset;
};

export function useAdminDashboardData(options?: DashboardOptions): DashboardData {
  const { status } = useAuth();

  const [metrics, setMetrics] = useState<EarningsMetric[]>(FALLBACK_METRICS);
  const [workflow, setWorkflow] = useState<WorkflowItem[]>(FALLBACK_WORKFLOW);
  const [logs, setLogs] = useState<LogEntry[]>(FALLBACK_LOGS);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewLimit, setReviewLimitState] = useState(options?.defaultReviewLimit ?? 12);
  const [totalReviewCount, setTotalReviewCount] = useState<number | null>(null);
  const [hasNextReviewPage, setHasNextReviewPage] = useState(false);
  const [hasPrevReviewPage, setHasPrevReviewPage] = useState(false);
  const [reviewPageIndex, setReviewPageIndex] = useState(0);
  const [totalLogCount, setTotalLogCount] = useState<number | null>(null);
  const [hasNextLogPage, setHasNextLogPage] = useState(false);
  const [hasPrevLogPage, setHasPrevLogPage] = useState(false);
  const [logPageIndex, setLogPageIndex] = useState(0);

  const setReviewLimit = useCallback((nextLimit: number) => {
    setReviewLimitState((prev) => {
      if (nextLimit === prev) {
        return prev;
      }
      return nextLimit;
    });
  }, []);

  // TODO: API 호출로 데이터 로드
  // 현재는 Fallback 데이터만 사용
  useEffect(() => {
    if (status === "authenticated") {
      setMetrics(FALLBACK_METRICS);
      setWorkflow(FALLBACK_WORKFLOW);
      setLogs(FALLBACK_LOGS);
    }
  }, [status]);

  const goToNextReviewPage = useCallback(async () => {
    // TODO: API 호출
    console.log("다음 페이지로 이동 (미구현)");
  }, []);

  const goToPrevReviewPage = useCallback(async () => {
    // TODO: API 호출
    console.log("이전 페이지로 이동 (미구현)");
  }, []);

  const goToNextLogPage = useCallback(async () => {
    // TODO: API 호출
    console.log("다음 로그 페이지로 이동 (미구현)");
  }, []);

  const goToPrevLogPage = useCallback(async () => {
    // TODO: API 호출
    console.log("이전 로그 페이지로 이동 (미구현)");
  }, []);

  const refreshReviews = useCallback(async () => {
    // TODO: API 호출
    console.log("리뷰 새로고침 (미구현)");
  }, []);

  const refreshLogs = useCallback(async () => {
    // TODO: API 호출
    console.log("로그 새로고침 (미구현)");
  }, []);

  return useMemo(
    () => ({
      metrics,
      workflow,
      logs,
      isLoading,
      reviewLimit,
      setReviewLimit,
      hasNextReviewPage,
      hasPrevReviewPage,
      goToNextReviewPage,
      goToPrevReviewPage,
      reviewPageIndex,
      totalReviewCount,
      hasNextLogPage,
      hasPrevLogPage,
      goToNextLogPage,
      goToPrevLogPage,
      logPageIndex,
      totalLogCount,
      refreshReviews,
      refreshLogs,
    }),
    [
      metrics,
      workflow,
      logs,
      isLoading,
      reviewLimit,
      setReviewLimit,
      hasNextReviewPage,
      hasPrevReviewPage,
      goToNextReviewPage,
      goToPrevReviewPage,
      reviewPageIndex,
      totalReviewCount,
      hasNextLogPage,
      hasPrevLogPage,
      goToNextLogPage,
      goToPrevLogPage,
      logPageIndex,
      totalLogCount,
      refreshReviews,
      refreshLogs,
    ],
  );
}
