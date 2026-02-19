"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFirebase } from "@/components/FirebaseProvider";
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData";
import type { LogEntry, WorkflowItem } from "@/hooks/useAdminDashboardData";
import { recordAdminAction, updateReviewStatus, deleteReview } from "@/lib/firestore";
import { useAdminDashboardStore } from "@/stores/adminDashboardStore";
import { ReviewEditorModal } from "@/components/ReviewEditorModal";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";

// 분리된 컴포넌트 import
import {
  statusLabel,
  workflowStatuses,
  logLevelOrder,
  dateOptions,
  dateDurations,
  headerDefaults,
  type DateFilter,
  type DashboardView,
} from "./admin/constants";
import { ReviewTable } from "./admin/ReviewTable";
import { ReviewDetail } from "./admin/ReviewDetail";
import { LogList } from "./admin/LogList";
import { MetricsSection } from "./admin/MetricsSection";
import { AutomationOverview } from "./admin/AutomationOverview";
import { EarningsChart } from "./admin/EarningsChart";
import { BulkActions } from "./admin/BulkActions";
import { Pagination } from "./admin/Pagination";
import { ReportsOverview } from "./admin/ReportsOverview";
import { AdsReportsOverview } from "./admin/AdsReportsOverview";
import { EcpmChart } from "./admin/EcpmChart";

const dateOptionValues = dateOptions.map((option) => option.value);

export type { DashboardView };

export type AdminDashboardViewProps = {
  view?: DashboardView;
  title?: string;
  description?: string;
};

function AdminDashboardViewContent({
  view = "overview",
  title,
  description,
}: AdminDashboardViewProps) {
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

  const resolvedView: DashboardView = view;
  const headerCopy = headerDefaults[resolvedView];
  const pageTitle = title ?? headerCopy.title;
  const pageDescription = description ?? headerCopy.description;
  const showMetrics = resolvedView === "overview";
  const showReviews = resolvedView === "overview" || resolvedView === "reviews";
  const showLogs = resolvedView === "overview" || resolvedView === "logs";

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

      if (!hasChanges) return;

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParamsString],
  );

  // 실제 쿠팡 데이터로 메트릭스 가져오기
  const { metrics: coupangMetrics } = useDashboardMetrics();

  const {
    metrics: _firestoreMetrics,
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
  } = useAdminDashboardData({
    defaultReviewLimit: reviewLimitFilter,
    onReviewPageChange: setReviewPageIndex,
    onLogPageChange: setLogPageIndex,
    reviewStatusFilter: reviewStatuses,
    reviewDateRange: reviewDateFilter,
    logLevelFilter: logLevels,
    logDateRange: logDateFilter,
  });

  // 쿠팡 메트릭스 사용 (Firestore 메트릭스 대신)
  const metrics = coupangMetrics;

  const [pendingReviewId, setPendingReviewId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedReview, setSelectedReviewState] = useState<WorkflowItem | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [isBulkActionPending, setIsBulkActionPending] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  const greeting = useMemo(() => {
    if (status === "ready" && user) {
      return `${user.email ?? "관리자"}님,`;
    }
    return "관리자님,";
  }, [status, user]);

  const isInteractive = status === "ready";

  // URL 파라미터 동기화
  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const searchValue = params.get("reviewSearch") ?? "";
    if (searchValue !== reviewSearch) {
      setReviewSearch(searchValue);
    }

    const dateValue = params.get("reviewDate");
    const isValidDateValue = dateOptionValues.includes(dateValue as DateFilter);
    if (!dateValue || !isValidDateValue) {
      if (reviewDateFilter !== "all") setReviewDateFilter("all");
    } else if (dateValue !== reviewDateFilter) {
      setReviewDateFilter(dateValue as DateFilter);
    }

    const logSearchValue = params.get("logSearch") ?? "";
    if (logSearchValue !== logSearch) {
      setLogSearch(logSearchValue);
    }

    const logDateValue = params.get("logDate");
    const isValidLogDateValue = dateOptionValues.includes(logDateValue as DateFilter);
    if (!logDateValue || !isValidLogDateValue) {
      if (logDateFilter !== "all") setLogDateFilter("all");
    } else if (logDateValue !== logDateFilter) {
      setLogDateFilter(logDateValue as DateFilter);
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
    searchParamsString,
    setReviewDateFilter,
    setLogDateFilter,
    setLogLevels,
    setLogSearch,
    setReviewSearch,
  ]);

  // URL 업데이트
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

  // 필터링된 리뷰
  const filteredWorkflow = useMemo(() => {
    const normalizedQuery = reviewSearch.trim().toLowerCase();
    const now = Date.now();

    return workflow.filter((item) => {
      if (!item.status || !(reviewStatuses[item.status] ?? false)) return false;

      if (normalizedQuery) {
        const targets = [
          item.product?.toLowerCase() ?? "",
          item.productId?.toLowerCase() ?? "",
          item.author?.toLowerCase() ?? "",
          item.content?.toLowerCase() ?? "",
        ];
        const hasMatch = targets.some((value) => value.includes(normalizedQuery));
        if (!hasMatch) return false;
      }

      if (reviewDateFilter !== "all") {
        const reference = item.updatedAt ?? item.createdAt ?? "";
        const parsed = reference ? new Date(reference) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) return false;
        const diff = now - parsed.getTime();
        const allowedDuration = dateDurations[reviewDateFilter as keyof typeof dateDurations];
        if (diff > allowedDuration) return false;
      }

      return true;
    });
  }, [reviewDateFilter, reviewSearch, reviewStatuses, workflow]);

  const selectableReviews = useMemo(
    () => filteredWorkflow.filter((item) => Boolean(item.id)),
    [filteredWorkflow],
  );

  // 필터링된 로그
  const filteredLogs = useMemo(() => {
    const normalizedQuery = logSearch.trim().toLowerCase();
    const now = Date.now();

    return logs.filter((entry) => {
      if (!(logLevels[entry.level] ?? false)) return false;

      if (logDateFilter !== "all") {
        const parsed = entry.createdAt ? new Date(entry.createdAt) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) return false;
        const diff = now - parsed.getTime();
        if (diff > dateDurations[logDateFilter as keyof typeof dateDurations]) return false;
      }

      if (!normalizedQuery) return true;
      const message = entry.message?.toLowerCase() ?? "";
      const context = entry.context?.toLowerCase() ?? "";
      return message.includes(normalizedQuery) || context.includes(normalizedQuery);
    });
  }, [logDateFilter, logLevels, logSearch, logs]);

  // 선택된 리뷰 동기화
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

  // 선택된 리뷰 ID 동기화
  useEffect(() => {
    setSelectedReviewIds((prev) =>
      prev.filter((id) => selectableReviews.some((item) => item.id === id)),
    );
  }, [selectableReviews]);

  // 리뷰 제한 동기화
  useEffect(() => {
    if (reviewLimitFilter !== reviewLimit) setReviewLimit(reviewLimitFilter);
  }, [reviewLimitFilter, reviewLimit, setReviewLimit]);

  useEffect(() => {
    if (reviewLimit !== reviewLimitFilter) setReviewLimitFilter(reviewLimit);
  }, [reviewLimit, reviewLimitFilter, setReviewLimitFilter]);

  // 이벤트 핸들러
  const handleReviewSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setReviewSearch(event.target.value),
    [setReviewSearch],
  );

  const handleReviewSearchReset = useCallback(() => setReviewSearch(""), [setReviewSearch]);

  const handleReviewDateChange = useCallback(
    (value: DateFilter) => setReviewDateFilter(value),
    [setReviewDateFilter],
  );

  const handleLogSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setLogSearch(event.target.value),
    [setLogSearch],
  );

  const handleLogSearchReset = useCallback(() => setLogSearch(""), [setLogSearch]);

  const handleLogDateChange = useCallback(
    (value: DateFilter) => setLogDateFilter(value),
    [setLogDateFilter],
  );

  const handleRowSelect = useCallback(
    (item: WorkflowItem) => {
      if (!item.id) {
        setSelectedReviewState(item);
        return;
      }
      setSelectedReview(item.id);
    },
    [setSelectedReview],
  );

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

  const handleStatusChange = useCallback(
    async (reviewId: string | undefined, productLabel: string, nextStatus: WorkflowItem["status"]) => {
      if (!reviewId) {
        setActionError("실제 리뷰 ID를 찾을 수 없어 변경할 수 없습니다.");
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
        await refreshReviews();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "리뷰 상태 변경 중 알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setPendingReviewId(null);
      }
    },
    [refreshReviews],
  );

  const handleOpenNewReview = useCallback(() => {
    setEditingReviewId(null);
    setIsEditorOpen(true);
  }, []);

  const handleEditReview = useCallback((reviewId: string) => {
    setEditingReviewId(reviewId);
    setIsEditorOpen(true);
  }, []);

  const handleEditorClose = useCallback(() => {
    setIsEditorOpen(false);
    setEditingReviewId(null);
  }, []);

  const handleDeleteReview = useCallback(
    async (reviewId: string, productId: string | undefined, productLabel: string) => {
      if (!confirm(`'${productLabel}' 리뷰를 삭제하시겠습니까?\n\n상품이 대기중 상태로 돌아갑니다.`)) {
        return;
      }

      setPendingReviewId(reviewId);
      setActionError(null);
      setActionMessage(null);

      try {
        // 리뷰 삭제 + 상품 상태를 pending으로 리셋
        await deleteReview(reviewId, { resetProduct: !!productId });

        await recordAdminAction("admin_actions", {
          reviewId,
          productId,
          product: productLabel,
          action: "delete",
          source: "dashboard",
          performedAt: new Date().toISOString(),
        });
        setSelectedReviewIds((prev) => prev.filter((id) => id !== reviewId));
        setActionMessage(`'${productLabel}' 리뷰가 삭제되었습니다. 상품 목록에서 다시 생성할 수 있습니다.`);
        await refreshReviews();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "리뷰 삭제 중 알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setPendingReviewId(null);
      }
    },
    [refreshReviews],
  );

  const handleRegenerateReview = useCallback(
    async (reviewId: string, productId: string, productLabel: string) => {
      if (!confirm(`'${productLabel}' 리뷰를 재생성하시겠습니까?\n\n기존 리뷰가 삭제되고 새로운 리뷰가 생성됩니다.`)) {
        return;
      }

      setPendingReviewId(reviewId);
      setActionError(null);
      setActionMessage(null);

      try {
        // 1. 기존 리뷰 삭제
        await deleteReview(reviewId);

        // 2. 새 리뷰 생성 API 호출
        const response = await fetch("/api/admin/generate-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "리뷰 생성 실패");
        }

        await recordAdminAction("admin_actions", {
          reviewId,
          productId,
          product: productLabel,
          action: "regenerate",
          source: "dashboard",
          performedAt: new Date().toISOString(),
        });
        setSelectedReviewIds((prev) => prev.filter((id) => id !== reviewId));
        setActionMessage(`'${productLabel}' 리뷰가 재생성되었습니다.`);
        await refreshReviews();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "리뷰 재생성 중 알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setPendingReviewId(null);
      }
    },
    [refreshReviews],
  );

  const handleEditorSaved = useCallback(async () => {
    setActionMessage("리뷰가 저장되었습니다.");
    await refreshReviews();
  }, [refreshReviews]);

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
        await Promise.all(selections.map((item) => updateReviewStatus(item.id!, nextStatus)));
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
        await refreshReviews();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "일괄 상태 변경 중 알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        setIsBulkActionPending(false);
      }
    },
    [selectableReviews, selectedReviewIds, refreshReviews],
  );

  const reviewLimitOptions = [12, 24, 48];

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12 sm:px-8">
        {/* 헤더 */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{greeting}</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{pageTitle}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{pageDescription}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
            <p className="font-semibold text-slate-700">현재 상태</p>
            <p className="mt-1 text-xs">{status === "ready" ? "서버 연결 완료" : "서버 초기화 중"}</p>
          </div>
        </header>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            최신 데이터를 불러오는 중입니다…
          </div>
        )}

        {/* 메트릭스 섹션 */}
        {showMetrics && (
          <>
            <MetricsSection metrics={metrics} />
            <AutomationOverview />
            <ReportsOverview />
            <AdsReportsOverview />
            <EcpmChart />
          </>
        )}

        {/* 알림 메시지 */}
        {showReviews && (
          <>
            {actionError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                {actionError}
              </div>
            )}
            {actionMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
                {actionMessage}
              </div>
            )}
          </>
        )}

        {/* 수익 차트 (대시보드에만 표시) */}
        {showMetrics && <EarningsChart />}

        {/* 리뷰 섹션 */}
        {showReviews && (
          <section>
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">후기 승인 워크플로</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    `reviews` 컬렉션의 상태 값(draft → needs_revision → approved → published)을 가이드합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewReview}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  + 새 리뷰 작성
                </button>
              </div>

              {/* 상태 필터 */}
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

              {/* 검색 & 기간 필터 */}
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
                    {reviewSearch && (
                      <button
                        type="button"
                        onClick={handleReviewSearchReset}
                        className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        지우기
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-600">기간</span>
                  {dateOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full px-3 py-1 font-semibold transition ${
                        reviewDateFilter === option.value
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() => handleReviewDateChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 카운트 & 페이지 크기 */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <p>
                  총<span className="font-semibold text-slate-600"> {totalReviewCount ?? workflow.length}</span>
                  건 중 현재<span className="font-semibold text-slate-600"> {filteredWorkflow.length}</span>
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

              {/* 일괄 작업 */}
              <div className="mt-3">
                <BulkActions
                  selectedCount={selectedReviewIds.length}
                  isPending={isBulkActionPending}
                  onBulkStatusChange={handleBulkStatusChange}
                  onClearSelection={() => setSelectedReviewIds([])}
                />
              </div>

              {/* 리뷰 테이블 */}
              <div className="mt-5">
                <ReviewTable
                  reviews={filteredWorkflow}
                  selectedReviewId={selectedReviewId}
                  selectedReviewIds={selectedReviewIds}
                  isInteractive={isInteractive}
                  pendingReviewId={pendingReviewId}
                  onRowSelect={handleRowSelect}
                  onToggleSelection={toggleReviewSelection}
                  onSelectAll={handleSelectAll}
                  onStatusChange={handleStatusChange}
                  onEditReview={handleEditReview}
                  onDeleteReview={handleDeleteReview}
                />
              </div>

              {/* 페이지네이션 */}
              <div className="mt-4">
                <Pagination
                  pageIndex={reviewPageIndex}
                  hasNext={hasNextReviewPage}
                  hasPrev={hasPrevReviewPage}
                  onNext={goToNextReviewPage}
                  onPrev={goToPrevReviewPage}
                />
              </div>

              {/* 리뷰 상세 */}
              <div className="mt-6">
                <ReviewDetail review={selectedReview} />
              </div>
            </article>
          </section>
        )}

        {/* 로그 섹션 */}
        {showLogs && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">자동화 로그 스트림</h2>
                <p className="mt-1 text-xs text-slate-500">
                  자동화 서버, 스케줄러, Slack 알림 결과를 요약합니다.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {logLevelOrder.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`rounded-full px-3 py-1 font-semibold transition ${
                      logLevels[level]
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => setLogLevel(level, !logLevels[level])}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 xl:flex-row xl:items-end xl:justify-between">
              <p>
                총<span className="font-semibold text-slate-600"> {totalLogCount ?? logs.length}</span>건 중
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
                  {logSearch && (
                    <button
                      type="button"
                      onClick={handleLogSearchReset}
                      className="rounded-full border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      지우기
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-600">기간</span>
                  {dateOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full px-3 py-1 font-semibold transition ${
                        logDateFilter === option.value
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      onClick={() => handleLogDateChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <LogList logs={filteredLogs} />
            </div>

            <div className="mt-4">
              <Pagination
                pageIndex={logPageIndex}
                hasNext={hasNextLogPage}
                hasPrev={hasPrevLogPage}
                onNext={goToNextLogPage}
                onPrev={goToPrevLogPage}
              />
            </div>
          </section>
        )}
      </div>

      {/* 리뷰 편집 모달 */}
      <ReviewEditorModal
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        reviewId={editingReviewId}
        onSaved={handleEditorSaved}
      />
    </div>
  );
}

function AdminDashboardFallback() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-4" />
          <div className="h-4 bg-slate-100 rounded w-96 mb-8" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 h-32" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardView(props: AdminDashboardViewProps) {
  return (
    <Suspense fallback={<AdminDashboardFallback />}>
      <AdminDashboardViewContent {...props} />
    </Suspense>
  );
}
