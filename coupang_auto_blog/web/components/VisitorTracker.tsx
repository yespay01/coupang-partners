"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getReferrerDomain(url: string): string {
  if (!url) return "direct";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "direct";
  }
}

function extractKeyword(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    const hostname = url.hostname;
    if (/google\./i.test(hostname)) return url.searchParams.get("q");
    if (/naver\./i.test(hostname)) return url.searchParams.get("query");
    if (/daum\./i.test(hostname)) return url.searchParams.get("q");
    if (/bing\./i.test(hostname)) return url.searchParams.get("q");
    if (/yahoo\./i.test(hostname)) return url.searchParams.get("p");
  } catch {
    return null;
  }
  return null;
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (
    /mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(
      ua
    )
  )
    return "mobile";
  return "desktop";
}

function getPageType(pathname: string): string {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/reviews/")) return "review";
  if (pathname.startsWith("/recipes/")) return "recipe";
  if (pathname.startsWith("/news/")) return "news";
  if (pathname.startsWith("/reviews")) return "reviews";
  if (pathname.startsWith("/recipes")) return "recipes";
  if (pathname.startsWith("/news")) return "news-list";
  return "other";
}

function getPageSlug(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const raw = segments[segments.length - 1] || "";
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // 어드민 경로 제외
    if (pathname.startsWith("/admin")) return;

    const referrer = document.referrer;
    const searchParams = new URLSearchParams(window.location.search);

    // 네이버는 referrer에서 검색어를 제거하므로 랜딩 URL 파라미터도 확인
    const naverQuery =
      searchParams.get("nv_query") ||
      searchParams.get("nv_keyword") ||
      searchParams.get("query");

    const payload = {
      page_type: getPageType(pathname),
      page_slug: getPageSlug(pathname),
      page_url: pathname,
      referrer: referrer || null,
      referrer_domain: getReferrerDomain(referrer),
      keyword: naverQuery || extractKeyword(referrer),
      utm_source: searchParams.get("utm_source"),
      utm_medium: searchParams.get("utm_medium"),
      utm_campaign: searchParams.get("utm_campaign"),
      device_type: getDeviceType(),
    };

    // fire-and-forget: 에러가 나도 페이지에 영향 없음
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
