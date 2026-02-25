"use client";

import { useSettingsStore } from "@/stores/settingsStore";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_REVIEW_TEMPLATE, DEFAULT_ADDITIONAL_GUIDELINES } from "@/types/settings";

export function PromptSettings() {
  const {
    settings,
    setSystemPrompt,
    setReviewTemplate,
    setAdditionalGuidelines,
    setMinLength,
    setMaxLength,
    setToneScoreThreshold,
  } = useSettingsStore();

  const { prompt } = settings;

  const resetSystemPrompt = () => setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  const resetReviewTemplate = () => setReviewTemplate(DEFAULT_REVIEW_TEMPLATE);
  const resetAdditionalGuidelines = () => setAdditionalGuidelines(DEFAULT_ADDITIONAL_GUIDELINES);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">프롬프트 설정</h2>
        <p className="mt-1 text-sm text-slate-500">
          AI 리뷰 생성에 사용되는 프롬프트와 검증 조건을 설정합니다.
        </p>
      </div>

      {/* 시스템 프롬프트 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-slate-700">
            시스템 프롬프트
          </label>
          <button
            onClick={resetSystemPrompt}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            기본값으로 초기화
          </button>
        </div>
        <textarea
          id="systemPrompt"
          value={prompt.systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          placeholder="AI에게 주어질 시스템 프롬프트..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400">
          AI의 역할과 행동 지침을 정의합니다. 리뷰 작성의 기본 방향을 결정합니다.
        </p>
      </div>

      {/* 리뷰 템플릿 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="reviewTemplate" className="block text-sm font-medium text-slate-700">
            리뷰 템플릿
          </label>
          <button
            onClick={resetReviewTemplate}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            기본값으로 초기화
          </button>
        </div>
        <textarea
          id="reviewTemplate"
          value={prompt.reviewTemplate}
          onChange={(e) => setReviewTemplate(e.target.value)}
          rows={5}
          placeholder="리뷰 생성 템플릿..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="rounded bg-slate-50 p-2 text-xs text-slate-500">
          <p className="font-medium">사용 가능한 변수:</p>
          <ul className="mt-1 ml-2 space-y-0.5">
            <li><code className="bg-slate-200 px-1 rounded">{"{productName}"}</code> - 상품명</li>
            <li><code className="bg-slate-200 px-1 rounded">{"{category}"}</code> - 카테고리</li>
            <li><code className="bg-slate-200 px-1 rounded">{"{minLength}"}</code> - 최소 글자 수</li>
            <li><code className="bg-slate-200 px-1 rounded">{"{maxLength}"}</code> - 최대 글자 수</li>
          </ul>
        </div>
      </div>

      {/* 상세 가이드라인 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="additionalGuidelines" className="block text-sm font-medium text-slate-700">
            상세 가이드라인
          </label>
          <button
            onClick={resetAdditionalGuidelines}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            기본값으로 초기화
          </button>
        </div>
        <textarea
          id="additionalGuidelines"
          value={prompt.additionalGuidelines}
          onChange={(e) => setAdditionalGuidelines(e.target.value)}
          rows={8}
          placeholder="리뷰 작성 가이드라인..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400">
          리뷰 템플릿에 추가되는 상세한 작성 가이드라인입니다.
          AI가 리뷰를 작성할 때 참고하는 구체적인 지침을 포함합니다.
          변수({"{minLength}"}, {"{maxLength}"})를 사용할 수 있습니다.
        </p>
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
            value={prompt.minLength}
            onChange={(e) => setMinLength(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400">
            이 글자 수 미만이면 리뷰가 거부됩니다. (최대 5000자)
          </p>
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
            value={prompt.maxLength}
            onChange={(e) => setMaxLength(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400">
            이 글자 수 초과 시 리뷰가 거부됩니다. (최대 20000자)
          </p>
        </div>
      </div>

      {/* 톤 점수 임계값 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="toneThreshold" className="block text-sm font-medium text-slate-700">
            톤 점수 임계값
          </label>
          <span className="text-sm font-mono text-slate-600">
            {prompt.toneScoreThreshold.toFixed(2)}
          </span>
        </div>
        <input
          id="toneThreshold"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={prompt.toneScoreThreshold}
          onChange={(e) => setToneScoreThreshold(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>관대함 (0.0)</span>
          <span>엄격함 (1.0)</span>
        </div>
        <p className="text-xs text-slate-400">
          생성된 리뷰의 톤 점수가 이 값 이하이면 재생성을 요청합니다.
          톤 점수는 긍정적 단어와 부정적 단어의 비율로 계산됩니다.
        </p>
      </div>

      {/* 미리보기 */}
      <div className="rounded-lg bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700">템플릿 미리보기</h4>
        <div className="mt-2 rounded border border-slate-200 bg-white p-3 text-sm text-slate-600">
          {prompt.reviewTemplate
            .replace("{productName}", "삼성 갤럭시 S24")
            .replace("{category}", "가전디지털")
            .replace("{minLength}", String(prompt.minLength))
            .replace("{maxLength}", String(prompt.maxLength))}
        </div>
      </div>

      {/* 검증 규칙 요약 */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-sm font-medium text-amber-800">검증 규칙</h4>
        <ul className="mt-2 space-y-1 text-sm text-amber-700">
          <li>글자 수: {prompt.minLength}자 ~ {prompt.maxLength}자</li>
          <li>최소 톤 점수: {prompt.toneScoreThreshold}</li>
          <li>금지 패턴: 욕설, 광고성 문구 (공짜, 무료 증정, 100% 환불 등)</li>
        </ul>
      </div>
    </div>
  );
}
