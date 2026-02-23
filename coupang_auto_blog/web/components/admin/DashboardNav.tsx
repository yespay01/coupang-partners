"use client";

import Link from "next/link";
import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

export function DashboardNav() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await apiClient.logout();
      // 전체 페이지 리로드로 모든 상태 초기화
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("로그아웃 오류:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="flex items-center gap-4 text-xs font-medium text-slate-300 sm:text-sm">
      <Link href="/admin" className="hover:text-white">
        대시보드
      </Link>
      <Link href="/admin/reviews" className="hover:text-white">
        후기 승인
      </Link>
      <Link href="/admin/products" className="hover:text-white">
        수집 상품
      </Link>
      <Link href="/admin/recipes" className="hover:text-white">
        요리
      </Link>
      <Link href="/admin/news" className="hover:text-white">
        뉴스
      </Link>
      <Link href="/admin/logs" className="hover:text-white">
        로그 뷰어
      </Link>
      <Link href="/admin/settings" className="hover:text-white">
        설정
      </Link>
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="rounded-full border border-red-400/30 px-3 py-1 text-xs text-red-300 transition hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </nav>
  );
}
