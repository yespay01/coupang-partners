/**
 * Settings Service 스텁
 * automation-server API를 통해 설정을 관리합니다.
 */

import { apiClient } from "./apiClient";
import { COUPANG_CATEGORIES } from "@/types/settings";

export type SystemSettings = {
  ai: {
    defaultProvider: string;
    openai: { apiKey: string; model: string };
    anthropic: { apiKey: string; model: string };
    google: { apiKey: string; model: string };
    temperature: number;
    maxTokens: number;
  };
  prompt: {
    systemPrompt: string;
    reviewTemplate: string;
    minLength: number;
    maxLength: number;
    toneScoreThreshold: number;
  };
  images: {
    stockImages: {
      enabled: boolean;
      provider: string;
      apiKey?: string;
      apiKeys?: { unsplash: string; pexels: string };
      count: number;
    };
    aiImages: { enabled: boolean; provider: string; count: number; quality: string };
    coupangDetailImages: { enabled: boolean; maxCount: number; delayMs: number };
  };
  coupang: { enabled: boolean; accessKey: string; secretKey: string };
  site: {
    name: string;
    domain: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    appleTouchIconUrl: string;
    ogDefaultImageUrl: string;
    defaultMetaTitle: string;
    defaultMetaDescription: string;
    footerCopyright: string;
    affiliateDisclosureText: string;
    contactEmail: string;
    businessName: string;
    privacyPolicyUrl: string;
    termsUrl: string;
    disclosureUrl: string;
  };
  topics: { goldboxEnabled: boolean; keywords: string[]; categories: string[]; coupangPLBrands: string[] };
  automation: {
    enabled: boolean;
    schedule: string;
    collectSchedule?: string;
    maxProductsPerRun: number;
    reviewGeneration?: {
      enabled: boolean;
      maxPerRun: number;
      schedule: string;
      pauseWhenDraftCountExceeds: number;
    };
  };
};

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const data = await apiClient.get<{ success: boolean; data: SystemSettings }>(
      "/api/admin/settings"
    );
    const db = data.data;
    const defaults = getDefaultSettings();

    // topics.categories가 없거나 빈 배열이면 기본 카테고리(COUPANG_CATEGORIES) 사용
    const dbCategories = db?.topics?.categories;
    const categories =
      Array.isArray(dbCategories) && dbCategories.length > 0
        ? dbCategories
        : defaults.topics.categories;

    const merged = {
      ...defaults,
      ...db,
      topics: {
        ...defaults.topics,
        ...db?.topics,
        categories,
      },
      automation: {
        ...defaults.automation,
        ...db?.automation,
        reviewGeneration: {
          ...defaults.automation.reviewGeneration,
          ...db?.automation?.reviewGeneration,
        },
      },
      site: {
        ...defaults.site,
        ...db?.site,
      },
    };

    // 레거시 stockImages.apiKey -> provider별 apiKeys로 호환 이관
    const stockImages = merged.images?.stockImages;
    if (stockImages) {
      const provider = (stockImages.provider as "unsplash" | "pexels") || "unsplash";
      const legacyApiKey = stockImages.apiKey || "";
      merged.images.stockImages.apiKeys = {
        unsplash: stockImages.apiKeys?.unsplash || (provider === "unsplash" ? legacyApiKey : ""),
        pexels: stockImages.apiKeys?.pexels || (provider === "pexels" ? legacyApiKey : ""),
      };
    }

    return merged;
  } catch {
    return getDefaultSettings();
  }
}

export async function updateSystemSettings(
  settings: Partial<SystemSettings>
): Promise<void> {
  await apiClient.put("/api/admin/settings", settings);
}

export function subscribeToSettings(
  callback: (settings: SystemSettings) => void
): () => void {
  // Firebase 실시간 구독 대체 - 주기적 폴링
  let active = true;
  const poll = async () => {
    if (!active) return;
    try {
      const settings = await getSystemSettings();
      if (active) callback(settings);
    } catch {
      // ignore
    }
  };
  poll();
  const interval = setInterval(poll, 60000); // 1분마다 폴링
  return () => {
    active = false;
    clearInterval(interval);
  };
}

export async function resetSystemSettings(): Promise<void> {
  const defaults = getDefaultSettings();
  await updateSystemSettings(defaults);
}

export function getDefaultSettings(): SystemSettings {
  return {
    ai: {
      defaultProvider: "openai",
      openai: { apiKey: "", model: "gpt-4o-mini" },
      anthropic: { apiKey: "", model: "claude-3-5-sonnet-20241022" },
      google: { apiKey: "", model: "gemini-2.5-flash" },
      temperature: 0.7,
      maxTokens: 1024,
    },
    prompt: {
      systemPrompt: "당신은 전문적인 상품 리뷰 작성자입니다.",
      reviewTemplate: "",
      minLength: 90,
      maxLength: 170,
      toneScoreThreshold: 0.4,
    },
    images: {
      stockImages: {
        enabled: false,
        provider: "unsplash",
        apiKey: "",
        apiKeys: {
          unsplash: "",
          pexels: "",
        },
        count: 2,
      },
      aiImages: { enabled: false, provider: "dalle", count: 1, quality: "standard" },
      coupangDetailImages: { enabled: false, maxCount: 3, delayMs: 2000 },
    },
    coupang: { enabled: false, accessKey: "", secretKey: "" },
    site: {
      name: "세모링크",
      domain: process.env.NEXT_PUBLIC_SITE_URL || "https://semolink.store",
      tagline: "세상의 모든 링크가 모이는 허브",
      logoUrl: "/logo.png",
      faviconUrl: "/icon.png",
      appleTouchIconUrl: "/logo.png",
      ogDefaultImageUrl: "",
      defaultMetaTitle: "세모링크 - 세상의 모든 링크",
      defaultMetaDescription: "세상의 모든 링크가 모이는 허브, 세모링크입니다.",
      footerCopyright: "© 2026 세모링크. All rights reserved.",
      affiliateDisclosureText: "이 포스트는 쿠팡 파트너스 활동의 일환으로 일정 수수료를 받을 수 있습니다.",
      contactEmail: "",
      businessName: "",
      privacyPolicyUrl: "",
      termsUrl: "",
      disclosureUrl: "",
    },
    topics: { goldboxEnabled: true, keywords: [], categories: COUPANG_CATEGORIES, coupangPLBrands: [] },
    automation: {
      enabled: false,
      schedule: "0 8 * * *",
      collectSchedule: "02:00",
      maxProductsPerRun: 50,
      reviewGeneration: {
        enabled: false,
        maxPerRun: 5,
        schedule: "03:00",
        pauseWhenDraftCountExceeds: 50,
      },
    },
  };
}
