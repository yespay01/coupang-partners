"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, ProductFilters, DatePreset } from "@/types";

type ProductListProps = {
  products: Product[];
  totalCount: number;
  filters: Partial<ProductFilters>;
  onFilterChange: (filters: Partial<ProductFilters>) => void;
  onDeleteProduct?: (productId: string) => void;
  pageIndex?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onFirstPage?: () => void;
};

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "24h", label: "최근 24시간" },
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
];

export function ProductList({
  products,
  totalCount,
  filters,
  onFilterChange,
  onDeleteProduct,
  pageIndex = 0,
  hasNextPage = false,
  hasPrevPage = false,
  onNextPage,
  onPrevPage,
  onFirstPage,
}: ProductListProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [deletingProducts, setDeletingProducts] = useState<Set<string>>(new Set());

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search });
  };

  const handleDateChange = (dateRange: DatePreset) => {
    onFilterChange({ ...filters, dateRange });
  };

  const handleDeleteProduct = async (product: Product) => {
    if (deletingProducts.has(product.id)) return;
    if (!confirm(`"${product.productName}" 상품을 삭제하시겠습니까?`)) return;

    setDeletingProducts((prev) => new Set(prev).add(product.id));

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "삭제 실패");
      }

      onDeleteProduct?.(product.id);
    } catch (error) {
      console.error("상품 삭제 오류:", error);
      alert(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingProducts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  const getSourceLabel = (source: string) => {
    if (source.startsWith("keyword:")) {
      return `키워드: ${source.replace("keyword:", "")}`;
    }
    if (source.startsWith("category:")) {
      return `카테고리: ${source.replace("category:", "")}`;
    }
    if (source === "goldbox") {
      return "골드박스";
    }
    if (source.startsWith("coupangPL:")) {
      return `쿠팡 PL: ${source.replace("coupangPL:", "")}`;
    }
    return source;
  };

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {/* 검색 */}
        <form onSubmit={handleSearchSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="상품명 또는 소스 검색..."
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              검색
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          {/* 날짜 범위 */}
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-slate-700">기간</label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleDateChange(preset.value)}
                  className={`rounded-lg border px-3 py-1 text-sm font-medium whitespace-nowrap ${
                    filters.dateRange === preset.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 상품 카운트 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          총 <span className="font-semibold text-slate-900">{totalCount}</span>개의 상품
          {products.length < totalCount && (
            <span className="ml-2 text-slate-400">
              (현재 {products.length}개 표시)
            </span>
          )}
        </p>
      </div>

      {/* 페이지네이션 (상단) */}
      {(hasNextPage || hasPrevPage) && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={onFirstPage}
              disabled={!hasPrevPage}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              처음
            </button>
            <button
              onClick={onPrevPage}
              disabled={!hasPrevPage}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              이전
            </button>
          </div>

          <span className="text-sm text-slate-600">
            페이지 <span className="font-semibold text-slate-900">{pageIndex + 1}</span>
          </span>

          <button
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            다음
          </button>
        </div>
      )}

      {/* 상품 목록 */}
      <div className="space-y-3">
        {products.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center">
            <p className="text-slate-500">수집된 상품이 없습니다.</p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex gap-4">
                {/* 상품 이미지 */}
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {product.productImage ? (
                    <Image
                      src={product.productImage}
                      alt={product.productName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                </div>

                {/* 상품 정보 */}
                <div className="flex-1">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {product.productName}
                    </h3>
                    <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${
                      product.priceObservedAt
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {product.priceObservedAt
                        ? `가격 관측 ${product.priceObservationCount || 1}회`
                        : "미관측"}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center gap-4 text-sm text-slate-600">
                    <span className="font-semibold text-blue-600">
                      {Number(product.currentPriceKrw ?? product.productPrice ?? 0).toLocaleString()}원
                    </span>
                    {product.priceChangeKrw != null && product.priceChangeKrw !== 0 && (
                      <span className={product.priceChangeKrw < 0 ? "font-medium text-emerald-600" : "font-medium text-rose-600"}>
                        {product.priceChangeKrw > 0 ? "+" : ""}{product.priceChangeKrw.toLocaleString()}원
                      </span>
                    )}
                    <span className="text-slate-400">|</span>
                    <span>{product.source ? getSourceLabel(product.source) : "기타"}</span>
                    {product.categoryName && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span>{product.categoryName}</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>
                      최근 관측: {product.priceObservedAt
                        ? new Date(product.priceObservedAt).toLocaleString("ko-KR")
                        : "아직 없음"}
                    </span>
                    <span>등록: {new Date(product.createdAt).toLocaleString("ko-KR")}</span>
                  </div>

                  {/* 링크 버튼 */}
                  <div className="mt-3 flex gap-2">
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="sponsored nofollow noopener noreferrer"
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      제휴 링크
                    </a>
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleDeleteProduct(product)}
                      disabled={deletingProducts.has(product.id)}
                      className="ml-auto rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingProducts.has(product.id) ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 (하단) */}
      {(hasNextPage || hasPrevPage) && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={onFirstPage}
              disabled={!hasPrevPage}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              처음
            </button>
            <button
              onClick={onPrevPage}
              disabled={!hasPrevPage}
              className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            >
              이전
            </button>
          </div>

          <span className="text-sm text-slate-600">
            페이지 <span className="font-semibold text-slate-900">{pageIndex + 1}</span>
          </span>

          <button
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
