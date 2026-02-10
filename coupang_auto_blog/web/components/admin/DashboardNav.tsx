"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

export function DashboardNav() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      // 로그아웃 API 호출 (로컬 토큰 삭제 + 서버 쿠키 삭제)
      await apiClient.logout();

      // 로그인 페이지로 이동
      router.push("/admin/login");
    } catch (error) {
      console.error("로그아웃 오류:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
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
