import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "관리자 대시보드 | 쿠팡 자동 블로그",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            쿠팡 자동 블로그
          </Link>
          <nav className="flex items-center gap-4 text-xs font-medium text-slate-300 sm:text-sm">
            <Link href="/admin" className="hover:text-white">
              대시보드
            </Link>
            <Link href="/admin/reviews" className="hover:text-white">
              후기 승인
            </Link>
            <Link href="/admin/logs" className="hover:text-white">
              로그 뷰어
            </Link>
          </nav>
        </div>
      </header>
      <main className="bg-slate-50 text-slate-900">{children}</main>
    </div>
  );
}
