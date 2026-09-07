"use client";

import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useSettingsStore } from "@/stores/settingsStore";
import { CoupangSettings } from "./CoupangSettings";

export function SettingsView() {
  const { hasUnsavedChanges } = useSettingsStore();
  const { isLoading, isSaving, error, saveSettings, discardChanges } = useSystemSettings();

  const handleSave = async () => {
    await saveSettings();
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
            가격 관측에 사용할 쿠팡 API 연결을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600">저장하지 않은 변경사항이 있습니다</span>
          )}
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

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CoupangSettings />
      </div>
    </div>
  );
}
