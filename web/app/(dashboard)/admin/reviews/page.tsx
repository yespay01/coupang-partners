"use client";

import { AdminDashboardView } from "@/components/AdminDashboardView";

export default function ReviewsPage() {
  return (
    <AdminDashboardView
      view="reviews"
      title="후기 승인"
      description="AI가 생성한 리뷰 초안을 상태·검색·기간 필터로 검토하고 단건/일괄 승인까지 한 번에 처리하세요."
    />
  );
}
