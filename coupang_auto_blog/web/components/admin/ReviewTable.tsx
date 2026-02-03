"use client";

/**
 * 리뷰 테이블 컴포넌트
 * - 체크박스 선택
 * - 상태 뱃지
 * - 액션 버튼
 */

import { useCallback, useEffect, useRef } from "react";
import type { ReviewStatus } from "@/types";
import type { WorkflowItem } from "@/hooks/useAdminDashboardData";
import {
  statusBadgeClass,
  statusLabel,
  workflowActions,
  actionToneClass,
  formatKoreanDate,
} from "./constants";

type ReviewTableProps = {
  reviews: WorkflowItem[];
  selectedReviewId: string | null;
  selectedReviewIds: string[];
  isInteractive: boolean;
  pendingReviewId: string | null;
  onRowSelect: (item: WorkflowItem) => void;
  onToggleSelection: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onStatusChange: (reviewId: string | undefined, productLabel: string, nextStatus: ReviewStatus) => void;
  onEditReview: (reviewId: string) => void;
  onDeleteReview: (reviewId: string, productId: string | undefined, productLabel: string) => void;
};

export function ReviewTable({
  reviews,
  selectedReviewId,
  selectedReviewIds,
  isInteractive,
  pendingReviewId,
  onRowSelect,
  onToggleSelection,
  onSelectAll,
  onStatusChange,
  onEditReview,
  onDeleteReview,
}: ReviewTableProps) {
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);

  const selectableReviews = reviews.filter((item) => Boolean(item.id));

  const isAllSelected =
    selectableReviews.length > 0 &&
    selectableReviews.every((item) => item.id && selectedReviewIds.includes(item.id));

  const isIndeterminate = selectedReviewIds.length > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleRowClick = useCallback(
    (item: WorkflowItem) => {
      onRowSelect(item);
    },
    [onRowSelect]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={isAllSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
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
          {reviews.map((item) => (
            <tr
              key={item.id ?? `${item.product}-${item.updatedAt}`}
              className={`cursor-pointer transition hover:bg-slate-50/60 ${
                selectedReviewId === item.id ? "bg-slate-100/80" : ""
              }`}
              onClick={() => handleRowClick(item)}
            >
              <td className="px-4 py-3">
                {item.id ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={selectedReviewIds.includes(item.id)}
                    onChange={(e) => onToggleSelection(item.id!, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
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
              <td className="px-4 py-3 text-xs text-slate-500">
                {formatKoreanDate(item.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  {/* 발행된 리뷰의 블로그 링크 */}
                  {item.status === "published" && item.slug && (
                    <a
                      href={`/reviews/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-green-200 px-3 py-1 text-xs font-semibold text-green-600 transition hover:bg-green-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      블로그 보기 →
                    </a>
                  )}
                  {item.id && (
                    <button
                      type="button"
                      className="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditReview(item.id!);
                      }}
                    >
                      편집
                    </button>
                  )}
                  {/* 리뷰 삭제 버튼 (삭제 시 상품이 대기중으로 돌아감) */}
                  {item.id && (
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReview(item.id!, item.productId, item.product);
                      }}
                    >
                      삭제
                    </button>
                  )}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(item.id, item.product, action.nextStatus);
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
          {reviews.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                선택된 필터에 해당하는 리뷰가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
