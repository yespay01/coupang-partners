/**
 * Settings Service 스텁
 * automation-server API를 통해 설정을 관리합니다.
 */

import { apiClient } from "./apiClient";

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
    stockImages: { enabled: boolean; provider: string; apiKey: string; count: number };
    aiImages: { enabled: boolean; provider: string; count: number; quality: string };
    coupangDetailImages: { enabled: boolean; maxCount: number; delayMs: number };
  };
  coupang: { enabled: boolean; accessKey: string; secretKey: string };
  topics: { goldboxEnabled: boolean; keywords: string[]; categories: string[]; coupangPLBrands: string[] };
  automation: { enabled: boolean; schedule: string; maxProductsPerRun: number };
};

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const data = await apiClient.get<{ success: boolean; data: SystemSettings }>(
      "/api/admin/settings"
    );
    return data.data;
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
      stockImages: { enabled: false, provider: "unsplash", apiKey: "", count: 2 },
      aiImages: { enabled: false, provider: "dalle", count: 1, quality: "standard" },
      coupangDetailImages: { enabled: false, maxCount: 3, delayMs: 2000 },
    },
    coupang: { enabled: false, accessKey: "", secretKey: "" },
    topics: { goldboxEnabled: true, keywords: [], categories: [], coupangPLBrands: [] },
    automation: { enabled: false, schedule: "0 8 * * *", maxProductsPerRun: 50 },
  };
}
