"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFirebase } from "@/components/FirebaseProvider";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import type { LogEntry, WorkflowItem } from "@/hooks/useAdminDashboardData";
import { recordAdminAction, updateReviewStatus } from "@/lib/firestore";
import { useAdminDashboardStore } from "@/stores/adminDashboardStore";

const statusBadgeClass: Record<WorkflowItem["status"], string> = {
  draft: "bg-sky-100 text-sky-700 border-sky-200",
  needs_revision: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  published: "bg-slate-100 text-slate-700 border-slate-200",
};

const logToneClass: Record<LogEntry["level"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
};

const workflowActions: Record<
  WorkflowItem["status"],
  { label: string; nextStatus: WorkflowItem["status"]; tone: "primary" | "secondary" | "danger" }[]
> = {
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

const actionToneClass: Record<"primary" | "secondary" | "danger", string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  secondary: "border border-slate-200 text-slate-700 hover:bg-slate-100",
  danger: "border border-rose-200 text-rose-600 hover:bg-rose-50",
};

const workflowStatuses: WorkflowItem["status"][] = ["draft", "needs_revision", "approved", "published"];

const statusLabel: Record<WorkflowItem["status"], string> = {
  draft: "초안",
  needs_revision: "재검수 필요",
  approved: "승인 완료",
  published: "게시 완료",
};

const reviewDateOptions = [
  { value: "all", label: "전체" },
  { value: "24h", label: "24시간" },
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
] as const;

const reviewDateOptionValues = reviewDateOptions.map((option) => option.value);
type ReviewDateFilter = (typeof reviewDateOptionValues)[number];
const logDateOptions = reviewDateOptions;
const logLevelOrder: LogEntry["level"][] = ["info", "warn", "error"];

const reviewDateDurations: Record<"24h" | "7d" | "30d", number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function formatKoreanDate(value: string): string {
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

export default function AdminDashboardPage() {
  const { status, user } = useFirebase();
  const {
    reviewStatuses,
    reviewLimitFilter,
    reviewSearch,
    reviewDateFilter,
    selectedReviewId,
    logLevels,
    logSearch,
    logDateFilter,
    setReviewStatus,
    setReviewLimitFilter,
    setReviewSearch,
    setReviewDateFilter,
    setSelectedReview,
    setLogLevel,
    setLogLevels,
    setLogSearch,
    setLogDateFilter,
    setReviewPageIndex,
    setLogPageIndex,
  } = useAdminDashboardStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsString);
      let hasChanges = false;

      Object.entries(updates).forEach(([key, value]) => {
        const nextValue = value ?? "";
        const currentValue = params.get(key);

        if (nextValue) {
          if (currentValue !== nextValue) {
            params.set(key, nextValue);
            hasChanges = true;
          }
        } else if (currentValue !== null) {
          params.delete(key);
          hasChanges = true;
        }
      });

      if (!hasChanges) {
        return;
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParamsString],
  );
  const {
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
  } = useAdminDashboardData({
    defaultReviewLimit: reviewLimitFilter,
    onReviewPageChange: setReviewPageIndex,
    onLogPageChange: setLogPageIndex,
    reviewStatusFilter: reviewStatuses,
    reviewDateRange: reviewDateFilter,
    logLevelFilter: logLevels,
    logDateRange: logDateFilter,
  });
  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedReview, setSelectedReviewState] = useState<WorkflowItem | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [isBulkActionPending, setIsBulkActionPending] = useState(false);

  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const greeting = useMemo(() => {
    if (status === "ready" && user) {
      return `${user.email ?? "관리자"}님,`;
    }
    return "관리자님,";
  }, [status, user]);

  const isInteractive = status === "ready";

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const searchValue = params.get("reviewSearch") ?? "";
    if (searchValue !== reviewSearch) {
      setReviewSearch(searchValue);
    }

    const dateValue = params.get("reviewDate");
    const isValidDateValue = reviewDateOptionValues.includes(dateValue as ReviewDateFilter);
    if (!dateValue || !isValidDateValue) {
      if (reviewDateFilter !== "all") {
        setReviewDateFilter("all");
      }
    } else if (dateValue !== reviewDateFilter) {
      setReviewDateFilter(dateValue as ReviewDateFilter);
    }

    const logSearchValue = params.get("logSearch") ?? "";
    if (logSearchValue !== logSearch) {
      setLogSearch(logSearchValue);
    }

    const logDateValue = params.get("logDate");
    const isValidLogDateValue = reviewDateOptionValues.includes(logDateValue as ReviewDateFilter);
    if (!logDateValue || !isValidLogDateValue) {
      if (logDateFilter !== "all") {
        setLogDateFilter("all");
      }
    } else if (logDateValue !== logDateFilter) {
      setLogDateFilter(logDateValue as ReviewDateFilter);
    }

    const logLevelsValue = params.get("logLevels");
    let nextLogLevels: Record<LogEntry["level"], boolean> | null = null;
    if (logLevelsValue) {
      const requestedLevels = logLevelsValue
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is LogEntry["level"] => logLevelOrder.includes(value as LogEntry["level"]));
      if (requestedLevels.length > 0) {
        nextLogLevels = logLevelOrder.reduce<Record<LogEntry["level"], boolean>>((acc, level) => {
          acc[level] = requestedLevels.includes(level);
          return acc;
        }, {} as Record<LogEntry["level"], boolean>);
      }
    }

    const resolvedLogLevels =
      nextLogLevels ??
      logLevelOrder.reduce<Record<LogEntry["level"], boolean>>((acc, level) => {
        acc[level] = true;
        return acc;
      }, {} as Record<LogEntry["level"], boolean>);

    const isLogLevelChanged = logLevelOrder.some((level) => (logLevels[level] ?? false) !== resolvedLogLevels[level]);
    if (isLogLevelChanged) {
      setLogLevels(resolvedLogLevels);
    }
  }, [
    logDateFilter,
    logLevels,
    logSearch,
    reviewDateFilter,
    reviewSearch,
    searchParamsString,
    setReviewDateFilter,
    setLogDateFilter,
    setLogLevels,
    setLogSearch,
    setReviewSearch,
  ]);

  useEffect(() => {
    const activeLogLevels = logLevelOrder.filter((level) => logLevels[level]);
    updateQueryParams({
      reviewSearch: reviewSearch.trim() ? reviewSearch.trim() : null,
      reviewDate: reviewDateFilter === "all" ? null : reviewDateFilter,
      logSearch: logSearch.trim() ? logSearch.trim() : null,
      logDate: logDateFilter === "all" ? null : logDateFilter,
      logLevels: activeLogLevels.length === logLevelOrder.length ? null : activeLogLevels.join(","),
    });
  }, [logDateFilter, logLevels, logSearch, reviewDateFilter, reviewSearch, updateQueryParams]);

  const filteredWorkflow = useMemo(() => {
    const normalizedQuery = reviewSearch.trim().toLowerCase();
    const now = Date.now();

    return workflow.filter((item) => {
      if (!item.status || !(reviewStatuses[item.status] ?? false)) {
        return false;
      }

      if (normalizedQuery) {
        const targets = [
          item.product?.toLowerCase() ?? "",
          item.productId?.toLowerCase() ?? "",
          item.author?.toLowerCase() ?? "",
          item.content?.toLowerCase() ?? "",
        ];
        const hasMatch = targets.some((value) => value.includes(normalizedQuery));
        if (!hasMatch) {
          return false;
        }
      }

      if (reviewDateFilter !== "all") {
        const reference = item.updatedAt ?? item.createdAt ?? "";
        const parsed = reference ? new Date(reference) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
          return false;
        }
        const diff = now - parsed.getTime();
        const allowedDuration = reviewDateDurations[reviewDateFilter];
        if (diff > allowedDuration) {
          return false;
        }
      }

      return true;
    });
  }, [reviewDateFilter, reviewSearch, reviewStatuses, workflow]);

  const selectableReviews = useMemo(
    () => filteredWorkflow.filter((item) => Boolean(item.id)),
    [filteredWorkflow],
  );

  const isAllSelected = useMemo(() => {
    if (!selectableReviews.length) return false;
    return selectableReviews.every((item) => item.id && selectedReviewIds.includes(item.id));
  }, [selectableReviews, selectedReviewIds]);

  const isIndeterminate = selectedReviewIds.length > 0 && !isAllSelected;

  const filteredLogs = useMemo(() => {
    const normalizedQuery = logSearch.trim().toLowerCase();
    const now = Date.now();

    return logs.filter((entry) => {
      if (!(logLevels[entry.level] ?? false)) {
        return false;
      }

      if (logDateFilter !== "all") {
        const parsed = entry.createdAt ? new Date(entry.createdAt) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
          return false;
        }
        const diff = now - parsed.getTime();
        if (diff > reviewDateDurations[logDateFilter]) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }
      const message = entry.message?.toLowerCase() ?? "";
      const context = entry.context?.toLowerCase() ?? "";
      return message.includes(normalizedQuery) || context.includes(normalizedQuery);
    });
  }, [logDateFilter, logLevels, logSearch, logs]);

  useEffect(() => {
    if (!selectedReviewId) {
      setSelectedReviewState(null);
      return;
    }
    const match = filteredWorkflow.find((item) => item.id === selectedReviewId);
    if (match) {
      setSelectedReviewState(match);
    } else {
      setSelectedReview(null);
      setSelectedReviewState(null);
    }
  }, [filteredWorkflow, selectedReviewId, setSelectedReview]);

  useEffect(() => {
    setSelectedReviewIds((prev) =>
      prev.filter((id) => selectableReviews.some((item) => item.id === id)),
    );
  }, [selectableReviews]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const reviewLimitOptions = [12, 24, 48];

  const handleReviewSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setReviewSearch(event.target.value);
    },
    [setReviewSearch],
  );

  const handleReviewSearchReset = useCallback(() => {
    setReviewSearch("");
  }, [setReviewSearch]);

  const handleReviewDateChange = useCallback(
    (value: ReviewDateFilter) => {
      setReviewDateFilter(value);
    },
    [setReviewDateFilter],
  );

  const handleLogSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLogSearch(event.target.value);
    },
    [setLogSearch],
  );

  const handleLogSearchReset = useCallback(() => {
    setLogSearch("");
  }, [setLogSearch]);

  const handleLogDateChange = useCallback(
    (value: ReviewDateFilter) => {
      setLogDateFilter(value);
    },
    [setLogDateFilter],
  );

  const handleRowSelect = useCallback((item: WorkflowItem) => {
    if (!item.id) {
      setSelectedReviewState(item);
      return;
    }
    setSelectedReview(item.id);
  }, [setSelectedReview]);

  const toggleReviewSelection = useCallback((id: string, checked: boolean) => {
    setSelectedReviewIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedReviewIds(selectableReviews.map((item) => item.id!).filter(Boolean));
      } else {
        setSelectedReviewIds([]);
      }
    },
    [selectableReviews],
  );

  useEffect(() => {
    if (reviewLimitFilter !== reviewLimit) {
      setReviewLimit(reviewLimitFilter);
    }
  }, [reviewLimitFilter, reviewLimit, setReviewLimit]);

  useEffect(() => {
    if (reviewLimit !== reviewLimitFilter) {
      setReviewLimitFilter(reviewLimit);
    }
  }, [reviewLimit, reviewLimitFilter, setReviewLimitFilter]);

  const handleStatusChange = useCallback(
    async (reviewId: string | undefined, productLabel: string, nextStatus: WorkflowItem["status"]) => {
      if (!reviewId) {
        setActionError("실제 리뷰 ID를 찾을 수 없어 변경할 수 없습니다. Firestore 연동을 확인하세요.");
        return;
      }

      setPendingReviewId(reviewId);
      setActionError(null);
      setActionMessage(null);

      try {
        await updateReviewStatus(reviewId, nextStatus);
        await recordAdminAction("admin_actions", {
          reviewId,
          product: productLabel,
          nextStatus,
          source: "dashboard",
          performedAt: new Date().toISOString(),
        });
        setSelectedReviewIds((prev) => prev.filter((id) => id !== reviewId));
        setActionMessage(`'${productLabel}' 처리 결과: ${statusLabel[nextStatus] ?? nextStatus}.`);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "리뷰 상태 변경 중 알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setPendingReviewId(null);
      }
    },
    [],
  );

  const handleBulkStatusChange = useCallback(
    async (nextStatus: WorkflowItem["status"]) => {
      if (!selectedReviewIds.length) {
        setActionError("선택된 리뷰가 없습니다.");
        return;
      }

      const selections = selectableReviews.filter((item) => item.id && selectedReviewIds.includes(item.id));

      setIsBulkActionPending(true);
      setActionError(null);
      setActionMessage(null);

      try {
        await Promise.all(
          selections.map((item) => updateReviewStatus(item.id!, nextStatus)),
        );

        await recordAdminAction("admin_actions", {
          reviewIds: selections.map((item) => item.id!),
          products: selections.map((item) => ({ id: item.id, product: item.product })),
          nextStatus,
          source: "dashboard-bulk",
          performedAt: new Date().toISOString(),
        });

        setActionMessage(
          `선택한 ${selections.length}건을 '${statusLabel[nextStatus] ?? nextStatus}' 상태로 변경했습니다.`,
        );
        setSelectedReviewIds([]);
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "일괄 상태 변경 중 알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setIsBulkActionPending(false);
      }
    },
    [selectableReviews, selectedReviewIds],
  );

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 sm:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{greeting}</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              쿠팡 파트너스 운영 대시보드
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              수익 지표, 후기 승인 파이프라인, 자동화 로그를 한 화면에서 점검하세요. 실 데이터 연동 전까지는 샘플
              값이 표시됩니다.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
            <p className="font-semibold text-slate-700">현재 상태</p>
            <p className="mt-1 text-xs">{status === "ready" ? "Firebase 연결 완료" : "Firebase 초기화 중"}</p>
          </div>
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            최신 데이터를 불러오는 중입니다…
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <article
              key={metric.label ?? metric.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p>
              {metric.trend ? <p className="mt-2 text-xs text-emerald-600">{metric.trend}</p> : null}
            </article>
          ))}
        </section>

        {actionError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
            {actionMessage}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">후기 승인 워크플로</h2>
                <p className="mt-1 text-xs text-slate-500">
                  `reviews` 컬렉션의 상태 값(draft → needs_revision → approved → published)을 가이드합니다.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Workflow 설정
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {workflowStatuses.map((workflowStatus) => {
                const active = reviewStatuses[workflowStatus];
                return (
                  <button
                    key={workflowStatus}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setReviewStatus(workflowStatus, !active)}
                  >
                    {workflowStatus.replace("_", " ")}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2 lg:max-w-sm">
                <span className="font-semibold text-slate-600">상품/작성자 검색</span>
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    value={reviewSearch}
                    onChange={handleReviewSearchChange}
                    placeholder="상품명, 작성자, 본문 키워드"
                    className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
                  />
                  {reviewSearch ? (
                    <button
                      type="button"
                      onClick={handleReviewSearchReset}
                      className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      지우기
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-600">기간</span>
                {reviewDateOptions.map((option) => {
                  const active = reviewDateFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full px-3 py-1 font-semibold transition ${
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() => handleReviewDateChange(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <p>
                총
                <span className="font-semibold text-slate-600">
                  {totalReviewCount ?? workflow.length}
                </span>
                건 중 현재
                <span className="font-semibold text-slate-600"> {filteredWorkflow.length}</span>
                건을 표시합니다.
              </p>
              <div className="flex items-center gap-2">
                <span>표시 개수</span>
                {reviewLimitOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-full px-3 py-1 font-semibold transition ${
                      reviewLimit === option
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setReviewLimitFilter(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <p>선택된 리뷰: {selectedReviewIds.length}건</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleBulkStatusChange("approved")}
                  disabled={!selectedReviewIds.length || isBulkActionPending}
                >
                  선택 승인
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleBulkStatusChange("needs_revision")}
                  disabled={!selectedReviewIds.length || isBulkActionPending}
                >
                  재검수 요청
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => handleBulkStatusChange("published")}
                  disabled={!selectedReviewIds.length || isBulkActionPending}
                >
                  선택 게시
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setSelectedReviewIds([])}
                  disabled={!selectedReviewIds.length || isBulkActionPending}
                >
                  선택 해제
                </button>
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        checked={isAllSelected}
                        onChange={(event) => handleSelectAll(event.target.checked)}
                      />
                    </th>
                    <th className="px-4 py-3">상품</th>
                    <th className="px-4 py-3">작성자</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3">업데이트</th>
                    <th className="px-4 py-3 text-right">조치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredWorkflow.map((item) => (
                    <tr
                      key={item.id ?? `${item.product}-${item.updatedAt}`}
                      className={`cursor-pointer transition hover:bg-slate-50/60 ${
                        selectedReview?.id === item.id ? "bg-slate-100/80" : ""
                      }`}
                      onClick={() => handleRowSelect(item)}
                    >
                      <td className="px-4 py-3">
                        {item.id ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            checked={selectedReviewIds.includes(item.id)}
                            onChange={(event) => toggleReviewSelection(item.id!, event.target.checked)}
                            onClick={(event) => event.stopPropagation()}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.product}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.author}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass[item.status]}`}
                        >
                          {statusLabel[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatKoreanDate(item.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {workflowActions[item.status].map((action) => {
                            const disabled = !isInteractive || pendingReviewId === item.id || !item.id;
                            return (
                              <button
                                key={`${item.product}-${action.nextStatus}`}
                                type="button"
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                  actionToneClass[action.tone]
                                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                                disabled={disabled}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleStatusChange(item.id, item.product, action.nextStatus);
                                }}
                              >
                                {pendingReviewId === item.id ? "처리 중…" : action.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredWorkflow.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                        선택된 필터에 해당하는 리뷰가 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                페이지 <span className="font-semibold text-slate-700">{reviewPageIndex + 1}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={goToPrevReviewPage}
                  disabled={!hasPrevReviewPage}
                >
                  이전
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={goToNextReviewPage}
                  disabled={!hasNextReviewPage}
                >
                  다음
                </button>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              {selectedReview ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">선택한 리뷰 상세</h3>
                      <p className="text-xs text-slate-500">
                        상품 ID: <span className="font-mono text-slate-700">{selectedReview.productId ?? "-"}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>톤 점수</span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">
                        {selectedReview.toneScore ?? "-"}
                      </span>
                      <span>글자 수</span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">
                        {selectedReview.charCount ?? "-"}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                    <p className="whitespace-pre-line leading-relaxed">
                      {selectedReview.content ?? "리뷰 본문이 없습니다."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>
                      생성: {selectedReview.createdAt ? formatKoreanDate(selectedReview.createdAt) : "-"}
                    </span>
                    <span>최근 업데이트: {selectedReview.updatedAt ? formatKoreanDate(selectedReview.updatedAt) : "-"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">테이블에서 행을 선택하면 리뷰 본문과 메타 정보를 확인할 수 있습니다.</p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">수익 추이 (샘플)</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Cloud Functions 일별 집계가 연결되면 실제 데이터를 시각화합니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                최근 7일
              </span>
            </div>
            <div className="mt-6 h-40 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-100 p-4">
              <div className="flex h-full items-end gap-2">
                {[40, 32, 48, 60, 52, 68, 75].map((value, index) => (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    style={{ height: `${value}%` }}
                    className="flex-1 rounded-t-xl bg-sky-400/70"
                    aria-hidden
                  />
                ))}
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-xs text-slate-600">
              <div>
                <dt className="font-semibold text-slate-500">평균 수익</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">₩24,300</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">클릭 대비 수익</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">₩120 / 클릭</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">자동화 로그 스트림</h2>
              <p className="mt-1 text-xs text-slate-500">
                Cloud Functions, Firestore Trigger, Slack 알림 결과를 요약합니다. 세부 로그는 `logs` 컬렉션에서
                조회합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {logLevelOrder.map((level) => {
                const active = logLevels[level];
                return (
                  <button
                    key={level}
                    type="button"
                    className={`rounded-full px-3 py-1 font-semibold transition ${
                      active ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setLogLevel(level, !active)}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 xl:flex-row xl:items-end xl:justify-between">
            <p className="text-xs text-slate-500">
              총
              <span className="font-semibold text-slate-600"> {totalLogCount ?? logs.length}</span>건 중
              <span className="font-semibold text-slate-600"> {filteredLogs.length}</span>건을 표시합니다.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={logSearch}
                  onChange={handleLogSearchChange}
                  placeholder="메시지 또는 컨텍스트 검색"
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
                />
                {logSearch ? (
                  <button
                    type="button"
                    onClick={handleLogSearchReset}
                    className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    지우기
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-600">기간</span>
                {logDateOptions.map((option) => {
                  const active = logDateFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full px-3 py-1 font-semibold transition ${
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() => handleLogDateChange(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {filteredLogs.map((entry) => (
              <article
                key={`${entry.createdAt}-${entry.message}`}
                className={`rounded-2xl border px-4 py-4 shadow-sm ${logToneClass[entry.level]}`}
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                  <span>{entry.level}</span>
                  <span className="font-mono text-[11px] opacity-70">{entry.createdAt}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{entry.message}</p>
                <p className="mt-1 text-xs opacity-80">{entry.context}</p>
              </article>
            ))}
            {filteredLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
                조건에 해당하는 로그가 없습니다. 필터를 조정하거나 검색어를 지워보세요.
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              페이지 <span className="font-semibold text-slate-700">{logPageIndex + 1}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={goToPrevLogPage}
                disabled={!hasPrevLogPage}
              >
                이전
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={goToNextLogPage}
                disabled={!hasNextLogPage}
              >
                다음
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
