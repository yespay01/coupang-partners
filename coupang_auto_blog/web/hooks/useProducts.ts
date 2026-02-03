"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProductPage, getProductStats } from "@/lib/firestore";
import { useFirebase } from "@/components/FirebaseProvider";
import type { Product, ProductFilters, ProductPageResult, DatePreset, ProductStatus } from "@/types";
import { queryKeys } from "@/types";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

/**
 * 날짜 범위에 따른 시작 날짜 계산
 */
function getDateFromPreset(preset: DatePreset): Date | null {
  const now = new Date();
  switch (preset) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

/**
 * 상품 목록 조회 훅 (페이지네이션 지원)
 */
export function useProducts(filters: Partial<ProductFilters> = {}) {
  const { status: firebaseStatus } = useFirebase();
  const [cursorHistory, setCursorHistory] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
  const [currentCursor, setCurrentCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const queryResult = useQuery({
    queryKey: [...queryKeys.products.list(filters), pageIndex],
    queryFn: async (): Promise<ProductPageResult & { lastDoc: QueryDocumentSnapshot<DocumentData> | null }> => {
      const {
        statuses,
        dateRange = "all",
        search = "",
        source = "all",
        limit: limitCount = 20, // 페이지당 20개로 조정
      } = filters;

      // 상태 필터 변환
      const activeStatuses = statuses
        ? (Object.entries(statuses)
            .filter(([, enabled]) => enabled)
            .map(([status]) => status) as ProductStatus[])
        : undefined;

      // 날짜 범위 필터
      const createdAfter = getDateFromPreset(dateRange);

      // Firestore 조회 (cursor 전달)
      const result = await fetchProductPage({
        limit: limitCount,
        statuses: activeStatuses,
        createdAfter,
        source,
        cursor: currentCursor || undefined,
      });

      // Product 타입으로 변환
      const products: Product[] = result.documents.map((doc) => ({
        id: doc.id,
        productId: doc.productId,
        productName: doc.productName,
        productPrice: doc.productPrice,
        productImage: doc.productImage,
        productUrl: doc.productUrl,
        categoryId: doc.categoryId,
        categoryName: doc.categoryName,
        affiliateUrl: doc.affiliateUrl,
        source: doc.source,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      // 검색 필터 (클라이언트 사이드)
      let filteredProducts = products;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredProducts = products.filter(
          (product) =>
            product.productName.toLowerCase().includes(searchLower) ||
            product.source.toLowerCase().includes(searchLower)
        );
      }

      return {
        products: filteredProducts,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        lastDoc: result.lastDoc || null,
      };
    },
    enabled: firebaseStatus === "ready",
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 다음 페이지로 이동
  const goToNextPage = useCallback(() => {
    if (!queryResult.data?.lastDoc || !queryResult.data?.hasMore) return;

    // 현재 cursor를 히스토리에 저장
    if (currentCursor) {
      setCursorHistory((prev) => [...prev, currentCursor]);
    }

    setCurrentCursor(queryResult.data.lastDoc);
    setPageIndex((prev) => prev + 1);
  }, [queryResult.data, currentCursor]);

  // 이전 페이지로 이동
  const goToPrevPage = useCallback(() => {
    if (pageIndex === 0) return;

    // 히스토리에서 이전 cursor 가져오기
    const prevCursor = cursorHistory[cursorHistory.length - 1] || null;
    setCursorHistory((prev) => prev.slice(0, -1));
    setCurrentCursor(prevCursor);
    setPageIndex((prev) => prev - 1);
  }, [pageIndex, cursorHistory]);

  // 첫 페이지로 이동
  const goToFirstPage = useCallback(() => {
    setCursorHistory([]);
    setCurrentCursor(null);
    setPageIndex(0);
  }, []);

  return {
    ...queryResult,
    pageIndex,
    hasNextPage: queryResult.data?.hasMore ?? false,
    hasPrevPage: pageIndex > 0,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
  };
}

/**
 * 상품 통계 조회 훅
 */
export function useProductStats() {
  const { status: firebaseStatus } = useFirebase();

  return useQuery({
    queryKey: ["products", "stats"],
    queryFn: async () => {
      return getProductStats();
    },
    enabled: firebaseStatus === "ready",
    staleTime: 60000, // 1분
  });
}
