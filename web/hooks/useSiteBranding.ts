"use client";

import { useQuery } from "@tanstack/react-query";
import type { SiteSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

const SITE_BRANDING_QUERY_KEY = ["site-branding"] as const;

async function fetchSiteBranding(): Promise<SiteSettings> {
  const res = await fetch("/api/site-settings", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("사이트 정보 조회 실패");
  }

  const data = (await res.json()) as {
    success?: boolean;
    data?: Partial<SiteSettings>;
  };

  return {
    ...DEFAULT_SETTINGS.site,
    ...(data?.data || {}),
  };
}

export function useSiteBranding() {
  const query = useQuery({
    queryKey: SITE_BRANDING_QUERY_KEY,
    queryFn: fetchSiteBranding,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });

  return {
    site: query.data || DEFAULT_SETTINGS.site,
    isLoading: query.isLoading,
    error: query.error,
  };
}
