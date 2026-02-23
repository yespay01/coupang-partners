"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";

const DEFAULT_SYSTEM_PROMPT = `당신은 10년 경력의 전문 요리 블로거이자 요리 연구가입니다. 한국어로 상세한 레시피를 작성합니다.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력합니다.`;

const DEFAULT_USER_PROMPT = `"{dishName}" 레시피를 JSON으로 작성해주세요.

형식:
{
  "title": "요리 제목",
  "description": "요리 소개 (2-3문장, 이 요리의 매력과 특징을 설명)",
  "ingredients": [
    {"name": "재료명", "amount": "양", "searchKeyword": "쿠팡 검색용 키워드"}
  ],
  "instructions": "조리법을 단계별로 상세하게 작성"
}

규칙:
- 재료는 5~15개 사이
- searchKeyword는 쿠팡에서 검색할 수 있는 구체적인 상품명 (예: "양파" → "양파 1kg", "간장" → "진간장 500ml")
- 조리법은 반드시 다음 형식으로 상세하게 작성:
  * 각 단계를 "1. ", "2. " 등 번호로 구분
  * 각 단계마다 구체적인 시간 명시 (예: "중불에서 3분간 볶아주세요")
  * 불 세기 명시 (강불/중불/약불/중약불)
  * 조리 팁이나 포인트를 괄호 안에 포함 (예: "(이때 뚜껑을 덮으면 더 빨리 익어요)")
  * 재료를 넣는 순서와 타이밍을 정확히 설명
  * 완성 징후 설명 (예: "국물이 보글보글 끓어오르면")
- 조리법은 최소 8단계 이상으로 자세하게 작성
- 설명은 친근하고 자연스러운 구어체로
- 준비 과정(재료 손질)부터 플레이팅까지 포함`;

export default function RecipePromptPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [userPrompt, setUserPrompt] = useState(DEFAULT_USER_PROMPT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        success: boolean;
        data: Record<string, unknown>;
      }>("/api/admin/settings");

      if (data.success && data.data) {
        const recipePrompt = data.data.recipePrompt as {
          systemPrompt?: string;
          userPrompt?: string;
        } | undefined;
        if (recipePrompt) {
          if (recipePrompt.systemPrompt) setSystemPrompt(recipePrompt.systemPrompt);
          if (recipePrompt.userPrompt) setUserPrompt(recipePrompt.userPrompt);
        }
      }
    } catch (err) {
      console.error("설정 로딩 실패:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const data = await apiClient.put<{ success: boolean; message?: string }>(
        "/api/admin/settings",
        {
          recipePrompt: {
            systemPrompt,
            userPrompt,
          },
        }
      );

      if (data.success) {
        setMessage({ type: "success", text: "레시피 프롬프트가 저장되었습니다." });
      } else {
        setMessage({ type: "error", text: data.message || "저장 실패" });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "저장 중 오류 발생";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm("기본값으로 초기화하시겠습니까? 현재 입력된 내용이 사라집니다.")) return;
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setUserPrompt(DEFAULT_USER_PROMPT);
    setMessage({ type: "success", text: "기본값으로 초기화되었습니다. 저장 버튼을 눌러 적용하세요." });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-600">설정을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">레시피 프롬프트 설정</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI가 레시피를 생성할 때 사용하는 프롬프트를 직접 수정할 수 있습니다.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* System Prompt */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            시스템 프롬프트
          </label>
          <p className="mb-3 text-xs text-slate-500">
            AI의 역할과 응답 형식을 지정합니다.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-mono leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* User Prompt */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            유저 프롬프트
          </label>
          <p className="mb-3 text-xs text-slate-500">
            실제 레시피 생성 요청 프롬프트입니다. <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{"{dishName}"}</code>은 입력된 요리명으로 자동 치환됩니다.
          </p>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={20}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-mono leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            기본값으로 초기화
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
