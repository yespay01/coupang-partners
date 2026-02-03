"use client";

import { useSettingsStore } from "@/stores/settingsStore";

export function AutomationSettings() {
  const {
    settings,
    setAutomationEnabled,
    setCollectSchedule,
    setMaxProductsPerRun,
  } = useSettingsStore();

  const { automation } = settings;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">자동 수집 설정</h2>
        <p className="mt-1 text-sm text-slate-500">
          쿠팡 상품을 자동으로 수집하는 스케줄과 옵션을 설정합니다.
        </p>
      </div>

      {/* 자동 수집 활성화 */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
        <div>
          <h3 className="font-medium text-slate-900">자동 수집 활성화</h3>
          <p className="mt-1 text-sm text-slate-500">
            설정된 스케줄에 따라 자동으로 상품을 수집합니다.
          </p>
        </div>
        <button
          onClick={() => setAutomationEnabled(!automation.enabled)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            automation.enabled ? "bg-blue-600" : "bg-slate-300"
          }`}
          role="switch"
          aria-checked={automation.enabled}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              automation.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* 수집 스케줄 */}
      <div className="space-y-2">
        <label htmlFor="collectSchedule" className="block text-sm font-medium text-slate-700">
          수집 스케줄 (시간)
        </label>
        <div className="flex items-center gap-2">
          <input
            id="collectSchedule"
            type="time"
            value={automation.collectSchedule}
            onChange={(e) => setCollectSchedule(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-500">매일 이 시간에 자동 수집이 실행됩니다.</span>
        </div>
        <p className="text-xs text-slate-400">
          서버 시간 기준 (Asia/Seoul)
        </p>
      </div>

      {/* 1회 최대 수집 상품 수 */}
      <div className="space-y-2">
        <label htmlFor="maxProducts" className="block text-sm font-medium text-slate-700">
          1회 최대 수집 상품 수
        </label>
        <div className="flex items-center gap-4">
          <input
            id="maxProducts"
            type="range"
            min="1"
            max="100"
            value={automation.maxProductsPerRun}
            onChange={(e) => setMaxProductsPerRun(Number(e.target.value))}
            className="h-2 w-48 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
          />
          <input
            type="number"
            min="1"
            max="100"
            value={automation.maxProductsPerRun}
            onChange={(e) => setMaxProductsPerRun(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-500">개</span>
        </div>
        <p className="text-xs text-slate-400">
          한 번의 자동 수집에서 최대 수집할 상품 수를 지정합니다. (1~100)
        </p>
      </div>

      {/* 상태 표시 */}
      <div className="rounded-lg bg-slate-50 p-4">
        <h4 className="text-sm font-medium text-slate-700">현재 설정 요약</h4>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>
            상태:{" "}
            <span className={automation.enabled ? "text-green-600" : "text-slate-500"}>
              {automation.enabled ? "활성화됨" : "비활성화됨"}
            </span>
          </li>
          <li>실행 시간: 매일 {automation.collectSchedule}</li>
          <li>1회 최대 수집: {automation.maxProductsPerRun}개</li>
        </ul>
      </div>
    </div>
  );
}
