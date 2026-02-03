"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product, ProductFilters, DatePreset, ProductStatus } from "@/types";

type ProductListProps = {
  products: Product[];
  totalCount: number;
  filters: Partial<ProductFilters>;
  onFilterChange: (filters: Partial<ProductFilters>) => void;
  pageIndex?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onFirstPage?: () => void;
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  pending: "대기중",
  processing: "처리중",
  completed: "완료",
  failed: "실패",
};

const STATUS_COLORS: Record<ProductStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
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
  pageIndex = 0,
  hasNextPage = false,
  hasPrevPage = false,
  onNextPage,
  onPrevPage,
  onFirstPage,
}: ProductListProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [generatingReviews, setGeneratingReviews] = useState<Set<string>>(new Set());

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search });
  };

  const handleDateChange = (dateRange: DatePreset) => {
    onFilterChange({ ...filters, dateRange });
  };

  const handleStatusToggle = (status: ProductStatus) => {
    const currentStatuses = filters.statuses || {
      pending: true,
      processing: true,
      completed: true,
      failed: true,
    };
    onFilterChange({
      ...filters,
      statuses: {
        ...currentStatuses,
        [status]: !currentStatuses[status],
      },
    });
  };

  const handleGenerateReview = async (productId: string) => {
    if (generatingReviews.has(productId)) {
      return; // 이미 생성 중
    }

    setGeneratingReviews((prev) => new Set(prev).add(productId));

    try {
      const response = await fetch("/api/admin/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "리뷰 생성 실패");
      }

      alert("리뷰가 생성되었습니다. 잠시 후 후기 목록에서 확인하세요.");
    } catch (error) {
      console.error("리뷰 생성 오류:", error);
      alert(error instanceof Error ? error.message : "리뷰 생성 중 오류가 발생했습니다.");
    } finally {
      setGeneratingReviews((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
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

        {/* 날짜 범위 */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">기간</label>
          <div className="flex gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleDateChange(preset.value)}
                className={`rounded-lg border px-3 py-1 text-sm font-medium ${
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

        {/* 상태 필터 */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">상태</label>
          <div className="flex gap-2">
            {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((status) => {
              const isActive = filters.statuses?.[status] ?? true;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={`rounded-lg border px-3 py-1 text-sm font-medium ${
                    isActive
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
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
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        STATUS_COLORS[product.status]
                      }`}
                    >
                      {STATUS_LABELS[product.status]}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center gap-4 text-sm text-slate-600">
                    <span className="font-semibold text-blue-600">
                      {product.productPrice.toLocaleString()}원
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>{getSourceLabel(product.source)}</span>
                    {product.categoryName && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span>{product.categoryName}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>
                      수집일: {new Date(product.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>

                  {/* 링크 버튼 */}
                  <div className="mt-3 flex gap-2">
                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      제휴 링크
                    </a>
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      원본 링크
                    </a>
                    {/* 대기중 또는 실패 상태일 때 리뷰 생성/재시도 버튼 */}
                    {(product.status === "pending" || product.status === "failed") && (
                      <button
                        onClick={() => handleGenerateReview(product.id)}
                        disabled={generatingReviews.has(product.id)}
                        className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {generatingReviews.has(product.id)
                          ? "생성 중..."
                          : product.status === "failed"
                            ? "재시도"
                            : "리뷰 생성"}
                      </button>
                    )}
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
