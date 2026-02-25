"use client";

import { create } from "zustand";
import {
  type SystemSettings,
  type AIProvider,
  type CoupangCategory,
  DEFAULT_SETTINGS,
} from "@/types/settings";

type SettingsTab = "automation" | "topics" | "ai" | "templates" | "images" | "coupang";

type SettingsStore = {
  // 상태
  settings: SystemSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  activeTab: SettingsTab;
  hasUnsavedChanges: boolean;

  // 액션
  setSettings: (settings: SystemSettings) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: SettingsTab) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;

  // 자동화 설정
  setAutomationEnabled: (enabled: boolean) => void;
  setCollectSchedule: (schedule: string) => void;
  setMaxProductsPerRun: (max: number) => void;
  setReviewGenerationEnabled: (enabled: boolean) => void;
  setReviewGenerationSchedule: (schedule: string) => void;
  setReviewGenerationMaxPerRun: (max: number) => void;
  setPauseWhenDraftCountExceeds: (count: number) => void;

  // 주제 설정
  setCategories: (categories: CoupangCategory[]) => void;
  toggleCategory: (categoryId: string) => void;
  setKeywords: (keywords: string[]) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (keyword: string) => void;
  setGoldboxEnabled: (enabled: boolean) => void;
  setCoupangPLBrands: (brands: string[]) => void;
  toggleCoupangPLBrand: (brandId: string) => void;

  // AI 설정
  setDefaultProvider: (provider: AIProvider) => void;
  setOpenAIApiKey: (apiKey: string) => void;
  setOpenAIModel: (model: string) => void;
  setAnthropicApiKey: (apiKey: string) => void;
  setAnthropicModel: (model: string) => void;
  setGoogleApiKey: (apiKey: string) => void;
  setGoogleModel: (model: string) => void;
  setTemperature: (temperature: number) => void;
  setMaxTokens: (maxTokens: number) => void;

  // 프롬프트 설정
  setSystemPrompt: (prompt: string) => void;
  setReviewTemplate: (template: string) => void;
  setAdditionalGuidelines: (guidelines: string) => void;
  setMinLength: (length: number) => void;
  setMaxLength: (length: number) => void;
  setToneScoreThreshold: (threshold: number) => void;

  // 쿠팡 API 설정
  setCoupangEnabled: (enabled: boolean) => void;
  setCoupangAccessKey: (key: string) => void;
  setCoupangSecretKey: (key: string) => void;
  setCoupangPartnerId: (id: string) => void;
  setCoupangSubId: (id: string) => void;

  // 리셋
  resetToDefaults: () => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  // 초기 상태
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isSaving: false,
  error: null,
  activeTab: "automation",
  hasUnsavedChanges: false,

  // 기본 액션
  setSettings: (settings) => set({ settings, hasUnsavedChanges: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setError: (error) => set({ error }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),

  // 자동화 설정
  setAutomationEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        automation: { ...state.settings.automation, enabled },
      },
      hasUnsavedChanges: true,
    })),
  setCollectSchedule: (collectSchedule) =>
    set((state) => ({
      settings: {
        ...state.settings,
        automation: { ...state.settings.automation, collectSchedule },
      },
      hasUnsavedChanges: true,
    })),
  setMaxProductsPerRun: (maxProductsPerRun) =>
    set((state) => ({
      settings: {
        ...state.settings,
        automation: { ...state.settings.automation, maxProductsPerRun },
      },
      hasUnsavedChanges: true,
    })),
  setReviewGenerationEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        automation: {
          ...state.settings.automation,
          reviewGeneration: {
            ...state.settings.automation.reviewGeneration,
            enabled,
          },
        },
      },
      hasUnsavedChanges: true,
    })),
  setReviewGenerationSchedule: (schedule) =>
    set((state) => ({
      settings: {
        ...state.settings,
        automation: {
          ...state.settings.automation,
          reviewGeneration: {
            ...state.settings.automation.reviewGeneration,
            schedule,
          },
        },
      },
      hasUnsavedChanges: true,
    })),
  setReviewGenerationMaxPerRun: (maxPerRun) =>
    set((state) => ({
      settings: {
        ...state.settings,
        automation: {
          ...state.settings.automation,
          reviewGeneration: {
            ...state.settings.automation.reviewGeneration,
            maxPerRun,
          },
        },
      },
      hasUnsavedChanges: true,
    })),
  setPauseWhenDraftCountExceeds: (pauseWhenDraftCountExceeds) =>
    set((state) => ({
      settings: {
        ...state.settings,
        automation: {
          ...state.settings.automation,
          reviewGeneration: {
            ...state.settings.automation.reviewGeneration,
            pauseWhenDraftCountExceeds,
          },
        },
      },
      hasUnsavedChanges: true,
    })),

  // 주제 설정
  setCategories: (categories) =>
    set((state) => ({
      settings: {
        ...state.settings,
        topics: { ...state.settings.topics, categories },
      },
      hasUnsavedChanges: true,
    })),
  toggleCategory: (categoryId) =>
    set((state) => ({
      settings: {
        ...state.settings,
        topics: {
          ...state.settings.topics,
          categories: state.settings.topics.categories.map((cat) =>
            cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
          ),
        },
      },
      hasUnsavedChanges: true,
    })),
  setKeywords: (keywords) =>
    set((state) => ({
      settings: {
        ...state.settings,
        topics: { ...state.settings.topics, keywords },
      },
      hasUnsavedChanges: true,
    })),
  addKeyword: (keyword) =>
    set((state) => {
      const trimmed = keyword.trim();
      if (!trimmed || state.settings.topics.keywords.includes(trimmed)) {
        return state;
      }
      return {
        settings: {
          ...state.settings,
          topics: {
            ...state.settings.topics,
            keywords: [...state.settings.topics.keywords, trimmed],
          },
        },
        hasUnsavedChanges: true,
      };
    }),
  removeKeyword: (keyword) =>
    set((state) => ({
      settings: {
        ...state.settings,
        topics: {
          ...state.settings.topics,
          keywords: state.settings.topics.keywords.filter((k) => k !== keyword),
        },
      },
      hasUnsavedChanges: true,
    })),
  setGoldboxEnabled: (goldboxEnabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        topics: { ...state.settings.topics, goldboxEnabled },
      },
      hasUnsavedChanges: true,
    })),
  setCoupangPLBrands: (coupangPLBrands) =>
    set((state) => ({
      settings: {
        ...state.settings,
        topics: { ...state.settings.topics, coupangPLBrands },
      },
      hasUnsavedChanges: true,
    })),
  toggleCoupangPLBrand: (brandId) =>
    set((state) => {
      const currentBrands = state.settings.topics.coupangPLBrands || [];
      const isSelected = currentBrands.includes(brandId);
      const coupangPLBrands = isSelected
        ? currentBrands.filter((id) => id !== brandId)
        : [...currentBrands, brandId];
      return {
        settings: {
          ...state.settings,
          topics: { ...state.settings.topics, coupangPLBrands },
        },
        hasUnsavedChanges: true,
      };
    }),

  // AI 설정
  setDefaultProvider: (defaultProvider) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: { ...state.settings.ai, defaultProvider },
      },
      hasUnsavedChanges: true,
    })),
  setOpenAIApiKey: (apiKey) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: {
          ...state.settings.ai,
          openai: { ...state.settings.ai.openai, apiKey },
        },
      },
      hasUnsavedChanges: true,
    })),
  setOpenAIModel: (model) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: {
          ...state.settings.ai,
          openai: {
            ...state.settings.ai.openai,
            model: model as SystemSettings["ai"]["openai"]["model"],
          },
        },
      },
      hasUnsavedChanges: true,
    })),
  setAnthropicApiKey: (apiKey) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: {
          ...state.settings.ai,
          anthropic: { ...state.settings.ai.anthropic, apiKey },
        },
      },
      hasUnsavedChanges: true,
    })),
  setAnthropicModel: (model) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: {
          ...state.settings.ai,
          anthropic: {
            ...state.settings.ai.anthropic,
            model: model as SystemSettings["ai"]["anthropic"]["model"],
          },
        },
      },
      hasUnsavedChanges: true,
    })),
  setGoogleApiKey: (apiKey) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: {
          ...state.settings.ai,
          google: { ...state.settings.ai.google, apiKey },
        },
      },
      hasUnsavedChanges: true,
    })),
  setGoogleModel: (model) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: {
          ...state.settings.ai,
          google: {
            ...state.settings.ai.google,
            model: model as SystemSettings["ai"]["google"]["model"],
          },
        },
      },
      hasUnsavedChanges: true,
    })),
  setTemperature: (temperature) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: { ...state.settings.ai, temperature },
      },
      hasUnsavedChanges: true,
    })),
  setMaxTokens: (maxTokens) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ai: { ...state.settings.ai, maxTokens },
      },
      hasUnsavedChanges: true,
    })),

  // 프롬프트 설정
  setSystemPrompt: (systemPrompt) =>
    set((state) => ({
      settings: {
        ...state.settings,
        prompt: { ...state.settings.prompt, systemPrompt },
      },
      hasUnsavedChanges: true,
    })),
  setReviewTemplate: (reviewTemplate) =>
    set((state) => ({
      settings: {
        ...state.settings,
        prompt: { ...state.settings.prompt, reviewTemplate },
      },
      hasUnsavedChanges: true,
    })),
  setAdditionalGuidelines: (additionalGuidelines) =>
    set((state) => ({
      settings: {
        ...state.settings,
        prompt: { ...state.settings.prompt, additionalGuidelines },
      },
      hasUnsavedChanges: true,
    })),
  setMinLength: (minLength) =>
    set((state) => ({
      settings: {
        ...state.settings,
        prompt: { ...state.settings.prompt, minLength },
      },
      hasUnsavedChanges: true,
    })),
  setMaxLength: (maxLength) =>
    set((state) => ({
      settings: {
        ...state.settings,
        prompt: { ...state.settings.prompt, maxLength },
      },
      hasUnsavedChanges: true,
    })),
  setToneScoreThreshold: (toneScoreThreshold) =>
    set((state) => ({
      settings: {
        ...state.settings,
        prompt: { ...state.settings.prompt, toneScoreThreshold },
      },
      hasUnsavedChanges: true,
    })),

  // 쿠팡 API 설정
  setCoupangEnabled: (enabled) =>
    set((state) => ({
      settings: {
        ...state.settings,
        coupang: { ...state.settings.coupang, enabled },
      },
      hasUnsavedChanges: true,
    })),
  setCoupangAccessKey: (accessKey) =>
    set((state) => ({
      settings: {
        ...state.settings,
        coupang: { ...state.settings.coupang, accessKey },
      },
      hasUnsavedChanges: true,
    })),
  setCoupangSecretKey: (secretKey) =>
    set((state) => ({
      settings: {
        ...state.settings,
        coupang: { ...state.settings.coupang, secretKey },
      },
      hasUnsavedChanges: true,
    })),
  setCoupangPartnerId: (partnerId) =>
    set((state) => ({
      settings: {
        ...state.settings,
        coupang: { ...state.settings.coupang, partnerId },
      },
      hasUnsavedChanges: true,
    })),
  setCoupangSubId: (subId) =>
    set((state) => ({
      settings: {
        ...state.settings,
        coupang: { ...state.settings.coupang, subId },
      },
      hasUnsavedChanges: true,
    })),

  // 리셋
  resetToDefaults: () =>
    set({
      settings: DEFAULT_SETTINGS,
      hasUnsavedChanges: true,
    }),
}));
