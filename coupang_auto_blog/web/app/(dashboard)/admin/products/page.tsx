"use client";

import { useState } from "react";
import { ProductList } from "@/components/admin/ProductList";
import { useProducts, useProductStats } from "@/hooks/useProducts";
import type { ProductFilters, ProductStatus } from "@/types";

const DEFAULT_FILTERS: ProductFilters = {
  statuses: {
    pending: true,
    processing: true,
    completed: true,
    failed: true,
  },
  dateRange: "all",
  search: "",
  source: "all",
  limit: 50,
};

export default function ProductsPage() {
  const [filters, setFilters] = useState<Partial<ProductFilters>>(DEFAULT_FILTERS);
  const {
    data,
    isLoading,
    error,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
  } = useProducts(filters);
  const { data: stats, isLoading: statsLoading } = useProductStats();

  const handleFilterChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">수집된 상품</h1>
          <p className="mt-1 text-sm text-slate-500">
            쿠팡 API를 통해 수집된 상품 목록을 확인하고 관리합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-medium text-slate-600">총 상품</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {stats.total.toLocaleString()}
              </div>
            </div>

            {Object.entries(stats.bySource).map(([source, count]) => {
              const sourceLabels: Record<string, string> = {
                keyword: "키워드",
                category: "카테고리",
                goldbox: "골드박스",
                coupangPL: "쿠팡 PL",
              };

              return (
                <div
                  key={source}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-sm font-medium text-slate-600">
                    {sourceLabels[source] || source}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {count.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
            <p className="mt-4 text-sm text-slate-600">상품 목록을 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              상품 목록을 불러오는데 실패했습니다: {error.message}
            </p>
          </div>
        )}

        {/* 상품 목록 */}
        {!isLoading && !error && data && (
          <ProductList
            products={data.products}
            totalCount={data.totalCount}
            filters={filters}
            onFilterChange={handleFilterChange}
            pageIndex={pageIndex}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={goToNextPage}
            onPrevPage={goToPrevPage}
            onFirstPage={goToFirstPage}
          />
        )}
      </div>
    </div>
  );
}
