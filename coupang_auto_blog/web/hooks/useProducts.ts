"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import type { ProductFilters, ProductPageResult } from "@/types";
import { queryKeys } from "@/types";

/**
 * 상품 목록 조회 훅 (간소화 버전)
 */
export function useProducts(filters: Partial<ProductFilters> = {}) {
  const { status: authStatus } = useAuth();
  const [pageIndex, setPageIndex] = useState(0);

  const queryResult = useQuery({
    queryKey: [...queryKeys.products.list(filters), pageIndex],
    queryFn: async (): Promise<ProductPageResult & { lastDoc: null }> => {
      const limit = filters.limit || 50;
      const offset = pageIndex * limit;

      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (filters.search) {
        params.append('search', filters.search);
      }

      if (filters.source && filters.source !== 'all') {
        params.append('source', filters.source);
      }

      if (filters.dateRange && filters.dateRange !== 'all') {
        params.append('dateRange', filters.dateRange);
      }

      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('상품 목록 조회 실패');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '상품 목록 조회 실패');
      }

      return {
        products: result.data.products || [],
        totalCount: result.data.totalCount || 0,
        hasMore: result.data.hasMore || false,
        lastDoc: null,
      };
    },
    enabled: authStatus === "authenticated",
    staleTime: 1000 * 60 * 5, // 5분
  });

  const goToNextPage = useCallback(() => {
    setPageIndex((prev) => prev + 1);
  }, []);

  const goToPrevPage = useCallback(() => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const resetPagination = useCallback(() => {
    setPageIndex(0);
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [filters.search, filters.source, filters.dateRange, filters.limit]);

  return {
    ...queryResult,
    pageIndex,
    goToNextPage,
    goToPrevPage,
    goToFirstPage: resetPagination,
    resetPagination,
    hasPrevPage: pageIndex > 0,
    hasNextPage: queryResult.data?.hasMore ?? false,
  };
}

/**
 * 상품 통계 조회 훅
 */
export function useProductStats() {
  const { status: authStatus } = useAuth();

  return useQuery({
    queryKey: queryKeys.products.stats(),
    queryFn: async () => {
      const response = await fetch('/api/admin/products/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('상품 통계 조회 실패');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '상품 통계 조회 실패');
      }

      return result.data;
    },
    enabled: authStatus === "authenticated",
    staleTime: 1000 * 60 * 5,
  });
}
