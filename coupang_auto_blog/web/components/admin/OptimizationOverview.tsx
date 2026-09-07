import type {
  AnalyticsAnomaly,
  AnalyticsJobStatus,
  AnalyticsOptimizationSnapshot,
  DailyAnalyticsRollup,
  ImprovementGuardrail,
} from "@/types/analyticsOptimization";

type Props = {
  data: AnalyticsOptimizationSnapshot | null;
  error: string | null;
};

const number = (value: number) => value.toLocaleString("ko-KR");

const dateTime = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const dataStatusLabel = (status: DailyAnalyticsRollup["dataStatus"]) => {
  if (status === "complete") return "집계 완료";
  if (status === "no_data") return "데이터 없음";
  return "불완전 집계";
};

const dataStatusClass = (status: DailyAnalyticsRollup["dataStatus"]) =>
  status === "complete"
    ? "bg-emerald-100 text-emerald-800"
    : status === "no_data"
      ? "bg-slate-100 text-slate-600"
      : "bg-amber-100 text-amber-800";

const jobStatusLabel: Record<AnalyticsJobStatus["status"], string> = {
  running: "실행 중",
  success: "성공",
  failed: "실패",
  stale: "지연",
  unknown: "확인 필요",
};

const jobStatusClass: Record<AnalyticsJobStatus["status"], string> = {
  running: "bg-blue-100 text-blue-800",
  success: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  stale: "bg-amber-100 text-amber-800",
  unknown: "bg-slate-100 text-slate-600",
};

const anomalyClass: Record<AnalyticsAnomaly["severity"], string> = {
  critical: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-blue-200 bg-blue-50",
};

const guardrailClass: Record<ImprovementGuardrail["status"], string> = {
  pass: "bg-emerald-100 text-emerald-800",
  watch: "bg-amber-100 text-amber-800",
  fail: "bg-red-100 text-red-800",
  unknown: "bg-slate-100 text-slate-600",
  required: "bg-blue-100 text-blue-800",
  not_available: "bg-amber-100 text-amber-800",
};

const guardrailLabel: Record<ImprovementGuardrail["status"], string> = {
  pass: "통과",
  watch: "관찰",
  fail: "위반",
  unknown: "확인 필요",
  required: "필수",
  not_available: "데이터 없음",
};

const candidateStatusLabel: Record<string, string> = {
  proposed: "제안됨",
  approved: "승인 기록",
  rejected: "거절됨",
  expired: "만료됨",
  unknown: "확인 필요",
};

const anomalyStatusLabel: Record<AnalyticsAnomaly["status"], string> = {
  open: "열림",
  acknowledged: "확인됨",
  resolved: "해결됨",
};

export default function OptimizationOverview({ data, error }: Props) {
  if (error) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-amber-950">
              세션 기준 전환 분석
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              최적화 집계를 불러오지 못했습니다. 기존 방문·클릭 통계는 계속 확인할 수 있습니다.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            읽기 실패
          </span>
        </div>
        <p className="mt-3 text-xs text-amber-700">{error}</p>
      </section>
    );
  }

  if (!data) return null;

  const rollups = [...data.rollups].sort((a, b) =>
    b.businessDate.localeCompare(a.businessDate)
  );
  const latest = rollups[0] ?? null;
  const lowSample = Boolean(
    latest && latest.eligibleImpressionSessions < 100
  );
  const unreliable = Boolean(
    latest && (latest.dataStatus !== "complete" || lowSample)
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              세션 기준 전환 분석
            </h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
              Qualified CTR
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            유효 노출 세션 중 검증된 쿠팡 이동 세션 비율입니다. 아래 기존 참고 CTR과 계산 기준이 다릅니다.
            조회 범위는 최근 최대 31일입니다.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          생성 {dateTime(data.generatedAt)}
        </p>
      </div>

      {!latest ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm font-medium text-slate-600">집계 데이터가 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">
            일별 집계 작업이 완료되면 세션 기준 CTR이 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          {unreliable && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">해석 주의:</span>{" "}
              {latest.dataStatus !== "complete" &&
                `${dataStatusLabel(latest.dataStatus)} 상태입니다. `}
              {lowSample &&
                `유효 노출 세션이 ${number(latest.eligibleImpressionSessions)}건으로 100건 미만입니다. `}
              자동 개선 판단의 충분한 근거로 사용하지 마세요.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-lg bg-violet-50 p-3">
              <p className="text-[11px] font-medium text-violet-700">적격 CTR</p>
              <p className="mt-1 text-xl font-bold text-violet-900">
                {latest.qualifiedOutboundCtrPct === null
                  ? "-"
                  : `${latest.qualifiedOutboundCtrPct.toFixed(2)}%`}
              </p>
              <p className="mt-1 text-[10px] text-violet-600">세션 기준</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">유효 노출 세션</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {number(latest.eligibleImpressionSessions)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">적격 이동 세션</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {number(latest.qualifiedOutboundSessions)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">전체 이동 세션</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {number(latest.rawOutboundSessions)}
              </p>
            </div>
            <div className="col-span-2 rounded-lg bg-slate-50 p-3 lg:col-span-1">
              <p className="text-[11px] font-medium text-slate-500">고아 이동 세션</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {number(latest.orphanOutboundSessions)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold text-slate-500">
                  <th className="pb-2 pr-3">영업일</th>
                  <th className="pb-2 pr-3">상태</th>
                  <th className="pb-2 pr-3 text-right">유효 노출 세션</th>
                  <th className="pb-2 pr-3 text-right">적격 이동 세션</th>
                  <th className="pb-2 pr-3 text-right">적격 CTR</th>
                  <th
                    className="pb-2 pr-3 text-right"
                    title="CTR 집계에서 제외된 봇 이벤트 수"
                  >
                    봇 이벤트
                  </th>
                  <th
                    className="pb-2 pr-3 text-right"
                    title="같은 이벤트 ID로 감지된 추가 재전송 수. 원본 이벤트 1건은 CTR에 포함됩니다."
                  >
                    중복 재전송
                  </th>
                  <th className="pb-2 text-right">소스 기준 시각</th>
                </tr>
              </thead>
              <tbody>
                {rollups.slice(0, 14).map((row) => {
                  const rowLowSample = row.eligibleImpressionSessions < 100;
                  return (
                    <tr key={row.businessDate} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-medium text-slate-700">
                        {row.businessDate}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${dataStatusClass(row.dataStatus)}`}>
                          {dataStatusLabel(row.dataStatus)}
                        </span>
                        {rowLowSample && (
                          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            표본 부족
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-600">
                        {number(row.eligibleImpressionSessions)}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-600">
                        {number(row.qualifiedOutboundSessions)}
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold text-violet-700">
                        {row.qualifiedOutboundCtrPct === null
                          ? "-"
                          : `${row.qualifiedOutboundCtrPct.toFixed(2)}%`}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-500">
                        {number(row.botEventCount)}
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-500">
                        {number(row.duplicateEventCount)}
                      </td>
                      <td className="py-2 text-right text-xs text-slate-400">
                        {dateTime(row.sourceMaxReceivedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400">
            봇 이벤트는 CTR 집계에서 제외됩니다. 중복 재전송은 추가 전송 감지 건수이며,
            원본 이벤트 1건은 CTR에 정상 포함됩니다.
          </p>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800">이상 징후</h3>
          <div className="mt-3 space-y-2">
            {data.anomalies.length === 0 ? (
              <p className="text-xs text-slate-400">현재 열린 이상 징후가 없습니다.</p>
            ) : (
              data.anomalies.map((anomaly) => (
                <div key={anomaly.id} className={`rounded-lg border p-3 ${anomalyClass[anomaly.severity]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{anomaly.title}</p>
                    <span className="text-[10px] font-medium uppercase text-slate-500">
                      {anomalyStatusLabel[anomaly.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">{anomaly.reason}</p>
                  {anomaly.evidence && (
                    <p className="mt-1 text-[11px] text-slate-500">근거: {anomaly.evidence}</p>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">{dateTime(anomaly.detectedAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">개선 후보</h3>
            <span className="text-[10px] text-slate-400">읽기 전용 · 승인/거절 없음</span>
          </div>
          <div className="mt-3 space-y-3">
            {data.candidates.length === 0 ? (
              <p className="text-xs text-slate-400">검토할 개선 후보가 없습니다.</p>
            ) : (
              data.candidates.map((candidate) => (
                <article key={candidate.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{candidate.title}</p>
                      <p className="mt-1 text-xs text-slate-600">근거: {candidate.rationale}</p>
                      {candidate.evidence && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          관측값: {candidate.evidence}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {candidateStatusLabel[candidate.status] || candidate.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    <span>표본 {number(candidate.sample.eligibleSessions)} 세션</span>
                    <span>전환 {number(candidate.sample.conversions)}건</span>
                    {candidate.sample.requiredSessions !== null && (
                      <span>필요 표본 {number(candidate.sample.requiredSessions)} 세션</span>
                    )}
                    {candidate.risk && <span>위험: {candidate.risk}</span>}
                  </div>
                  {candidate.guardrails.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {candidate.guardrails.map((guardrail, index) => (
                        <div
                          key={`${guardrail.name}-${index}`}
                          className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500"
                        >
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${guardrailClass[guardrail.status]}`}
                          >
                            {guardrail.name}: {guardrailLabel[guardrail.status]}
                          </span>
                          {guardrail.detail && <span>{guardrail.detail}</span>}
                          {guardrail.blocksApproval && (
                            <span className="font-semibold text-red-600">승인 차단</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {(candidate.expectedImpact || candidate.uncertainty) && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      {candidate.expectedImpact && `기대 효과: ${candidate.expectedImpact}`}
                      {candidate.expectedImpact && candidate.uncertainty && " · "}
                      {candidate.uncertainty && `불확실성: ${candidate.uncertainty}`}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800">최근 집계 작업</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.jobs.length === 0 ? (
            <p className="text-xs text-slate-400">작업 실행 기록이 없습니다.</p>
          ) : (
            data.jobs.map((job, index) => (
              <div key={`${job.jobName}-${job.startedAt}-${index}`} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">{job.jobName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${jobStatusClass[job.status]}`}>
                    {jobStatusLabel[job.status]}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  기준일 {job.businessDate || "-"} · 완료 {dateTime(job.finishedAt)} · 시도 {number(job.attempts)}회
                </p>
                {job.error && <p className="mt-1 text-[11px] text-red-600">{job.error}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
