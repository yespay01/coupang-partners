"use client";

/**
 * 수익 지표 카드 섹션
 */

import type { EarningsMetric } from "@/hooks/useAdminDashboardData";

type MetricsSectionProps = {
  metrics: EarningsMetric[];
};

export function MetricsSection({ metrics }: MetricsSectionProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.label ?? metric.id}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {metric.label}
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p>
          {metric.trend ? <p className="mt-2 text-xs text-emerald-600">{metric.trend}</p> : null}
        </article>
      ))}
    </section>
  );
}
