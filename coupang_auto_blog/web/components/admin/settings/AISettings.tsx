"use client";

import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AIProvider } from "@/types/settings";

const OPENAI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (저렴, 빠름)" },
  { value: "gpt-4o", label: "GPT-4o (고품질)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo (고품질, 대용량)" },
];

const ANTHROPIC_MODELS = [
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (균형)" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus (최고품질)" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (빠름)" },
];

const GOOGLE_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (최신, 추천)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (최신, 고품질)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (안정)" },
  { value: "gemini-2.0-flash-001", label: "Gemini 2.0 Flash 001 (안정)" },
];

const PROVIDERS: { id: AIProvider; name: string; logo: string }[] = [
  { id: "openai", name: "OpenAI", logo: "🤖" },
  { id: "anthropic", name: "Anthropic (Claude)", logo: "🔮" },
  { id: "google", name: "Google (Gemini)", logo: "✨" },
];

type ModelOption = { value: string; label: string };

// DB 설정을 프론트엔드 구조로 변환하는 헬퍼
function normalizeAISettings(ai: any) {
  if (!ai) {
    return {
      defaultProvider: 'openai' as AIProvider,
      openai: { apiKey: '', model: 'gpt-4o-mini' },
      anthropic: { apiKey: '', model: 'claude-3-5-sonnet-20241022' },
      google: { apiKey: '', model: 'gemini-2.5-flash' },
      temperature: 0.7,
      maxTokens: 2048,
    };
  }

  // 이미 올바른 구조인 경우
  if (ai.openai && ai.anthropic && ai.google) {
    return ai;
  }

  // DB 간소화 구조인 경우 변환
  return {
    defaultProvider: (ai.defaultProvider || ai.provider || 'openai') as AIProvider,
    openai: ai.openai || { apiKey: ai.provider === 'openai' ? (ai.apiKey || '') : '', model: 'gpt-4o-mini' },
    anthropic: ai.anthropic || { apiKey: ai.provider === 'anthropic' ? (ai.apiKey || '') : '', model: 'claude-3-5-sonnet-20241022' },
    google: ai.google || { apiKey: ai.provider === 'google' ? (ai.apiKey || '') : '', model: 'gemini-2.5-flash' },
    temperature: ai.temperature ?? 0.7,
    maxTokens: ai.maxTokens ?? 2048,
  };
}

export function AISettings() {
  const {
    settings,
    setDefaultProvider,
    setOpenAIApiKey,
    setOpenAIModel,
    setAnthropicApiKey,
    setAnthropicModel,
    setGoogleApiKey,
    setGoogleModel,
    setTemperature,
    setMaxTokens,
  } = useSettingsStore();

  const ai = normalizeAISettings(settings.ai);
  const [showApiKeys, setShowApiKeys] = useState<Record<AIProvider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const [loadingModels, setLoadingModels] = useState<Record<AIProvider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const [availableModels, setAvailableModels] = useState<Record<AIProvider, ModelOption[]>>({
    openai: OPENAI_MODELS,
    anthropic: ANTHROPIC_MODELS,
    google: GOOGLE_MODELS,
  });

  const toggleShowApiKey = (provider: AIProvider) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getModelsForProvider = (provider: AIProvider) => {
    return availableModels[provider];
  };

  const fetchModels = async (provider: AIProvider) => {
    const apiKey = ai[provider].apiKey;

    if (!apiKey) {
      alert("API 키를 먼저 입력해주세요.");
      return;
    }

    setLoadingModels((prev) => ({ ...prev, [provider]: true }));

    try {
      const response = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "모델 목록 조회 실패");
      }

      setAvailableModels((prev) => ({
        ...prev,
        [provider]: data.models,
      }));

      alert(`${data.models.length}개의 모델을 불러왔습니다.`);
    } catch (error) {
      console.error("모델 목록 조회 오류:", error);
      alert(error instanceof Error ? error.message : "모델 목록 조회 중 오류가 발생했습니다.");
    } finally {
      setLoadingModels((prev) => ({ ...prev, [provider]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">AI 설정</h2>
        <p className="mt-1 text-sm text-slate-500">
          리뷰 생성에 사용할 AI 모델과 API 키를 설정합니다.
        </p>
      </div>

      {/* 기본 AI 제공자 선택 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">기본 AI 제공자</label>
        <div className="grid grid-cols-3 gap-3">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setDefaultProvider(provider.id)}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 text-sm font-medium transition-colors ${
                ai.defaultProvider === provider.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <span className="text-xl">{provider.logo}</span>
              {provider.name}
            </button>
          ))}
        </div>
      </div>

      {/* 각 제공자별 설정 */}
      {PROVIDERS.map((provider) => {
        const config = ai[provider.id];
        const models = getModelsForProvider(provider.id);
        const isDefault = ai.defaultProvider === provider.id;

        return (
          <div
            key={provider.id}
            className={`space-y-4 rounded-lg border p-4 ${
              isDefault ? "border-blue-200 bg-blue-50/50" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium text-slate-900">
                <span>{provider.logo}</span>
                {provider.name}
                {isDefault && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    기본
                  </span>
                )}
              </h3>
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">API 키</label>
              <div className="flex gap-2">
                <input
                  type={showApiKeys[provider.id] ? "text" : "password"}
                  value={config.apiKey}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (provider.id === "openai") setOpenAIApiKey(value);
                    else if (provider.id === "anthropic") setAnthropicApiKey(value);
                    else setGoogleApiKey(value);
                  }}
                  placeholder={`${provider.name} API 키 입력`}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => toggleShowApiKey(provider.id)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  {showApiKeys[provider.id] ? "숨기기" : "보기"}
                </button>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">모델</label>
                <button
                  onClick={() => fetchModels(provider.id)}
                  disabled={!config.apiKey || loadingModels[provider.id]}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {loadingModels[provider.id] ? "불러오는 중..." : "🔄 최신 모델 불러오기"}
                </button>
              </div>
              <select
                value={config.model}
                onChange={(e) => {
                  const value = e.target.value;
                  if (provider.id === "openai") setOpenAIModel(value);
                  else if (provider.id === "anthropic") setAnthropicModel(value);
                  else setGoogleModel(value);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {models.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                API 키를 입력하고 "최신 모델 불러오기"를 클릭하여 사용 가능한 모델을 확인하세요.
              </p>
            </div>
          </div>
        );
      })}

      {/* 공통 설정 */}
      <div className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 className="font-medium text-slate-900">공통 파라미터</h3>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Temperature</label>
            <span className="text-sm font-mono text-slate-600">{ai.temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={ai.temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>정확함 (0.0)</span>
            <span>창의적 (2.0)</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Max Tokens</label>
            <input
              type="number"
              min="100"
              max="8192"
              value={ai.maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-slate-400">
            생성할 최대 토큰 수입니다. 리뷰 길이에 영향을 줍니다. (100~8192)
          </p>
        </div>
      </div>

      {/* 현재 설정 요약 */}
      <div className="rounded-lg bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700">현재 설정 요약</h4>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>
            기본 제공자: <span className="font-medium">{PROVIDERS.find((p) => p.id === ai.defaultProvider)?.name}</span>
          </li>
          <li>
            모델: <span className="font-medium">{ai[ai.defaultProvider].model}</span>
          </li>
          <li>
            Temperature: <span className="font-medium">{ai.temperature}</span>
          </li>
          <li>
            Max Tokens: <span className="font-medium">{ai.maxTokens}</span>
          </li>
          <li>
            API 키 상태:{" "}
            <span className={ai[ai.defaultProvider].apiKey ? "text-green-600" : "text-red-600"}>
              {ai[ai.defaultProvider].apiKey ? "설정됨" : "미설정"}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
