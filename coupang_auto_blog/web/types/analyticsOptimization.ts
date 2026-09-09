export type AnalyticsDataStatus = "complete" | "incomplete" | "no_data";

export type DailyAnalyticsRollup = {
  businessDate: string;
  eligibleImpressionSessions: number;
  qualifiedOutboundSessions: number;
  rawOutboundSessions: number;
  orphanOutboundSessions: number;
  qualifiedOutboundCtrPct: number | null;
  impressionEventCount: number;
  outboundEventCount: number;
  totalEventCount: number;
  botEventCount: number;
  duplicateEventCount: number;
  sourceMaxReceivedAt: string | null;
  dataStatus: AnalyticsDataStatus;
  calculationVersion: string | null;
  calculatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PlacementAnalyticsMetric = {
  surface: string;
  position: string;
  eligibleImpressionSessions: number;
  qualifiedOutboundSessions: number;
  rawOutboundSessions: number;
  orphanOutboundSessions: number;
  qualifiedOutboundCtrPct: number | null;
  impressionEventCount: number;
  outboundEventCount: number;
  firstBusinessDate: string | null;
  lastBusinessDate: string | null;
};

export type AnalyticsAnomaly = {
  id: string;
  title: string;
  metric: string | null;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  reason: string;
  evidence: string | null;
  detectedAt: string | null;
};

export type ImprovementGuardrail = {
  name: string;
  status:
    | "pass"
    | "watch"
    | "fail"
    | "unknown"
    | "required"
    | "not_available";
  detail: string | null;
  blocksApproval: boolean;
};

export type ImprovementCandidate = {
  id: string;
  title: string;
  status: string;
  rationale: string;
  evidence: string | null;
  expectedImpact: string | null;
  nextAction: string | null;
  uncertainty: string | null;
  risk: string | null;
  sample: {
    eligibleSessions: number;
    conversions: number;
    requiredSessions: number | null;
  };
  guardrails: ImprovementGuardrail[];
  createdAt: string | null;
};

export type AnalyticsJobStatus = {
  jobName: string;
  businessDate: string | null;
  status: "running" | "success" | "failed" | "stale" | "unknown";
  startedAt: string | null;
  finishedAt: string | null;
  attempts: number;
  error: string | null;
};

export type AnalyticsOptimizationSnapshot = {
  generatedAt: string | null;
  rollups: DailyAnalyticsRollup[];
  placements: PlacementAnalyticsMetric[];
  anomalies: AnalyticsAnomaly[];
  candidates: ImprovementCandidate[];
  jobs: AnalyticsJobStatus[];
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const asStringValue = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const summarizeRecord = (value: unknown): string | null => {
  const record = asRecord(value);
  const parts = Object.entries(record)
    .map(([key, item]) => {
      const rendered = asStringValue(item);
      return rendered ? `${key}: ${rendered}` : null;
    })
    .filter((item): item is string => Boolean(item));
  return parts.length > 0 ? parts.join(" · ") : null;
};

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeDataStatus = (value: unknown): AnalyticsDataStatus => {
  if (value === "complete" || value === "incomplete" || value === "no_data") {
    return value;
  }
  if (value === "partial") return "incomplete";
  if (value === "missing") return "no_data";
  return "incomplete";
};

const normalizeRollup = (value: unknown): DailyAnalyticsRollup => {
  const row = asRecord(value);
  return {
    businessDate: asString(row.businessDateKst, asString(row.businessDate)),
    eligibleImpressionSessions: asNumber(row.eligibleImpressionSessions),
    qualifiedOutboundSessions: asNumber(row.qualifiedOutboundSessions),
    rawOutboundSessions: asNumber(row.rawOutboundSessions),
    orphanOutboundSessions: asNumber(row.orphanOutboundSessions),
    qualifiedOutboundCtrPct: asNullableNumber(row.qualifiedOutboundCtrPct),
    impressionEventCount: asNumber(
      row.impressionEventCount,
      asNumber(row.impressionEvents)
    ),
    outboundEventCount: asNumber(
      row.outboundEventCount,
      asNumber(row.outboundEvents)
    ),
    totalEventCount: asNumber(row.totalEventCount, asNumber(row.totalEvents)),
    botEventCount: asNumber(row.botEventCount, asNumber(row.botEvents)),
    duplicateEventCount: asNumber(
      row.duplicateEventCount,
      asNumber(row.duplicateEvents)
    ),
    sourceMaxReceivedAt: asNullableString(row.sourceMaxReceivedAt),
    dataStatus: normalizeDataStatus(row.dataStatus),
    calculationVersion: asStringValue(row.calculationVersion),
    calculatedAt: asNullableString(row.calculatedAt),
    createdAt: asNullableString(row.createdAt),
    updatedAt: asNullableString(row.updatedAt),
  };
};

const normalizePlacement = (value: unknown): PlacementAnalyticsMetric => {
  const row = asRecord(value);
  return {
    surface: asString(row.surface, "unknown"),
    position: asString(row.position, "unknown"),
    eligibleImpressionSessions: asNumber(row.eligibleImpressionSessions),
    qualifiedOutboundSessions: asNumber(row.qualifiedOutboundSessions),
    rawOutboundSessions: asNumber(row.rawOutboundSessions),
    orphanOutboundSessions: asNumber(row.orphanOutboundSessions),
    qualifiedOutboundCtrPct: asNullableNumber(row.qualifiedOutboundCtrPct),
    impressionEventCount: asNumber(row.impressionEventCount),
    outboundEventCount: asNumber(row.outboundEventCount),
    firstBusinessDate: asNullableString(row.firstBusinessDate),
    lastBusinessDate: asNullableString(row.lastBusinessDate),
  };
};

const normalizeAnomaly = (value: unknown, index: number): AnalyticsAnomaly => {
  const row = asRecord(value);
  const severity =
    row.severity === "critical" || row.severity === "warning" || row.severity === "info"
      ? row.severity
      : "info";
  const status =
    row.status === "resolved" || row.status === "acknowledged" || row.status === "open"
      ? row.status
      : "open";

  return {
    id: asString(row.anomalyId, asString(row.id, `anomaly-${index}`)),
    title: asString(
      row.title,
      [asNullableString(row.metricName), asNullableString(row.anomalyType)]
        .filter(Boolean)
        .join(" · ") || "이상 징후"
    ),
    metric: asNullableString(row.metricName) || asNullableString(row.metric),
    severity,
    status,
    reason:
      asNullableString(row.reason) ||
      summarizeRecord(row.details) ||
      "설정된 임계치를 벗어난 지표입니다.",
    evidence:
      asNullableString(row.evidence) ||
      [
        asNullableNumber(row.observedValue) === null
          ? null
          : `관측 ${asNullableNumber(row.observedValue)}`,
        asNullableNumber(row.baselineValue) === null
          ? null
          : `기준 ${asNullableNumber(row.baselineValue)}`,
        asNullableNumber(row.thresholdValue) === null
          ? null
          : `임계 ${asNullableNumber(row.thresholdValue)}`,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    detectedAt: asNullableString(row.detectedAt),
  };
};

const normalizeCandidate = (value: unknown, index: number): ImprovementCandidate => {
  const row = asRecord(value);
  const sample = asRecord(row.sample);

  return {
    id: asString(row.candidateId, asString(row.id, `candidate-${index}`)),
    title: asString(row.title, "개선 후보"),
    status: asString(row.status, "unknown"),
    rationale: asString(
      row.hypothesis,
      asString(row.rationale, "근거가 제공되지 않았습니다.")
    ),
    evidence: asNullableString(row.evidence) || summarizeRecord(row.evidence),
    expectedImpact: asNullableString(row.expectedImpact),
    nextAction:
      asNullableString(row.nextAction) ||
      asNullableString(asRecord(row.recommendation).nextAction),
    uncertainty:
      asNullableString(row.uncertainty) ||
      asNullableString(asRecord(row.primaryMetric).uncertainty),
    risk:
      asNullableString(row.risk) ||
      asArray(row.risks)
        .map(asStringValue)
        .filter((item): item is string => Boolean(item))
        .join(" · ") ||
      null,
    sample: {
      eligibleSessions: asNumber(
        sample.totalEligibleSessions,
        asNumber(sample.currentEligibleSessions, asNumber(sample.eligibleSessions))
      ),
      conversions: asNumber(
        sample.totalQualifiedOutboundSessions,
        asNumber(sample.conversions)
      ),
      requiredSessions: asNullableNumber(
        sample.minimumEligibleSessionsPerVariant ?? sample.requiredSessions
      ),
    },
    guardrails: asArray(row.guardrails).map((guardrail) => {
      const item = asRecord(guardrail);
      const status =
        item.status === "pass" ||
        item.status === "watch" ||
        item.status === "fail" ||
        item.status === "unknown" ||
        item.status === "required" ||
        item.status === "not_available"
          ? item.status
          : "unknown";
      return {
        name: asString(item.metric, asString(item.name, "가드레일")),
        status,
        detail:
          asNullableString(item.condition) || asNullableString(item.detail),
        blocksApproval: item.blocksApproval === true,
      };
    }),
    createdAt: asNullableString(row.createdAt),
  };
};

const normalizeJob = (value: unknown): AnalyticsJobStatus => {
  const row = asRecord(value);
  const status =
    row.status === "running" ||
    row.status === "success" ||
    row.status === "failed" ||
    row.status === "stale"
      ? row.status
      : "unknown";

  return {
    jobName: asString(row.jobName, "알 수 없는 작업"),
    businessDate:
      asNullableString(row.businessDateKst) || asNullableString(row.businessDate),
    status,
    startedAt: asNullableString(row.startedAt),
    finishedAt: asNullableString(row.finishedAt),
    attempts: asNumber(row.attemptCount, asNumber(row.attempts)),
    error: asNullableString(row.errorMessage) || asNullableString(row.error),
  };
};

export function normalizeOptimizationSnapshot(
  value: unknown
): AnalyticsOptimizationSnapshot {
  const data = asRecord(value);
  return {
    generatedAt: asNullableString(data.generatedAt),
    rollups: asArray(data.rollups)
      .map(normalizeRollup)
      .filter((row) => row.businessDate.length > 0),
    placements: asArray(data.placements).map(normalizePlacement),
    anomalies: asArray(data.anomalies).map(normalizeAnomaly),
    candidates: asArray(data.candidates).map(normalizeCandidate),
    jobs: asArray(data.jobs).map(normalizeJob),
  };
}
