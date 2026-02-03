"use client";

/**
 * 리뷰 상세 보기 컴포넌트
 */

import Image from "next/image";
import type { WorkflowItem } from "@/hooks/useAdminDashboardData";
import { formatKoreanDate } from "./constants";

type ReviewDetailProps = {
  review: WorkflowItem | null;
};

export function ReviewDetail({ review }: ReviewDetailProps) {
  if (!review) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <p className="text-sm text-slate-500">
          테이블에서 행을 선택하면 리뷰 본문과 메타 정보를 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">선택한 리뷰 상세</h3>
            <p className="text-xs text-slate-500">
              상품 ID: <span className="font-mono text-slate-700">{review.productId ?? "-"}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span>톤 점수</span>
            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">
              {review.toneScore ?? "-"}
            </span>
            <span>글자 수</span>
            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">
              {review.charCount ?? "-"}
            </span>
          </div>
        </div>

        {/* 상품 이미지 */}
        {review.media && review.media.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {review.media.map((item, index) => (
              item.type === "image" && (
                <div key={index} className="relative h-40 w-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <Image
                    src={item.url}
                    alt={item.alt || "상품 이미지"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )
            ))}
          </div>
        )}

        <div
          className="rounded-2xl bg-white p-4 text-sm text-slate-700 shadow-sm review-content max-w-none overflow-auto"
          dangerouslySetInnerHTML={{ __html: review.content ?? "<p>리뷰 본문이 없습니다.</p>" }}
        />
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>
            생성: {review.createdAt ? formatKoreanDate(review.createdAt) : "-"}
          </span>
          <span>
            최근 업데이트: {review.updatedAt ? formatKoreanDate(review.updatedAt) : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
