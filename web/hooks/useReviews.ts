"use client";

/**
 * Review 관련 React Query Hooks
 * - useReviews: 리뷰 목록 조회
 * - useReview: 리뷰 단건 조회
 * - useReviewMutations: 리뷰 생성/수정/삭제
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchReviewPage,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  updateReviewStatus,
} from "@/lib/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import type {
  Review,
  ReviewInput,
  ReviewStatus,
  ReviewFilters,
  queryKeys,
} from "@/types";

// Query Keys
export const reviewKeys = {
  all: ["reviews"] as const,
  lists: () => [...reviewKeys.all, "list"] as const,
  list: (filters: Partial<ReviewFilters>) =>
    [...reviewKeys.lists(), filters] as const,
  details: () => [...reviewKeys.all, "detail"] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
};

// ==================== useReviews ====================

type UseReviewsOptions = {
  statuses?: ReviewStatus[];
  dateRange?: "all" | "24h" | "7d" | "30d";
  limit?: number;
  enabled?: boolean;
};

const DATE_PRESET_TO_MS: Record<"24h" | "7d" | "30d", number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function resolveSinceDate(filter: "all" | "24h" | "7d" | "30d"): Date | null {
  if (filter === "all") return null;
  return new Date(Date.now() - DATE_PRESET_TO_MS[filter]);
}

/**
 * 리뷰 목록 조회 Hook
 */
export function useReviews(options: UseReviewsOptions = {}) {
  const { status: firebaseStatus } = useFirebase();
  const { statuses, dateRange = "all", limit = 12, enabled = true } = options;

  return useQuery({
    queryKey: reviewKeys.list({ statuses: statuses as unknown as Record<ReviewStatus, boolean>, dateRange, limit }),
    queryFn: async () => {
      const result = await fetchReviewPage({
        limit,
        statuses: statuses?.length ? statuses : undefined,
        updatedAfter: resolveSinceDate(dateRange),
      });

      // ReviewDoc -> Review 변환
      const reviews: Review[] = result.documents.map((doc) => ({
        id: doc.id,
        productId: doc.productId,
        productName: doc.productName,
        author: doc.author,
        status: doc.status,
        updatedAt: doc.updatedAt,
        createdAt: doc.createdAt,
        content: doc.content,
        toneScore: doc.toneScore,
        charCount: doc.charCount,
        category: doc.category,
        affiliateUrl: doc.affiliateUrl,
        media: doc.media,
      }));

      return {
        reviews,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
      };
    },
    enabled: enabled && firebaseStatus === "ready",
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// ==================== useReview ====================

/**
 * 리뷰 단건 조회 Hook
 */
export function useReview(reviewId: string | null | undefined) {
  const { status: firebaseStatus } = useFirebase();

  return useQuery({
    queryKey: reviewKeys.detail(reviewId ?? ""),
    queryFn: async () => {
      if (!reviewId) return null;
      return getReviewById(reviewId);
    },
    enabled: Boolean(reviewId) && firebaseStatus === "ready",
    staleTime: 60 * 1000, // 1분
  });
}

// ==================== useReviewMutations ====================

/**
 * 리뷰 생성 Hook
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReviewInput) => {
      const id = await createReview(input);
      return id;
    },
    onSuccess: () => {
      // 리뷰 목록 캐시 무효화 -> 자동 refetch
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

/**
 * 리뷰 수정 Hook
 */
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      input,
    }: {
      reviewId: string;
      input: Partial<ReviewInput>;
    }) => {
      await updateReview(reviewId, input);
      return reviewId;
    },
    onSuccess: (reviewId) => {
      // 목록과 상세 캐시 모두 무효화
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
    },
  });
}

/**
 * 리뷰 삭제 Hook
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      await deleteReview(reviewId);
      return reviewId;
    },
    onSuccess: (reviewId) => {
      // 목록 캐시 무효화 및 상세 캐시 제거
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
      queryClient.removeQueries({ queryKey: reviewKeys.detail(reviewId) });
    },
  });
}

/**
 * 리뷰 상태 변경 Hook
 */
export function useUpdateReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      status,
    }: {
      reviewId: string;
      status: ReviewStatus;
    }) => {
      await updateReviewStatus(reviewId, status);
      return { reviewId, status };
    },
    onSuccess: ({ reviewId }) => {
      // 목록과 상세 캐시 모두 무효화
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
    },
  });
}
