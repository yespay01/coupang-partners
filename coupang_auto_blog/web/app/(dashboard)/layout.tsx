import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardNav } from "@/components/admin/DashboardNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
          <DashboardNav />
        </div>
      </header>
      <main className="bg-slate-50 text-slate-900">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
