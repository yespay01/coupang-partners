"use client";

import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCoupangConnectionTest } from "@/hooks/useSystemSettings";

export function CoupangSettings() {
  const {
    settings,
    setCoupangEnabled,
    setCoupangAccessKey,
    setCoupangSecretKey,
    setCoupangPartnerId,
    setCoupangSubId,
  } = useSettingsStore();

  const { coupang } = settings;
  const { testConnection, isTestingConnection, testResult, testError, resetTest } =
    useCoupangConnectionTest();

  const [showSecretKey, setShowSecretKey] = useState(false);

  const handleTest = () => {
    resetTest();
    testConnection();
  };

  const isConfigured = coupang.accessKey && coupang.secretKey && coupang.partnerId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">쿠팡 파트너스 API</h2>
        <p className="mt-1 text-sm text-slate-500">
          쿠팡 파트너스 API를 연동하여 상품 검색, 딥링크 생성 기능을 활성화합니다.
        </p>
      </div>

      {/* API 활성화 */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
        <div>
          <h3 className="font-medium text-slate-900">쿠팡 API 연동</h3>
          <p className="mt-1 text-sm text-slate-500">
            활성화하면 쿠팡 API를 통해 상품을 자동으로 수집합니다.
          </p>
        </div>
        <button
          onClick={() => setCoupangEnabled(!coupang.enabled)}
          disabled={!isConfigured}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            coupang.enabled ? "bg-blue-600" : "bg-slate-300"
          } ${!isConfigured ? "cursor-not-allowed opacity-50" : ""}`}
          role="switch"
          aria-checked={coupang.enabled}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              coupang.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* API 정보 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="text-sm font-medium text-blue-800">쿠팡 파트너스 API 안내</h4>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li>API 키는 쿠팡 파트너스에서 발급받을 수 있습니다.</li>
          <li>검색 API는 1시간당 최대 10회 호출 가능합니다.</li>
          <li>API 활성화 조건: 판매 총 금액 15만원 이상</li>
        </ul>
        <a
          href="https://partners.coupang.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-blue-600 underline hover:text-blue-800"
        >
          쿠팡 파트너스 바로가기
        </a>
      </div>

      {/* Access Key */}
      <div className="space-y-2">
        <label htmlFor="accessKey" className="block text-sm font-medium text-slate-700">
          Access Key
        </label>
        <input
          id="accessKey"
          type="text"
          value={coupang.accessKey}
          onChange={(e) => setCoupangAccessKey(e.target.value)}
          placeholder="ACCESS_KEY"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Secret Key */}
      <div className="space-y-2">
        <label htmlFor="secretKey" className="block text-sm font-medium text-slate-700">
          Secret Key
        </label>
        <div className="flex gap-2">
          <input
            id="secretKey"
            type={showSecretKey ? "text" : "password"}
            value={coupang.secretKey}
            onChange={(e) => setCoupangSecretKey(e.target.value)}
            placeholder="SECRET_KEY"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowSecretKey(!showSecretKey)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            {showSecretKey ? "숨기기" : "보기"}
          </button>
        </div>
      </div>

      {/* Partner ID */}
      <div className="space-y-2">
        <label htmlFor="partnerId" className="block text-sm font-medium text-slate-700">
          Partner ID
        </label>
        <input
          id="partnerId"
          type="text"
          value={coupang.partnerId}
          onChange={(e) => setCoupangPartnerId(e.target.value)}
          placeholder="파트너 ID"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Sub ID (선택) */}
      <div className="space-y-2">
        <label htmlFor="subId" className="block text-sm font-medium text-slate-700">
          Sub ID (선택)
        </label>
        <input
          id="subId"
          type="text"
          value={coupang.subId}
          onChange={(e) => setCoupangSubId(e.target.value)}
          placeholder="서브 아이디 (선택사항)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400">
          트래킹용 서브 아이디입니다. 비워두면 기본값이 사용됩니다.
        </p>
      </div>

      {/* 연결 테스트 */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleTest}
            disabled={!isConfigured || isTestingConnection}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isTestingConnection ? "테스트 중..." : "연결 테스트"}
          </button>

          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm ${
                testResult.success ? "text-green-600" : "text-red-600"
              }`}
            >
              {testResult.success ? (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  연결 성공
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {testResult.message}
                </>
              )}
            </div>
          )}

          {testError && (
            <span className="text-sm text-red-600">
              테스트 실패: {testError instanceof Error ? testError.message : "알 수 없는 오류"}
            </span>
          )}
        </div>
      </div>

      {/* 상태 요약 */}
      <div className="rounded-lg bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700">연동 상태</h4>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>
            API 연동:{" "}
            <span className={coupang.enabled ? "text-green-600" : "text-slate-500"}>
              {coupang.enabled ? "활성화" : "비활성화"}
            </span>
          </li>
          <li>
            Access Key:{" "}
            <span className={coupang.accessKey ? "text-green-600" : "text-red-600"}>
              {coupang.accessKey ? "설정됨" : "미설정"}
            </span>
          </li>
          <li>
            Secret Key:{" "}
            <span className={coupang.secretKey ? "text-green-600" : "text-red-600"}>
              {coupang.secretKey ? "설정됨" : "미설정"}
            </span>
          </li>
          <li>
            Partner ID:{" "}
            <span className={coupang.partnerId ? "text-green-600" : "text-red-600"}>
              {coupang.partnerId ? coupang.partnerId : "미설정"}
            </span>
          </li>
        </ul>
      </div>

      {/* 사용 가능 API 목록 */}
      <div className="rounded-lg border border-slate-200 p-4">
        <h4 className="text-sm font-medium text-slate-700">사용 가능한 API</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <h5 className="font-medium text-slate-800">검색 API</h5>
            <p className="mt-1 text-xs text-slate-500">
              키워드로 상품 검색 (1시간당 최대 10회)
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <h5 className="font-medium text-slate-800">베스트 상품 API</h5>
            <p className="mt-1 text-xs text-slate-500">
              카테고리별 100개 추천 상품 조회
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <h5 className="font-medium text-slate-800">딥링크 API</h5>
            <p className="mt-1 text-xs text-slate-500">
              제휴 링크 자동 생성
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <h5 className="font-medium text-slate-800">카테고리 추천 API</h5>
            <p className="mt-1 text-xs text-slate-500">
              상품 정보로 적합한 카테고리 추천
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
