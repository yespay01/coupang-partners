"use client";

/**
 * 자동화 시스템 개요 섹션
 * - 타임라인
 * - 시스템 기능 목록
 */

import { automationTimeline, systemFeatures } from "./constants";

export function AutomationOverview() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
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

      {/* 시스템 기능 */}
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">시스템 기능</h2>
          <p className="mt-1 text-xs text-slate-500">현재 활성화된 자동화 기능 목록</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {systemFeatures.map((feature) => (
            <div
              key={feature.label}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{feature.icon}</span>
                <span className="text-sm font-semibold text-slate-900">{feature.label}</span>
              </div>
              <p className="text-xs text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-4 text-center">
          <p className="text-xs text-slate-500">
            Firebase Console에서 Functions 상태와 Scheduler 로그를 확인하세요.
          </p>
          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Firebase 콘솔 열기
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </article>
    </section>
  );
}
