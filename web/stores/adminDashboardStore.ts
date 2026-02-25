"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkflowItem, LogEntry } from "@/hooks/useAdminDashboardData";

type AdminDashboardStore = {
  reviewStatuses: Record<WorkflowItem["status"], boolean>;
  reviewLimitFilter: number;
  reviewSearch: string;
  reviewDateFilter: "all" | "24h" | "7d" | "30d";
  selectedReviewId: string | null;
  logLevels: Record<LogEntry["level"], boolean>;
  logSearch: string;
  logDateFilter: "all" | "24h" | "7d" | "30d";
  reviewPageIndex: number;
  logPageIndex: number;
  setReviewStatus: (status: WorkflowItem["status"], active: boolean) => void;
  setReviewStatuses: (statuses: Record<WorkflowItem["status"], boolean>) => void;
  setReviewLimitFilter: (limit: number) => void;
  setReviewSearch: (value: string) => void;
  setReviewDateFilter: (value: "all" | "24h" | "7d" | "30d") => void;
  setSelectedReview: (reviewId: string | null) => void;
  setLogLevel: (level: LogEntry["level"], active: boolean) => void;
  setLogLevels: (levels: Record<LogEntry["level"], boolean>) => void;
  setLogSearch: (value: string) => void;
  setLogDateFilter: (value: "all" | "24h" | "7d" | "30d") => void;
  setReviewPageIndex: (index: number) => void;
  setLogPageIndex: (index: number) => void;
};

const DEFAULT_REVIEW_LIMIT = 12;

const defaultReviewStatuses: Record<WorkflowItem["status"], boolean> = {
  draft: true,
  needs_revision: true,
  approved: true,
  published: true,
};

const defaultLogLevels: Record<LogEntry["level"], boolean> = {
  info: true,
  warn: true,
  error: true,
};

export const useAdminDashboardStore = create(
  persist<AdminDashboardStore>(
    (set) => ({
      reviewStatuses: defaultReviewStatuses,
      reviewLimitFilter: DEFAULT_REVIEW_LIMIT,
      reviewSearch: "",
      reviewDateFilter: "all",
      selectedReviewId: null,
      logLevels: defaultLogLevels,
      logSearch: "",
      logDateFilter: "all",
      reviewPageIndex: 0,
      logPageIndex: 0,
  setReviewStatus: (status, active) =>
    set((state) => ({
      reviewStatuses: {
        ...state.reviewStatuses,
        [status]: active,
      },
    })),
  setReviewStatuses: (statuses) =>
    set(() => ({
      reviewStatuses: statuses,
    })),
  setReviewLimitFilter: (limit) =>
    set(() => ({
      reviewLimitFilter: limit,
    })),
  setReviewSearch: (value) =>
    set(() => ({
      reviewSearch: value,
    })),
  setReviewDateFilter: (value) =>
    set(() => ({
      reviewDateFilter: value,
    })),
  setSelectedReview: (reviewId) =>
    set(() => ({
      selectedReviewId: reviewId,
    })),
  setLogLevel: (level, active) =>
    set((state) => ({
      logLevels: {
        ...state.logLevels,
        [level]: active,
      },
    })),
  setLogLevels: (levels) =>
    set(() => ({
      logLevels: levels,
    })),
  setLogSearch: (value) =>
    set(() => ({
      logSearch: value,
    })),
  setLogDateFilter: (value) =>
    set(() => ({
      logDateFilter: value,
    })),
  setReviewPageIndex: (index) =>
    set(() => ({
      reviewPageIndex: index,
    })),
  setLogPageIndex: (index) =>
    set(() => ({
      logPageIndex: index,
    })),
    }),
    {
      name: "admin-dashboard-store",
      partialize: (state) => ({
        reviewStatuses: state.reviewStatuses,
        reviewLimitFilter: state.reviewLimitFilter,
        reviewSearch: state.reviewSearch,
        reviewDateFilter: state.reviewDateFilter,
        selectedReviewId: state.selectedReviewId,
        logLevels: state.logLevels,
        logSearch: state.logSearch,
        logDateFilter: state.logDateFilter,
        reviewPageIndex: state.reviewPageIndex,
        logPageIndex: state.logPageIndex,
      }) as AdminDashboardStore,
    },
  ),
);
