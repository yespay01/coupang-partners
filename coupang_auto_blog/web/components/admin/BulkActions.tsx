"use client";

/**
 * 일괄 작업 버튼 컴포넌트
 */

import type { ReviewStatus } from "@/types";

type BulkActionsProps = {
  selectedCount: number;
  isPending: boolean;
  onBulkStatusChange: (status: ReviewStatus) => void;
  onClearSelection: () => void;
};

export function BulkActions({
  selectedCount,
  isPending,
  onBulkStatusChange,
  onClearSelection,
}: BulkActionsProps) {
  const isDisabled = selectedCount === 0 || isPending;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
      <p>선택된 리뷰: {selectedCount}건</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onBulkStatusChange("approved")}
          disabled={isDisabled}
        >
          선택 승인
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onBulkStatusChange("needs_revision")}
          disabled={isDisabled}
        >
          재검수 요청
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onBulkStatusChange("published")}
          disabled={isDisabled}
        >
          선택 게시
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onClearSelection}
          disabled={isDisabled}
        >
          선택 해제
        </button>
      </div>
    </div>
  );
}
