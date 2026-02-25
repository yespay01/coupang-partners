"use client";

import { AdminDashboardView } from "@/components/AdminDashboardView";

export default function LogsPage() {
  return (
    <AdminDashboardView
      view="logs"
      title="자동화 로그 탐색"
      description="자동화 서버, 스케줄러, Slack 알림 로그를 검색·필터링하며 장애 징후를 빠르게 찾아보세요."
    />
  );
}
