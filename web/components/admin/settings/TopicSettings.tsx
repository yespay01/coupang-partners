"use client";

import { useState, type KeyboardEvent } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { COUPANG_PL_BRANDS } from "@/types/settings";

export function TopicSettings() {
  const {
    settings,
    toggleCategory,
    addKeyword,
    removeKeyword,
    setGoldboxEnabled,
    toggleCoupangPLBrand,
  } = useSettingsStore();
  const { topics } = settings;
  const [keywordInput, setKeywordInput] = useState("");

  const handleKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (keywordInput.trim()) {
        addKeyword(keywordInput.trim());
        setKeywordInput("");
      }
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      addKeyword(keywordInput.trim());
      setKeywordInput("");
    }
  };

  const enabledCategories = topics.categories.filter((cat) => cat.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">주제 설정</h2>
        <p className="mt-1 text-sm text-slate-500">
          수집할 카테고리와 검색 키워드를 설정합니다.
        </p>
      </div>

      {/* 카테고리 선택 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            수집 카테고리
          </label>
          <span className="text-xs text-slate-500">
            {enabledCategories.length}개 선택됨
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {topics.categories.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                category.enabled
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    category.enabled ? "bg-blue-500" : "bg-slate-300"
                  }`}
                />
                {category.name}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          선택한 카테고리의 베스트 상품을 자동으로 수집합니다.
        </p>
      </div>

      {/* 골드박스 설정 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            골드박스 상품 수집
          </label>
          <button
            onClick={() => setGoldboxEnabled(!topics.goldboxEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              topics.goldboxEnabled ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                topics.goldboxEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-slate-400">
          골드박스(타임딜) 상품을 자동으로 수집합니다. (매일 오전 7:30 업데이트)
        </p>
      </div>

      {/* 쿠팡 PL 브랜드 선택 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            쿠팡 PL 브랜드
          </label>
          <span className="text-xs text-slate-500">
            {(topics.coupangPLBrands || []).length}개 선택됨
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {COUPANG_PL_BRANDS.map((brand) => {
            const isSelected = (topics.coupangPLBrands || []).includes(brand.id);
            return (
              <button
                key={brand.id}
                onClick={() => toggleCoupangPLBrand(brand.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isSelected ? "bg-green-500" : "bg-slate-300"
                    }`}
                  />
                  {brand.name}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">
          쿠팡 자체 브랜드(PL) 상품을 수집합니다. 높은 수수료율을 제공합니다.
        </p>
      </div>

      {/* 키워드 관리 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          검색 키워드
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="키워드 입력 후 Enter"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAddKeyword}
            disabled={!keywordInput.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            추가
          </button>
        </div>

        {/* 키워드 태그 목록 */}
        {topics.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topics.keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {keyword}
                <button
                  onClick={() => removeKeyword(keyword)}
                  className="ml-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  aria-label={`${keyword} 삭제`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">등록된 키워드가 없습니다.</p>
        )}
        <p className="text-xs text-slate-400">
          입력한 키워드로 쿠팡에서 상품을 검색합니다.
        </p>
      </div>

      {/* 수집 전략 안내 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="text-sm font-semibold text-blue-900">수집 전략</h4>
        <p className="mt-1 text-xs text-blue-700">
          상품은 다음 우선순위로 자동 수집됩니다:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-blue-700">
          <li className="flex items-center gap-2">
            <span className="font-medium">• 골드박스 20%</span>
            <span className="text-blue-600">- 타임딜 상품 (클릭률 높음)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium">• 카테고리 베스트 40%</span>
            <span className="text-blue-600">- 인기 검증된 상품</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium">• 키워드 검색 30%</span>
            <span className="text-blue-600">- 주제 관련 상품</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-medium">• 쿠팡 PL 10%</span>
            <span className="text-blue-600">- 높은 수수료율</span>
          </li>
        </ul>
      </div>

      {/* 설정 요약 */}
      <div className="rounded-lg bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700">수집 범위 요약</h4>
        <div className="mt-2 space-y-2 text-sm text-slate-600">
          <div>
            <span className="font-medium">골드박스:</span>{" "}
            {topics.goldboxEnabled ? (
              <span className="text-green-600">활성화</span>
            ) : (
              <span className="text-slate-400">비활성화</span>
            )}
          </div>
          <div>
            <span className="font-medium">선택된 카테고리:</span>{" "}
            {enabledCategories.length > 0
              ? enabledCategories.map((cat) => cat.name).join(", ")
              : "없음"}
          </div>
          <div>
            <span className="font-medium">키워드 수:</span> {topics.keywords.length}개
          </div>
          <div>
            <span className="font-medium">쿠팡 PL 브랜드:</span>{" "}
            {(topics.coupangPLBrands || []).length > 0
              ? `${(topics.coupangPLBrands || []).length}개 선택됨`
              : "없음"}
          </div>
        </div>
      </div>
    </div>
  );
}
