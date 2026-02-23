"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSystemSettings, useSettingsValidation } from "@/hooks/useSystemSettings";
import { useSettingsStore } from "@/stores/settingsStore";
import { AutomationSettings } from "./AutomationSettings";
import { TopicSettings } from "./TopicSettings";
import { AISettings } from "./AISettings";
import { PromptTemplates } from "./PromptTemplates";
import { ImageSettings } from "./ImageSettings";
import { CoupangSettings } from "./CoupangSettings";

const TABS = [
  { id: "automation", label: "자동 수집" },
  { id: "topics", label: "주제 설정" },
  { id: "ai", label: "AI 설정" },
  { id: "templates", label: "프롬프트 템플릿" },
  { id: "images", label: "이미지 설정" },
  { id: "coupang", label: "쿠팡 API" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsView() {
  const { activeTab, setActiveTab, hasUnsavedChanges } = useSettingsStore();
  const searchParams = useSearchParams();

  // URL ?tab= 파라미터로 초기 탭 설정
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId | null;
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);
  const { isLoading, isSaving, error, saveSettings, discardChanges, resetSettings } = useSystemSettings();
  const { validateAll } = useSettingsValidation();

  const handleSave = async () => {
    // 검증은 경고만 표시하고 저장은 진행
    const errors = validateAll();
    if (errors.length > 0) {
      const proceed = confirm(
        `다음 항목이 완전하지 않습니다:\n\n${errors.join("\n")}\n\n그래도 저장하시겠습니까?`
      );
      if (!proceed) return;
    }
    await saveSettings();
  };

  const handleReset = async () => {
    const confirmed = confirm(
      "⚠️ 설정을 기본값으로 초기화합니다.\n\n보존되는 항목:\n• API 키 (쿠팡, OpenAI, Anthropic, Google)\n• 자동화 설정 (활성화, 스케줄, 수집 상품 수)\n\n초기화되는 항목:\n• 카테고리 선택\n• 키워드\n• AI 모델 선택\n• 프롬프트\n\n계속하시겠습니까?"
    );
    if (!confirmed) return;
    await resetSettings();
  };

  const handleTabChange = (tabId: TabId) => {
    if (hasUnsavedChanges) {
      const confirmed = confirm("저장하지 않은 변경사항이 있습니다. 탭을 변경하시겠습니까?");
      if (!confirmed) return;
    }
    setActiveTab(tabId);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
          <span className="ml-3 text-slate-600">설정을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">시스템 설정</h1>
          <p className="mt-1 text-sm text-slate-500">
            자동 수집, AI 모델, 프롬프트 등 시스템 설정을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600">저장하지 않은 변경사항이 있습니다</span>
          )}
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            초기화
          </button>
          <button
            onClick={discardChanges}
            disabled={!hasUnsavedChanges || isSaving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            되돌리기
          </button>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "변경사항 저장"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === "automation" && <AutomationSettings />}
        {activeTab === "topics" && <TopicSettings />}
        {activeTab === "ai" && <AISettings />}
        {activeTab === "templates" && <PromptTemplates />}
        {activeTab === "images" && <ImageSettings />}
        {activeTab === "coupang" && <CoupangSettings />}
      </div>
    </div>
  );
}
