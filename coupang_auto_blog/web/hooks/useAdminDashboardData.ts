import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  subscribeCollection,
  normalizeTimestamp,
  type EarningsDoc,
  type ReviewDoc,
  type LogDoc,
  fetchReviewPage,
  fetchLogPage,
} from "@/lib/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

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

// LogDoc를 LogEntry로 변환 (optional 필드에 기본값 제공)
function toLogEntry(doc: LogDoc): LogEntry {
  // payload가 없고 context가 JSON 문자열이면 파싱해서 payload로 사용
  let payload = doc.payload;
  const context = doc.context ?? "";

  if (!payload && context.startsWith("{")) {
    try {
      payload = JSON.parse(context);
    } catch {
      // JSON 파싱 실패하면 그냥 넘어감
    }
  }

  return {
    id: doc.id,
    level: doc.level ?? "info",
    message: doc.message ?? "",
    createdAt: doc.createdAt ?? "",
    context,
    payload,
  };
}

const DATE_PRESET_TO_MS: Record<Exclude<DatePreset, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function resolveSinceDate(filter: DatePreset): Date | null {
  if (filter === "all") {
    return null;
  }
  const now = Date.now();
  const since = now - DATE_PRESET_TO_MS[filter];
  return new Date(since);
}

function getActiveKeys<T extends string>(
  map: Record<T, boolean> | undefined,
  defaults: readonly T[],
): T[] {
  if (!map) {
    return [...defaults];
  }
  return defaults.filter((key) => map[key] ?? false);
}

function createSignature<T extends string>(
  map: Record<T, boolean> | undefined,
  defaults: readonly T[],
): string {
  return defaults.map((key) => `${key}:${map?.[key] ? 1 : 0}`).join("|");
}

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
  const { status } = useFirebase();
  const reviewStatusFilter = options?.reviewStatusFilter;
  const reviewDateRange = options?.reviewDateRange ?? "all";
  const logLevelFilter = options?.logLevelFilter;
  const logDateRange = options?.logDateRange ?? "all";
  const reviewStatusSignature = useMemo(
    () => createSignature(reviewStatusFilter, REVIEW_STATUSES),
    [reviewStatusFilter],
  );
  const logLevelSignature = useMemo(() => createSignature(logLevelFilter, LOG_LEVELS), [logLevelFilter]);

  const [metrics, setMetrics] = useState<EarningsMetric[]>(FALLBACK_METRICS);
  const [workflow, setWorkflow] = useState<WorkflowItem[]>(FALLBACK_WORKFLOW);
  const [logs, setLogs] = useState<LogEntry[]>(FALLBACK_LOGS);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewLimit, setReviewLimitState] = useState(options?.defaultReviewLimit ?? 12);
  const onReviewPageChange = options?.onReviewPageChange;
  const [totalReviewCount, setTotalReviewCount] = useState<number | null>(null);
  const [hasNextReviewPage, setHasNextReviewPage] = useState(false);
  const [hasPrevReviewPage, setHasPrevReviewPage] = useState(false);
  const [reviewPageIndex, setReviewPageIndex] = useState(0);
  const [totalLogCount, setTotalLogCount] = useState<number | null>(null);
  const [hasNextLogPage, setHasNextLogPage] = useState(false);
  const [hasPrevLogPage, setHasPrevLogPage] = useState(false);
  const [logPageIndex, setLogPageIndex] = useState(0);
  const onLogPageChange = options?.onLogPageChange;

  const cursorHistoryRef = useRef<QueryDocumentSnapshot<DocumentData>[]>([]);
  const currentCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const logCursorHistoryRef = useRef<QueryDocumentSnapshot<DocumentData>[]>([]);
  const logCurrentCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const LOG_LIMIT = 12;

  const setReviewLimit = useCallback((nextLimit: number) => {
    setReviewLimitState((prev) => {
      if (nextLimit === prev) {
        return prev;
      }
      return nextLimit;
    });
  }, []);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];
    if (status !== "ready") {
      return () => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
      };
    }

    async function hydrate() {
      const unsubMetrics = await subscribeCollection<EarningsDoc>("earnings", 8, (documents) => {
        setMetrics(
          documents.length
            ? documents.map((doc) => ({
                id: doc.id,
                label: doc.date ?? "N/A",
                value: doc.value ?? `${doc.commission ?? 0}`,
                trend: doc.trend,
              }))
            : FALLBACK_METRICS,
        );
      });
      unsubscribes.push(unsubMetrics);
    }

    hydrate();

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [status]);

  const loadReviewPage = useCallback(
    async ({
      cursor,
      resetStack = false,
    }: {
      cursor?: QueryDocumentSnapshot<DocumentData> | null;
      resetStack?: boolean;
    } = {}) => {
      if (status !== "ready") {
        setWorkflow(FALLBACK_WORKFLOW);
        setHasNextReviewPage(false);
        setHasPrevReviewPage(false);
        setReviewPageIndex(0);
        onReviewPageChange?.(0);
        return;
      }

      if (resetStack) {
        cursorHistoryRef.current = [];
        currentCursorRef.current = null;
      }

      const activeStatuses = getActiveKeys(reviewStatusFilter, REVIEW_STATUSES);
      if (activeStatuses.length === 0) {
        cursorHistoryRef.current = [];
        currentCursorRef.current = null;
        setWorkflow([]);
        setTotalReviewCount(0);
        setHasNextReviewPage(false);
        setHasPrevReviewPage(false);
        setReviewPageIndex(0);
        onReviewPageChange?.(0);
        return;
      }

      setIsLoading(true);

      try {
        const statusesForQuery =
          activeStatuses.length === REVIEW_STATUSES.length ? undefined : (activeStatuses as ReviewStatus[]);
        const updatedAfter = resolveSinceDate(reviewDateRange);
        const result = await fetchReviewPage({
          limit: reviewLimit,
          startAfterDoc: cursor ?? null,
          statuses: statusesForQuery,
          updatedAfter,
        });

        setWorkflow(
          result.documents.length
            ? result.documents.map((doc) => ({
                id: doc.id,
                productId: doc.productId,
                product: (doc.productName && doc.productName.trim()) || doc.productId || "미상",
                author: doc.author ?? "auto-bot",
                status: doc.status ?? "draft",
                updatedAt: doc.updatedAt ?? "",
                createdAt: doc.createdAt,
                content: doc.content,
                toneScore: doc.toneScore,
                charCount: doc.charCount,
                slug: (doc as any).slug,
                publishedAt: (doc as any).publishedAt,
                media: (doc as any).media,
              }))
            : FALLBACK_WORKFLOW,
        );

        setTotalReviewCount(result.totalCount ?? null);

        currentCursorRef.current = result.lastSnapshot;
        setHasNextReviewPage(result.hasMore);
        setHasPrevReviewPage(cursorHistoryRef.current.length > 0);

        const pageIndex = cursorHistoryRef.current.length;
        setReviewPageIndex(pageIndex);
        onReviewPageChange?.(pageIndex);
      } catch (error) {
        console.warn("[useAdminDashboardData] Failed to fetch review page", error);
        setWorkflow(FALLBACK_WORKFLOW);
        setTotalReviewCount(null);
        setHasNextReviewPage(false);
        setHasPrevReviewPage(cursorHistoryRef.current.length > 0);
      } finally {
        setIsLoading(false);
      }
    },
    [status, reviewLimit, reviewStatusFilter, reviewStatusSignature, reviewDateRange, onReviewPageChange],
  );

  useEffect(() => {
    if (status !== "ready") {
      return;
    }
    loadReviewPage({ cursor: null, resetStack: true }).catch((error) => {
      console.warn("[useAdminDashboardData] Initial review page load failed", error);
    });
  }, [status, reviewLimit, loadReviewPage]);

  const goToNextReviewPage = useCallback(async () => {
    if (!currentCursorRef.current || !hasNextReviewPage) {
      return;
    }

    cursorHistoryRef.current = [...cursorHistoryRef.current, currentCursorRef.current];

    await loadReviewPage({ cursor: currentCursorRef.current });
  }, [hasNextReviewPage, loadReviewPage]);

  const goToPrevReviewPage = useCallback(async () => {
    if (cursorHistoryRef.current.length === 0) {
      return;
    }

    cursorHistoryRef.current = cursorHistoryRef.current.slice(0, -1);
    const previousCursor = cursorHistoryRef.current[cursorHistoryRef.current.length - 1] ?? null;

    await loadReviewPage({ cursor: previousCursor ?? null });
  }, [loadReviewPage]);

  const loadLogPage = useCallback(
    async ({
      cursor,
      resetStack = false,
    }: {
      cursor?: QueryDocumentSnapshot<DocumentData> | null;
      resetStack?: boolean;
    } = {}) => {
      if (status !== "ready") {
        setLogs(FALLBACK_LOGS);
        setTotalLogCount(null);
        setHasNextLogPage(false);
        setHasPrevLogPage(false);
        setLogPageIndex(0);
        return;
      }

      if (resetStack) {
        logCursorHistoryRef.current = [];
        logCurrentCursorRef.current = null;
      }

      try {
        const activeLevels = getActiveKeys(logLevelFilter, LOG_LEVELS);
        if (activeLevels.length === 0) {
          logCursorHistoryRef.current = [];
          logCurrentCursorRef.current = null;
          setLogs([]);
          setTotalLogCount(0);
          setHasNextLogPage(false);
          setHasPrevLogPage(false);
          setLogPageIndex(0);
          onLogPageChange?.(0);
          return;
        }

        const levelsForQuery =
          activeLevels.length === LOG_LEVELS.length ? undefined : (activeLevels as LogLevel[]);
        const createdAfter = resolveSinceDate(logDateRange);
        const result = await fetchLogPage({
          limit: LOG_LIMIT,
          startAfterDoc: cursor ?? null,
          levels: levelsForQuery,
          createdAfter,
        });

        setLogs(result.documents.length ? result.documents.map(toLogEntry) : FALLBACK_LOGS);
        setTotalLogCount(result.totalCount ?? null);
        logCurrentCursorRef.current = result.lastSnapshot;
        setHasNextLogPage(result.hasMore);
        setHasPrevLogPage(logCursorHistoryRef.current.length > 0);
        const index = logCursorHistoryRef.current.length;
        setLogPageIndex(index);
        onLogPageChange?.(index);
      } catch (error) {
        console.warn("[useAdminDashboardData] Failed to fetch log page", error);
        setLogs(FALLBACK_LOGS);
        setHasNextLogPage(false);
        setHasPrevLogPage(logCursorHistoryRef.current.length > 0);
      }
    },
    [status, logLevelFilter, logLevelSignature, logDateRange, onLogPageChange],
  );

  useEffect(() => {
    if (status !== "ready") {
      return;
    }
    loadLogPage({ cursor: null, resetStack: true }).catch((error) => {
      console.warn("[useAdminDashboardData] Initial log page load failed", error);
    });
  }, [status, loadLogPage]);

  const goToNextLogPage = useCallback(async () => {
    if (!logCurrentCursorRef.current || !hasNextLogPage) {
      return;
    }

    logCursorHistoryRef.current = [...logCursorHistoryRef.current, logCurrentCursorRef.current];
    await loadLogPage({ cursor: logCurrentCursorRef.current });
  }, [hasNextLogPage, loadLogPage]);

  const goToPrevLogPage = useCallback(async () => {
    if (logCursorHistoryRef.current.length === 0) {
      return;
    }

    logCursorHistoryRef.current = logCursorHistoryRef.current.slice(0, -1);
    const previous = logCursorHistoryRef.current[logCursorHistoryRef.current.length - 1] ?? null;
    await loadLogPage({ cursor: previous });
  }, [loadLogPage]);

  const refreshReviews = useCallback(async () => {
    await loadReviewPage({ cursor: null, resetStack: true });
  }, [loadReviewPage]);

  const refreshLogs = useCallback(async () => {
    await loadLogPage({ cursor: null, resetStack: true });
  }, [loadLogPage]);

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
