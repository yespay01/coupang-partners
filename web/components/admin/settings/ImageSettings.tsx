"use client";

import { useSettingsStore } from "@/stores/settingsStore";
import { DEFAULT_SETTINGS } from "@/types/settings";

export function ImageSettings() {
  const { settings } = useSettingsStore();
  // images 필드가 없을 수 있으므로 기본값 사용
  const images = settings.images || DEFAULT_SETTINGS.images;
  const stockProvider = images.stockImages.provider;
  const stockApiKeys = images.stockImages.apiKeys || DEFAULT_SETTINGS.images.stockImages.apiKeys;
  const currentStockApiKey = stockApiKeys[stockProvider] || "";

  const updateStockImages = (updates: Partial<typeof images.stockImages>) => {
    useSettingsStore.setState((state) => {
      const nextStockImages = {
        ...(state.settings.images?.stockImages || DEFAULT_SETTINGS.images.stockImages),
        ...updates,
      };
      return {
        settings: {
          ...state.settings,
          images: {
            ...(state.settings.images || DEFAULT_SETTINGS.images),
            stockImages: nextStockImages,
          },
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateStockApiKeyByProvider = (provider: "unsplash" | "pexels", apiKey: string) => {
    const baseStockImages = images.stockImages || DEFAULT_SETTINGS.images.stockImages;
    const baseKeys = baseStockImages.apiKeys || DEFAULT_SETTINGS.images.stockImages.apiKeys;

    updateStockImages({
      apiKeys: {
        ...baseKeys,
        [provider]: apiKey,
      },
      // 레거시 단일 필드도 현재 선택 provider 기준 값으로 동기화 (호환용)
      apiKey: provider === (baseStockImages.provider || "unsplash") ? apiKey : baseStockImages.apiKey,
    });
  };

  const updateStockProvider = (provider: "unsplash" | "pexels") => {
    const baseStockImages = images.stockImages || DEFAULT_SETTINGS.images.stockImages;
    const baseKeys = baseStockImages.apiKeys || DEFAULT_SETTINGS.images.stockImages.apiKeys;
    updateStockImages({
      provider,
      // 레거시 단일 필드도 현재 선택 provider의 키로 동기화 (호환용)
      apiKey: baseKeys[provider] || "",
    });
  };

  const updateAIImages = (updates: Partial<typeof images.aiImages>) => {
    useSettingsStore.setState((state) => ({
      settings: {
        ...state.settings,
        images: {
          ...(state.settings.images || DEFAULT_SETTINGS.images),
          aiImages: {
            ...(state.settings.images?.aiImages || DEFAULT_SETTINGS.images.aiImages),
            ...updates
          },
        },
      },
      hasUnsavedChanges: true,
    }));
  };

  const updateCoupangImages = (updates: Partial<typeof images.coupangDetailImages>) => {
    useSettingsStore.setState((state) => ({
      settings: {
        ...state.settings,
        images: {
          ...(state.settings.images || DEFAULT_SETTINGS.images),
          coupangDetailImages: {
            ...(state.settings.images?.coupangDetailImages || DEFAULT_SETTINGS.images.coupangDetailImages),
            ...updates
          },
        },
      },
      hasUnsavedChanges: true,
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">이미지 자동 수집</h2>
        <p className="mt-1 text-sm text-slate-500">
          리뷰에 자동으로 추가할 이미지 소스를 설정합니다. SEO와 사용자 경험을 향상시킵니다.
        </p>
      </div>

      {/* 1단계: 스톡 이미지 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              1단계: 스톡 이미지
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                무료
              </span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Unsplash/Pexels에서 카테고리 관련 고품질 이미지 자동 추가
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={images.stockImages.enabled}
              onChange={(e) => updateStockImages({ enabled: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">활성화</span>
          </label>
        </div>

        {images.stockImages.enabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="stockProvider" className="block text-sm font-medium text-slate-700">
                제공자
              </label>
              <select
                id="stockProvider"
                value={images.stockImages.provider}
                onChange={(e) => updateStockProvider(e.target.value as "unsplash" | "pexels")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="unsplash">Unsplash (추천)</option>
                <option value="pexels">Pexels</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="stockCount" className="block text-sm font-medium text-slate-700">
                이미지 개수
              </label>
              <input
                id="stockCount"
                type="number"
                min="1"
                max="10"
                value={images.stockImages.count}
                onChange={(e) => updateStockImages({ count: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="stockApiKey" className="block text-sm font-medium text-slate-700">
                {images.stockImages.provider === "unsplash" ? "Unsplash Access Key" : "Pexels API Key"}
                <a
                  href={images.stockImages.provider === "unsplash" ? "https://unsplash.com/developers" : "https://www.pexels.com/api/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  {images.stockImages.provider === "unsplash" ? "Unsplash 키 발급 →" : "Pexels 키 발급 →"}
                </a>
              </label>
              <input
                id="stockApiKey"
                type="text"
                value={currentStockApiKey}
                onChange={(e) => updateStockApiKeyByProvider(stockProvider, e.target.value)}
                placeholder={images.stockImages.provider === "unsplash"
                  ? "Unsplash Access Key를 입력하세요"
                  : "Pexels API Key를 입력하세요"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">
                {images.stockImages.provider === "unsplash"
                  ? "unsplash.com/developers에서 앱 등록 후 Access Key를 복사하세요"
                  : "pexels.com/api에서 가입 후 API Key를 복사하세요"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2단계: AI 이미지 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              2단계: AI 이미지 생성
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                유료 ($0.04/장)
              </span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              DALL-E로 상품 설명 기반 독창적인 이미지 생성
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={images.aiImages.enabled}
              onChange={(e) => updateAIImages({ enabled: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">활성화</span>
          </label>
        </div>

        {images.aiImages.enabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="aiProvider" className="block text-sm font-medium text-slate-700">
                제공자
              </label>
              <select
                id="aiProvider"
                value={images.aiImages.provider}
                onChange={(e) => updateAIImages({ provider: e.target.value as "dalle" | "stable-diffusion" })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="dalle">DALL-E 3 (OpenAI)</option>
                <option value="stable-diffusion">Stable Diffusion (향후 지원)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="aiCount" className="block text-sm font-medium text-slate-700">
                이미지 개수
              </label>
              <input
                id="aiCount"
                type="number"
                min="1"
                max="5"
                value={images.aiImages.count}
                onChange={(e) => updateAIImages({ count: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="aiQuality" className="block text-sm font-medium text-slate-700">
                품질
              </label>
              <select
                id="aiQuality"
                value={images.aiImages.quality}
                onChange={(e) => updateAIImages({ quality: e.target.value as "standard" | "hd" })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="standard">Standard ($0.04/장)</option>
                <option value="hd">HD ($0.08/장)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                월 예상 비용
              </label>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
                ${((images.aiImages.quality === "hd" ? 0.08 : 0.04) * images.aiImages.count * 100).toFixed(2)}/월
                <span className="ml-2 text-xs text-slate-500">(100개 리뷰 기준)</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded bg-amber-50 p-3 text-xs text-amber-700">
          ℹ️ AI 이미지 생성은 OpenAI API 키가 필요합니다 (AI 설정 탭에서 설정)
        </div>
      </div>

      {/* 3단계: 쿠팡 상세 이미지 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              3단계: 쿠팡 상세 이미지 수집
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                주의 필요
              </span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              상품 상세 페이지에서 추가 이미지 수집 (법적 회색 지대)
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={images.coupangDetailImages.enabled}
              onChange={(e) => updateCoupangImages({ enabled: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">활성화</span>
          </label>
        </div>

        {images.coupangDetailImages.enabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="coupangMaxCount" className="block text-sm font-medium text-slate-700">
                최대 이미지 개수
              </label>
              <input
                id="coupangMaxCount"
                type="number"
                min="1"
                max="10"
                value={images.coupangDetailImages.maxCount}
                onChange={(e) => updateCoupangImages({ maxCount: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="coupangDelay" className="block text-sm font-medium text-slate-700">
                요청 간격 (밀리초)
              </label>
              <input
                id="coupangDelay"
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={images.coupangDetailImages.delayMs}
                onChange={(e) => updateCoupangImages({ delayMs: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">
                서버 부하 방지를 위한 대기 시간 (권장: 2000ms 이상)
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 rounded bg-red-50 p-3 text-xs text-red-700">
          <div className="font-semibold mb-1">⚠️ 주의사항</div>
          <ul className="ml-4 list-disc space-y-1">
            <li>쿠팡 이용약관 위반 가능성이 있습니다</li>
            <li>과도한 요청 시 IP 차단될 수 있습니다</li>
            <li>이미지 저작권 문제가 발생할 수 있습니다</li>
            <li>자기 책임 하에 사용하시기 바랍니다</li>
          </ul>
        </div>
      </div>

      {/* 전체 요약 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="text-sm font-semibold text-blue-900">활성화된 이미지 소스</h4>
        <div className="mt-2 space-y-1 text-sm text-blue-700">
          {!images.stockImages.enabled && !images.aiImages.enabled && !images.coupangDetailImages.enabled && (
            <p>활성화된 이미지 소스가 없습니다. 쿠팡 메인 이미지만 사용됩니다.</p>
          )}
          {images.stockImages.enabled && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-600" />
              스톡 이미지 {images.stockImages.count}장 ({images.stockImages.provider})
            </div>
          )}
          {images.aiImages.enabled && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              AI 생성 이미지 {images.aiImages.count}장 ({images.aiImages.provider})
            </div>
          )}
          {images.coupangDetailImages.enabled && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              쿠팡 상세 이미지 최대 {images.coupangDetailImages.maxCount}장
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
