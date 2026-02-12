"use client";

/**
 * 자동화 시스템 개요 섹션
 * - 타임라인
 */

import { automationTimeline } from "./constants";

export function AutomationOverview() {
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
            활성화됨
          </span>
        </div>
        <ul className="space-y-3">
          {automationTimeline.map((step) => (
            <li key={step.time} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-baseline gap-3">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-mono font-semibold text-white">
                  {step.time}
                </span>
                <span className="text-sm font-semibold text-slate-900">{step.title}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600 pl-14">{step.description}</p>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
