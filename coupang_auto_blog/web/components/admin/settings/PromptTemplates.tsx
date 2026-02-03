"use client";

import { useState, useEffect } from "react";
import type { PromptTemplate } from "@/types/promptTemplate";
import { TemplateEditor } from "./TemplateEditor";

export function PromptTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings/prompt-templates");
      if (!response.ok) {
        throw new Error("템플릿 로드 실패");
      }
      const data = await response.json();
      setTemplates(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "템플릿 로드 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings/init-templates", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("템플릿 초기화 실패");
      }

      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "템플릿 초기화 중 오류 발생");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (!confirm(`'${template.name}' 템플릿을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/prompt-templates?id=${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "삭제 실패");
      }

      await loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제 중 오류 발생");
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      // 1. 기본값으로 설정
      const response = await fetch(`/api/settings/prompt-templates?id=${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!response.ok) {
        throw new Error("기본값 설정 실패");
      }

      // 2. 프롬프트 설정에 동기화
      const syncResponse = await fetch("/api/settings/sync-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      if (!syncResponse.ok) {
        throw new Error("설정 동기화 실패");
      }

      const syncData = await syncResponse.json();
      alert(syncData.message);

      await loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "기본값 설정 중 오류 발생");
    }
  };

  const handleSave = async () => {
    setEditingTemplate(null);
    setIsCreating(false);
    await loadTemplates();
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  if (isCreating || editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">프롬프트 템플릿 관리</h2>
          <p className="mt-1 text-sm text-slate-500">
            여러 프롬프트 템플릿을 생성하고 상황에 맞게 사용하세요.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 새 템플릿
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">템플릿을 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500 mb-4">등록된 템플릿이 없습니다.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleInitTemplates}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              기본 템플릿 3개 생성
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              직접 만들기
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        기본값
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>글자 수: {template.minLength}~{template.maxLength}자</span>
                    <span>•</span>
                    <span>톤 점수: {template.toneScoreThreshold}</span>
                    {template.categories && template.categories.length > 0 && (
                      <>
                        <span>•</span>
                        <span>카테고리: {template.categories.length}개</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    편집
                  </button>
                  {!template.isDefault && (
                    <>
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        className="rounded border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        기본값 설정
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-sm font-medium text-amber-800">템플릿 사용 방법</h4>
        <ul className="mt-2 space-y-1 text-sm text-amber-700">
          <li>• 기본값으로 설정된 템플릿이 자동으로 사용됩니다</li>
          <li>• 각 템플릿마다 다른 글자 수, 톤, 스타일을 설정할 수 있습니다</li>
          <li>• 카테고리별로 다른 템플릿을 지정할 수 있습니다 (향후 지원 예정)</li>
        </ul>
      </div>
    </div>
  );
}
