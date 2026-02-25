"use client";

import { useState } from "react";
import type { PromptTemplate, CreatePromptTemplateInput } from "@/types/promptTemplate";
import { COUPANG_CATEGORIES } from "@/types/settings";

type TemplateEditorProps = {
  template: PromptTemplate | null; // null이면 새로 만들기
  onSave: () => void;
  onCancel: () => void;
};

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const isEditing = !!template;

  const [formData, setFormData] = useState<CreatePromptTemplateInput>({
    name: template?.name || "",
    description: template?.description || "",
    systemPrompt: template?.systemPrompt || "",
    reviewTemplate: template?.reviewTemplate || "",
    additionalGuidelines: template?.additionalGuidelines || "",
    minLength: template?.minLength || 800,
    maxLength: template?.maxLength || 1500,
    toneScoreThreshold: template?.toneScoreThreshold || 0.4,
    isDefault: template?.isDefault || false,
    categories: template?.categories || [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/settings/prompt-templates?id=${template.id}`
        : "/api/settings/prompt-templates";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "저장 실패");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류 발생");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories?.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...(prev.categories || []), categoryId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? "템플릿 편집" : "새 템플릿 만들기"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            프롬프트 템플릿을 {isEditing ? "수정" : "생성"}합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        {/* 기본 정보 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              템플릿 이름 *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 기본 리뷰, 심층 리뷰"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              설명
            </label>
            <input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="템플릿에 대한 간단한 설명"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 시스템 프롬프트 */}
        <div className="space-y-2">
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-slate-700">
            시스템 프롬프트 *
          </label>
          <textarea
            id="systemPrompt"
            required
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            rows={5}
            placeholder="AI의 역할과 작성 원칙을 정의..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 리뷰 템플릿 */}
        <div className="space-y-2">
          <label htmlFor="reviewTemplate" className="block text-sm font-medium text-slate-700">
            리뷰 템플릿 *
          </label>
          <textarea
            id="reviewTemplate"
            required
            value={formData.reviewTemplate}
            onChange={(e) => setFormData({ ...formData, reviewTemplate: e.target.value })}
            rows={8}
            placeholder="리뷰 구조와 작성 가이드... {productName}, {category} 등 변수 사용 가능"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 상세 가이드라인 */}
        <div className="space-y-2">
          <label htmlFor="additionalGuidelines" className="block text-sm font-medium text-slate-700">
            상세 가이드라인
          </label>
          <textarea
            id="additionalGuidelines"
            value={formData.additionalGuidelines}
            onChange={(e) => setFormData({ ...formData, additionalGuidelines: e.target.value })}
            rows={6}
            placeholder="추가 작성 가이드..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 글자 수 설정 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="minLength" className="block text-sm font-medium text-slate-700">
              최소 글자 수
            </label>
            <input
              id="minLength"
              type="number"
              min="10"
              max="5000"
              value={formData.minLength}
              onChange={(e) => setFormData({ ...formData, minLength: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="maxLength" className="block text-sm font-medium text-slate-700">
              최대 글자 수
            </label>
            <input
              id="maxLength"
              type="number"
              min="50"
              max="20000"
              value={formData.maxLength}
              onChange={(e) => setFormData({ ...formData, maxLength: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 톤 점수 임계값 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="toneThreshold" className="block text-sm font-medium text-slate-700">
              톤 점수 임계값
            </label>
            <span className="text-sm font-mono text-slate-600">
              {formData.toneScoreThreshold.toFixed(2)}
            </span>
          </div>
          <input
            id="toneThreshold"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={formData.toneScoreThreshold}
            onChange={(e) =>
              setFormData({ ...formData, toneScoreThreshold: Number(e.target.value) })
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
          />
        </div>

        {/* 기본값 설정 */}
        <div className="flex items-center gap-2">
          <input
            id="isDefault"
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isDefault" className="text-sm text-slate-700">
            기본 템플릿으로 설정 (자동으로 사용됩니다)
          </label>
        </div>

        {/* 카테고리 할당 (선택사항) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            카테고리 할당 (선택사항)
          </label>
          <p className="text-xs text-slate-500 mb-2">
            이 템플릿을 사용할 카테고리를 선택하세요. 선택하지 않으면 모든 카테고리에서 사용 가능합니다.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COUPANG_CATEGORIES.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.categories?.includes(category.id) || false}
                  onChange={() => toggleCategory(category.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">{category.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
