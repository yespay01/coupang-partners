"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteBranding } from "@/hooks/useSiteBranding";

const navItems = [
  { label: "리뷰", href: "/", key: "review" },
  { label: "요리", href: "/recipes", key: "recipes" },
  { label: "뉴스", href: "/news", key: "news" },
  { label: "검색", href: "/search", key: "search" },
];

function getActiveKey(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/recipes")) return "recipes";
  if (pathname.startsWith("/news")) return "news";
  if (pathname.startsWith("/search")) return "search";
  return "";
}

export function SiteHeader() {
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { site } = useSiteBranding();

  return (
    <header className="fixed top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-16">
        <div className="flex h-24 items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src={site.logoUrl || "/logo.png"} alt={site.name || "사이트 로고"} className="h-20 w-auto transition-transform hover:scale-105" />
          </Link>

          {/* 데스크탑 네비 */}
          <nav className="hidden lg:flex items-center gap-10 text-[15px] font-serif italic text-slate-600">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`hover:text-slate-900 transition-colors relative py-1 ${
                  activeKey === item.key ? "text-slate-900 font-bold" : ""
                }`}
              >
                {item.label}
                {activeKey === item.key && (
                  <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-amber-500" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* 모바일 햄버거 버튼 */}
            <button
              className="lg:hidden flex flex-col justify-center items-center w-8 h-8 gap-[5px]"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="메뉴"
            >
              <span
                className={`block w-6 h-[2px] bg-slate-700 transition-all duration-300 ${
                  mobileOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              />
              <span
                className={`block w-6 h-[2px] bg-slate-700 transition-all duration-300 ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block w-6 h-[2px] bg-slate-700 transition-all duration-300 ${
                  mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 shadow-md">
          <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-3 text-[15px] font-serif italic rounded-md transition-colors ${
                  activeKey === item.key
                    ? "text-amber-800 bg-amber-50"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
