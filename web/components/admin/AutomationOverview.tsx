"use client";

/**
 * 자동화 시스템 개요 섹션
 * - 타임라인
 */

import { automationTimeline } from "./constants";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function AutomationOverview() {
  const { settings } = useSystemSettings();
  const collectTime = settings?.automation?.collectSchedule || "02:00";
  const reviewTime = settings?.automation?.reviewGeneration?.schedule || "03:00";
  const automationEnabled = !!settings?.automation?.enabled;
  const reviewEnabled = !!settings?.automation?.reviewGeneration?.enabled;

  const timeline = automationTimeline.map((step) => {
    if (step.id === "collect") {
      return {
        ...step,
        time: collectTime,
        enabled: automationEnabled,
      };
    }
    if (step.id === "review") {
      return {
        ...step,
        time: reviewTime,
        enabled: reviewEnabled,
      };
    }
    return { ...step, enabled: true };
  });

  return (
    <section>
      {/* 자동화 타임라인 */}
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">자동화 타임라인</h2>
            <p className="mt-1 text-xs text-slate-500">일일 자동화 루틴 스케줄 (Asia/Seoul)</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            설정 연동
          </span>
        </div>
        <ul className="space-y-3">
          {timeline.map((step) => (
            <li key={step.time} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-baseline gap-3">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-mono font-semibold text-white">
                  {step.time}
                </span>
                <span className="text-sm font-semibold text-slate-900">{step.title}</span>
                {step.enabled === false && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    비활성화
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-600 pl-14">{step.description}</p>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
