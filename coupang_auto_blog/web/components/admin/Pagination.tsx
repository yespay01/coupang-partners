"use client";

/**
 * 페이지네이션 컴포넌트
 */

type PaginationProps = {
  pageIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
};

export function Pagination({
  pageIndex,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
}: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
      <span>
        페이지 <span className="font-semibold text-slate-700">{pageIndex + 1}</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onPrev}
          disabled={!hasPrev}
        >
          이전
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onNext}
          disabled={!hasNext}
        >
          다음
        </button>
      </div>
    </div>
  );
}
