import crypto from 'node:crypto';

export const CANDIDATE_STATUSES = new Set(['proposed', 'approved', 'rejected', 'expired']);
export const IMPROVEMENT_CANDIDATE_JOB_NAME = 'daily_improvement_candidates';

export const DIAGNOSTIC_THRESHOLDS = Object.freeze({
  minimumDailyEligibleSessions: 100,
  minimumCompleteDaysForPerformanceDirection: 14,
  minimumEligibleSessionsPerVariant: 1000,
  minimumConvertersPerVariant: 20,
  minimumExperimentRuntimeDays: 14,
  maximumBotRate: 0.2,
  maximumDuplicateRate: 0.15,
  maximumOrphanRate: 0.05,
  eventDropRatio: 0.5,
  ctrRelativeDecline: 0.2,
  ctrAbsoluteDeclinePercentagePoints: 0.5,
  sourceStaleAfterHours: 48,
});

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateOnly(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const match = String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function normalizeDataStatus(value) {
  if (value === 'complete') return 'complete';
  if (value === 'partial') return 'partial';
  if (value === 'missing' || value === 'no_data') return 'missing';
  return 'partial';
}

export function normalizeDailyMetricRollup(row) {
  const eligibleSessions = finiteNumber(
    row.eligibleSessions ?? row.eligible_impression_sessions,
    0
  );
  const outboundSessions = finiteNumber(
    row.outboundSessions ?? row.qualified_outbound_sessions,
    0
  );
  const rawOutboundSessions = finiteNumber(
    row.rawOutboundSessions ?? row.raw_outbound_sessions,
    outboundSessions
  );
  const providedCtr = row.qualifiedCtrPct
    ?? row.qualifiedCtr
    ?? row.qualified_outbound_ctr_pct;

  return {
    businessDateKst: dateOnly(row.businessDateKst ?? row.businessDate ?? row.business_date_kst),
    dimensionType: 'all',
    dimensionValue: 'all',
    eligibleSessions,
    outboundSessions,
    rawOutboundSessions,
    orphanOutboundSessions: finiteNumber(
      row.orphanOutboundSessions ?? row.orphan_outbound_sessions,
      0
    ),
    qualifiedCtrPct: providedCtr == null
      ? (eligibleSessions > 0 ? (100 * outboundSessions) / eligibleSessions : 0)
      : finiteNumber(providedCtr, 0),
    impressionEvents: finiteNumber(row.impressionEvents ?? row.impression_events, 0),
    outboundEvents: finiteNumber(row.outboundEvents ?? row.outbound_events, 0),
    totalEvents: finiteNumber(row.totalEvents ?? row.total_events, 0),
    botEvents: finiteNumber(row.botEvents ?? row.bot_events, 0),
    duplicateEvents: finiteNumber(row.duplicateEvents ?? row.duplicate_events, 0),
    sourceMaxReceivedAt: row.sourceMaxReceivedAt ?? row.source_max_received_at ?? null,
    dataStatus: normalizeDataStatus(row.dataStatus ?? row.data_status),
    calculationVersion: row.calculationVersion ?? row.calculation_version ?? null,
    calculatedAt: row.calculatedAt ?? row.calculated_at ?? null,
  };
}

function safeRate(numerator, denominator) {
  if (!(denominator > 0)) return 0;
  return numerator / denominator;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + finiteNumber(row[field], 0), 0);
}

function average(rows, field) {
  return rows.length ? sum(rows, field) / rows.length : 0;
}

function addDays(date, amount) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function consecutiveWindow(rowsByDate, endDate, days) {
  return Array.from({ length: days }, (_, index) => rowsByDate.get(addDays(endDate, -index)))
    .filter(Boolean)
    .reverse();
}

function requiredGuardrails(extra = []) {
  return [
    {
      metric: 'data_status',
      condition: '분석 기간의 모든 일자가 complete',
      status: 'required',
    },
    {
      metric: 'qualified_outbound_contract',
      condition: 'qualified_outbound_sessions <= eligible_impression_sessions',
      status: 'required',
    },
    ...extra,
  ];
}

function proposal({
  businessDateKst,
  key,
  type,
  title,
  hypothesis,
  priorityScore,
  evidence,
  sample,
  primaryMetric,
  guardrails,
  rollbackPlan,
  risks,
  recommendation,
  now,
}) {
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    candidateId: crypto.randomUUID(),
    candidateKey: key,
    businessDateKst,
    candidateType: type,
    surface: 'all',
    surfaceAvailability: 'not_available',
    title,
    hypothesis,
    status: 'proposed',
    priorityScore,
    evidence,
    sample,
    primaryMetric,
    guardrails,
    rollbackPlan,
    risks,
    recommendation,
    winnerDeclared: false,
    requiresHumanApproval: true,
    automaticChangeAllowed: false,
    createdAt,
    updatedAt: createdAt,
    expiresAt,
  };
}

function diagnosticSample(current, windowRows, thresholds) {
  return {
    currentEligibleSessions: current?.eligibleSessions ?? 0,
    completeDays: windowRows.filter((row) => row.dataStatus === 'complete').length,
    windowDays: windowRows.length,
    totalEligibleSessions: sum(windowRows, 'eligibleSessions'),
    totalQualifiedOutboundSessions: sum(windowRows, 'outboundSessions'),
    minimumDailyEligibleSessions: thresholds.minimumDailyEligibleSessions,
    minimumExperimentRuntimeDays: thresholds.minimumExperimentRuntimeDays,
    minimumEligibleSessionsPerVariant: thresholds.minimumEligibleSessionsPerVariant,
    minimumConvertersPerVariant: thresholds.minimumConvertersPerVariant,
    sampleSufficientForWinner: false,
  };
}

function dataQualityProposal(current, windowRows, options) {
  const { thresholds, now, code, title, evidence, priorityScore, rollbackPlan } = options;
  return proposal({
    businessDateKst: current.businessDateKst,
    key: `data_quality:${code}:all`,
    type: 'data_quality',
    title,
    hypothesis: '측정 데이터가 정상화되기 전에는 CTR 개선 방향을 신뢰할 수 없다.',
    priorityScore,
    evidence,
    sample: diagnosticSample(current, windowRows, thresholds),
    primaryMetric: {
      name: 'data_quality',
      current: current.dataStatus,
      baseline: 'complete',
      uncertainty: '데이터 장애 구간은 성과 0으로 해석하지 않는다.',
    },
    guardrails: requiredGuardrails(),
    rollbackPlan,
    risks: ['불완전한 데이터를 성과 하락으로 오인할 위험'],
    recommendation: {
      action: 'investigate_measurement',
      humanApprovalRequired: true,
      uiChange: false,
      contentChange: false,
    },
    now,
  });
}

export function validateImprovementCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new TypeError('candidate is required');
  if (!CANDIDATE_STATUSES.has(candidate.status)) throw new Error('invalid candidate status');
  if (!candidate.candidateKey || !candidate.title || !candidate.hypothesis) {
    throw new Error('candidate identity and hypothesis are required');
  }
  if (!candidate.evidence || Object.keys(candidate.evidence).length === 0) {
    throw new Error('candidate evidence is required');
  }
  if (!candidate.sample || Object.keys(candidate.sample).length === 0) {
    throw new Error('candidate sample is required');
  }
  if (!Array.isArray(candidate.guardrails) || candidate.guardrails.length === 0) {
    throw new Error('candidate guardrails are required');
  }
  if (!candidate.rollbackPlan?.trim()) throw new Error('candidate rollback plan is required');
  if (candidate.winnerDeclared !== false) throw new Error('winner declaration is not allowed');
  if (candidate.automaticChangeAllowed !== false) throw new Error('automatic changes are not allowed');
  if (candidate.requiresHumanApproval !== true) throw new Error('human approval is required');
  return candidate;
}

export function transitionImprovementCandidate(candidate, nextStatus, review = {}) {
  validateImprovementCandidate(candidate);
  const allowed = {
    proposed: new Set(['approved', 'rejected', 'expired']),
    approved: new Set(['expired']),
    rejected: new Set([]),
    expired: new Set([]),
  };
  if (!allowed[candidate.status]?.has(nextStatus)) {
    throw new Error(`invalid candidate transition: ${candidate.status} -> ${nextStatus}`);
  }
  if ((nextStatus === 'approved' || nextStatus === 'rejected') && !review.reviewedBy) {
    throw new Error('reviewedBy is required');
  }
  return {
    ...candidate,
    status: nextStatus,
    reviewedBy: review.reviewedBy ?? null,
    reviewNote: review.reviewNote ?? null,
    reviewedAt: (review.now ?? new Date()).toISOString(),
    updatedAt: (review.now ?? new Date()).toISOString(),
    automaticChangeAllowed: false,
    winnerDeclared: false,
  };
}

/**
 * overall 일별 rollup만으로 데이터 품질과 CTR 개선 방향 후보를 생성한다.
 * 후보는 제안서이며 어떤 UI·콘텐츠도 변경하지 않는다.
 */
export function generateImprovementCandidates(rawRows, options = {}) {
  const thresholds = { ...DIAGNOSTIC_THRESHOLDS, ...(options.thresholds ?? {}) };
  const now = options.now ?? new Date();
  const rows = rawRows
    .map(normalizeDailyMetricRollup)
    .filter((row) => row.businessDateKst)
    .sort((a, b) => a.businessDateKst.localeCompare(b.businessDateKst));
  const rowsByDate = new Map(rows.map((row) => [row.businessDateKst, row]));
  const businessDateKst = dateOnly(options.businessDateKst) ?? rows.at(-1)?.businessDateKst ?? dateOnly(now);
  const current = rowsByDate.get(businessDateKst) ?? normalizeDailyMetricRollup({
    business_date_kst: businessDateKst,
    data_status: 'no_data',
  });
  const last14 = consecutiveWindow(rowsByDate, businessDateKst, 14);
  const candidates = [];
  const finalize = () => {
    for (const candidate of candidates) validateImprovementCandidate(candidate);
    return {
      businessDateKst,
      dataStatus: current.dataStatus,
      surfaceAvailability: 'not_available',
      candidates,
    };
  };

  if (current.dataStatus === 'missing' || current.totalEvents === 0) {
    candidates.push(dataQualityProposal(current, last14, {
      thresholds,
      now,
      code: 'no_data',
      title: `${businessDateKst} 분석 이벤트 없음`,
      evidence: {
        businessDateKst,
        dataStatus: current.dataStatus,
        totalEvents: current.totalEvents,
      },
      priorityScore: 100,
      rollbackPlan: 'UI와 콘텐츠는 현재 상태를 유지하고 이벤트 수집 복구 후 해당 날짜 rollup만 재계산한다.',
    }));
    return finalize();
  }

  if (current.dataStatus !== 'complete') {
    candidates.push(dataQualityProposal(current, last14, {
      thresholds,
      now,
      code: 'partial_data',
      title: `${businessDateKst} 데이터 불완전`,
      evidence: {
        businessDateKst,
        dataStatus: current.dataStatus,
        totalEvents: current.totalEvents,
        sourceMaxReceivedAt: current.sourceMaxReceivedAt,
      },
      priorityScore: 95,
      rollbackPlan: '성과 판단을 보류하고 원천 이벤트가 완전해진 뒤 rollup을 재계산한다.',
    }));
    return finalize();
  }

  const sourceReceivedAt = current.sourceMaxReceivedAt ? new Date(current.sourceMaxReceivedAt) : null;
  const sourceAgeHours = sourceReceivedAt && !Number.isNaN(sourceReceivedAt.getTime())
    ? (now.getTime() - sourceReceivedAt.getTime()) / 3_600_000
    : null;
  if (sourceAgeHours == null || sourceAgeHours > thresholds.sourceStaleAfterHours) {
    candidates.push(dataQualityProposal(current, last14, {
      thresholds,
      now,
      code: 'stale_source',
      title: `${businessDateKst} 원천 이벤트 최신성 확인 필요`,
      evidence: { sourceMaxReceivedAt: current.sourceMaxReceivedAt, sourceAgeHours },
      priorityScore: 90,
      rollbackPlan: '성과 제안을 승인하지 않고 원천 이벤트 watermark 복구 후 rollup을 재계산한다.',
    }));
  }

  if (current.outboundSessions > current.eligibleSessions) {
    candidates.push(dataQualityProposal(current, last14, {
      thresholds,
      now,
      code: 'ctr_contract_violation',
      title: 'Qualified CTR 분모·분자 계약 위반',
      evidence: {
        eligibleSessions: current.eligibleSessions,
        qualifiedOutboundSessions: current.outboundSessions,
      },
      priorityScore: 100,
      rollbackPlan: '해당 rollup 사용을 중지하고 교집합 세션 계산을 수정한 뒤 전체 기간을 재집계한다.',
    }));
  }

  const botRate = safeRate(current.botEvents, current.totalEvents);
  const duplicateRate = safeRate(current.duplicateEvents, current.totalEvents);
  const orphanRate = safeRate(current.orphanOutboundSessions, current.rawOutboundSessions);
  const anomalySpecs = [
    ['high_bot_rate', '봇 이벤트 비율 급증', botRate, thresholds.maximumBotRate, '봇 필터 규칙을 검토하고 수정 전후 동일 기간을 재집계한다.'],
    ['high_duplicate_rate', '중복 이벤트 비율 급증', duplicateRate, thresholds.maximumDuplicateRate, '중복 제거 키와 재전송 경로를 점검하고 rollup을 재계산한다.'],
    ['high_orphan_rate', 'outbound 연결 정보 누락', orphanRate, thresholds.maximumOrphanRate, 'page_view_id/link_id 전달 경로를 복구하고 기존 UI는 유지한다.'],
  ];
  for (const [code, title, value, limit, rollbackPlan] of anomalySpecs) {
    if (value <= limit) continue;
    candidates.push(dataQualityProposal(current, last14, {
      thresholds,
      now,
      code,
      title,
      evidence: { currentRate: value, allowedRate: limit, businessDateKst },
      priorityScore: 85,
      rollbackPlan,
    }));
  }

  const previousComplete = rows
    .filter((row) => row.businessDateKst < businessDateKst && row.dataStatus === 'complete')
    .slice(-7);
  const baselineEvents = average(previousComplete, 'totalEvents');
  if (
    previousComplete.length >= 3
    && baselineEvents >= thresholds.minimumDailyEligibleSessions
    && current.totalEvents < baselineEvents * thresholds.eventDropRatio
  ) {
    candidates.push(dataQualityProposal(current, last14, {
      thresholds,
      now,
      code: 'event_volume_drop',
      title: '이벤트 수집량 급락',
      evidence: {
        currentTotalEvents: current.totalEvents,
        previousCompleteDays: previousComplete.length,
        baselineAverageTotalEvents: baselineEvents,
        dropRatio: safeRate(current.totalEvents, baselineEvents),
      },
      priorityScore: 90,
      rollbackPlan: 'UI 변경을 보류하고 수집 장애 여부를 확인한 뒤 누락 기간을 재집계한다.',
    }));
  }

  const hasBlockingQualityIssue = candidates.some((candidate) => candidate.candidateType === 'data_quality');
  if (current.eligibleSessions < thresholds.minimumDailyEligibleSessions) {
    candidates.push(proposal({
      businessDateKst,
      key: 'measurement:insufficient_daily_sample:all',
      type: 'measurement',
      title: '일일 성과 표본 부족',
      hypothesis: '하루 표본으로 UI 개선의 승패를 판단하면 우연을 학습할 가능성이 높다.',
      priorityScore: 75,
      evidence: {
        currentEligibleSessions: current.eligibleSessions,
        minimumDailyEligibleSessions: thresholds.minimumDailyEligibleSessions,
      },
      sample: diagnosticSample(current, last14, thresholds),
      primaryMetric: {
        name: 'qualified_outbound_ctr_pct',
        current: current.qualifiedCtrPct,
        baseline: null,
        uncertainty: '표본 부족으로 방향성 판단을 보류한다.',
      },
      guardrails: requiredGuardrails(),
      rollbackPlan: '기존 UI를 유지하고 최소 14일 동안 complete 데이터만 추가 수집한다.',
      risks: ['하루치 변동을 실제 효과로 오인할 위험'],
      recommendation: {
        action: 'collect_more_data',
        humanApprovalRequired: true,
        uiChange: false,
        contentChange: false,
      },
      now,
    }));
    return finalize();
  }

  const fourteenComplete = last14.length === 14 && last14.every((row) => row.dataStatus === 'complete');
  if (!fourteenComplete || hasBlockingQualityIssue) {
    if (!fourteenComplete) {
      candidates.push(proposal({
        businessDateKst,
        key: 'measurement:incomplete_14_day_baseline:all',
        type: 'measurement',
        title: '14일 기준선 미완성',
        hypothesis: '주말을 두 번 포함한 complete 기준선이 있어야 성과 방향을 비교할 수 있다.',
        priorityScore: 70,
        evidence: { requiredCompleteDays: 14, availableCompleteDays: last14.filter((row) => row.dataStatus === 'complete').length },
        sample: diagnosticSample(current, last14, thresholds),
        primaryMetric: { name: 'qualified_outbound_ctr_pct', current: current.qualifiedCtrPct, baseline: null, uncertainty: '기준선 미완성' },
        guardrails: requiredGuardrails(),
        rollbackPlan: '기존 UI를 유지하고 complete 일별 집계를 계속 수집한다.',
        risks: ['요일 효과와 수집 누락을 개선 효과로 오인할 위험'],
        recommendation: { action: 'collect_more_data', humanApprovalRequired: true, uiChange: false, contentChange: false },
        now,
      }));
    }
    return finalize();
  }

  const previous7 = last14.slice(0, 7);
  const recent7 = last14.slice(7);
  const previousCtr = 100 * safeRate(sum(previous7, 'outboundSessions'), sum(previous7, 'eligibleSessions'));
  const recentCtr = 100 * safeRate(sum(recent7, 'outboundSessions'), sum(recent7, 'eligibleSessions'));
  const absoluteDecline = previousCtr - recentCtr;
  const relativeDecline = previousCtr > 0 ? absoluteDecline / previousCtr : 0;
  if (
    absoluteDecline >= thresholds.ctrAbsoluteDeclinePercentagePoints
    && relativeDecline >= thresholds.ctrRelativeDecline
  ) {
    const sample = diagnosticSample(current, last14, thresholds);
    candidates.push(proposal({
      businessDateKst,
      key: 'ux_experiment:qualified_ctr_decline:all',
      type: 'ux_experiment',
      title: 'Qualified Outbound CTR 하락 원인 실험 제안',
      hypothesis: '첫 클릭 경로와 CTA의 선택 정보를 한 변수씩 검증하면 최근 CTR 하락 원인을 분리할 수 있다.',
      priorityScore: 65,
      evidence: {
        previous7QualifiedCtrPct: previousCtr,
        recent7QualifiedCtrPct: recentCtr,
        absoluteDeclinePercentagePoints: absoluteDecline,
        relativeDecline,
        comparison: '최근 7 complete 일 vs 직전 7 complete 일',
      },
      sample,
      primaryMetric: {
        name: 'qualified_outbound_ctr_pct',
        current: recentCtr,
        baseline: previousCtr,
        uncertainty: '관찰 비교는 인과관계를 증명하지 않으며 실험 승자를 선언하지 않는다.',
      },
      guardrails: requiredGuardrails([
        { metric: 'orphan_outbound_rate', condition: `<= ${thresholds.maximumOrphanRate}`, status: 'required' },
        { metric: 'bot_event_rate', condition: `<= ${thresholds.maximumBotRate}`, status: 'required' },
        { metric: 'EPC', condition: 'control 대비 악화되지 않음', status: 'not_available', blocksApproval: true },
        { metric: 'cancel_rate', condition: 'control 대비 상승하지 않음', status: 'not_available', blocksApproval: true },
      ]),
      rollbackPlan: '사전 지정한 control UI를 유지하고 오류·EPC·취소율 guardrail 위반 시 실험 트래픽을 0%로 되돌린다.',
      risks: [
        '현재 overall rollup에는 surface별 원인이 없어 대상 화면을 확정할 수 없음',
        'EPC와 취소율 데이터가 없어 승인 전에 별도 결합이 필요함',
      ],
      recommendation: {
        action: 'draft_experiment_for_human_review',
        firstExperiment: '홈 카드 쿠팡 직접 이동 vs 상세 경유',
        changeOneVariableOnly: true,
        minimumRuntimeDays: thresholds.minimumExperimentRuntimeDays,
        minimumEligibleSessionsPerVariant: thresholds.minimumEligibleSessionsPerVariant,
        minimumConvertersPerVariant: thresholds.minimumConvertersPerVariant,
        humanApprovalRequired: true,
        uiChange: false,
        contentChange: false,
      },
      now,
    }));
  } else {
    const fourteenDayCtr = 100 * safeRate(
      sum(last14, 'outboundSessions'),
      sum(last14, 'eligibleSessions')
    );
    candidates.push(proposal({
      businessDateKst,
      key: 'ux_experiment:baseline_ready:all',
      type: 'ux_experiment',
      title: '14일 기준선 기반 첫 경로 실험 제안',
      hypothesis: '홈 상품 카드에서 쿠팡으로 직접 이동하는 경로가 상세 경유보다 Qualified Outbound CTR을 높이는지 한 변수로 검증한다.',
      priorityScore: 55,
      evidence: {
        completeDays: 14,
        totalEligibleSessions: sum(last14, 'eligibleSessions'),
        totalQualifiedOutboundSessions: sum(last14, 'outboundSessions'),
        fourteenDayQualifiedCtrPct: fourteenDayCtr,
        trendConclusion: '승패 판단 없음; 실험 시작 검토가 가능한 기준선만 확인',
      },
      sample: diagnosticSample(current, last14, thresholds),
      primaryMetric: {
        name: 'qualified_outbound_ctr_pct',
        current: fourteenDayCtr,
        baseline: fourteenDayCtr,
        uncertainty: '관찰 기준선이며 어떤 UI 변형의 승자를 의미하지 않는다.',
      },
      guardrails: requiredGuardrails([
        { metric: 'orphan_outbound_rate', condition: `<= ${thresholds.maximumOrphanRate}`, status: 'required' },
        { metric: 'bot_event_rate', condition: `<= ${thresholds.maximumBotRate}`, status: 'required' },
        { metric: 'EPC', condition: 'control 대비 악화되지 않음', status: 'not_available', blocksApproval: true },
        { metric: 'cancel_rate', condition: 'control 대비 상승하지 않음', status: 'not_available', blocksApproval: true },
      ]),
      rollbackPlan: 'control인 기존 상세 경유 경로를 유지하고 오류·EPC·취소율 guardrail 위반 시 실험 트래픽을 0%로 되돌린다.',
      risks: [
        'overall rollup에는 홈 surface 분모가 없어 실험 시작 전 surface 계측 확인이 필요함',
        'EPC와 취소율 데이터가 없어 승인 전에 별도 결합이 필요함',
      ],
      recommendation: {
        action: 'draft_experiment_for_human_review',
        firstExperiment: '홈 카드 쿠팡 직접 이동 vs 상세 경유',
        changeOneVariableOnly: true,
        minimumRuntimeDays: thresholds.minimumExperimentRuntimeDays,
        minimumEligibleSessionsPerVariant: thresholds.minimumEligibleSessionsPerVariant,
        minimumConvertersPerVariant: thresholds.minimumConvertersPerVariant,
        humanApprovalRequired: true,
        uiChange: false,
        contentChange: false,
      },
      now,
    }));
  }

  return finalize();
}

export async function fetchDailyMetricRollups(db, { businessDateKst, lookbackDays = 28 } = {}) {
  const result = await db.query(
    `SELECT
       business_date_kst,
       eligible_impression_sessions,
       qualified_outbound_sessions,
       raw_outbound_sessions,
       orphan_outbound_sessions,
       qualified_outbound_ctr_pct,
       impression_events,
       outbound_events,
       total_events,
       bot_events,
       duplicate_events,
       source_max_received_at,
       data_status,
       calculation_version,
       calculated_at
     FROM daily_metric_rollups
     WHERE business_date_kst <= COALESCE($1::date, (NOW() AT TIME ZONE 'Asia/Seoul')::date)
     ORDER BY business_date_kst DESC
     LIMIT $2`,
    [dateOnly(businessDateKst), Math.min(Math.max(Number(lookbackDays) || 28, 14), 90)]
  );
  return result.rows.reverse();
}

export async function persistProposedCandidates(db, candidates) {
  let stored = 0;
  for (const candidate of candidates) {
    validateImprovementCandidate(candidate);
    if (candidate.status !== 'proposed') throw new Error('only proposed candidates can be persisted');
    await db.query(
      `UPDATE improvement_candidates
       SET status = 'expired', updated_at = NOW(), review_note = COALESCE(review_note, 'newer proposal superseded this row')
       WHERE candidate_key = $1
         AND business_date_kst < $2::date
         AND status = 'proposed'`,
      [candidate.candidateKey, candidate.businessDateKst]
    );
    const result = await db.query(
      `INSERT INTO improvement_candidates (
         candidate_id, candidate_key, business_date_kst, candidate_type, surface,
         title, hypothesis, status, priority_score, evidence, sample, primary_metric,
         guardrails, rollback_plan, risks, recommendation, winner_declared,
         requires_human_approval, automatic_change_allowed, expires_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,'proposed',$8,$9::jsonb,$10::jsonb,$11::jsonb,
         $12::jsonb,$13,$14::jsonb,$15::jsonb,FALSE,TRUE,FALSE,$16
       ) ON CONFLICT (candidate_key, business_date_kst) DO UPDATE SET
         priority_score = EXCLUDED.priority_score,
         evidence = EXCLUDED.evidence,
         sample = EXCLUDED.sample,
         primary_metric = EXCLUDED.primary_metric,
         guardrails = EXCLUDED.guardrails,
         rollback_plan = EXCLUDED.rollback_plan,
         risks = EXCLUDED.risks,
         recommendation = EXCLUDED.recommendation,
         updated_at = NOW()
       WHERE improvement_candidates.status = 'proposed'
       RETURNING candidate_id`,
      [
        candidate.candidateId,
        candidate.candidateKey,
        candidate.businessDateKst,
        candidate.candidateType,
        candidate.surface,
        candidate.title,
        candidate.hypothesis,
        candidate.priorityScore,
        JSON.stringify(candidate.evidence),
        JSON.stringify(candidate.sample),
        JSON.stringify(candidate.primaryMetric),
        JSON.stringify(candidate.guardrails),
        candidate.rollbackPlan,
        JSON.stringify(candidate.risks),
        JSON.stringify(candidate.recommendation),
        candidate.expiresAt,
      ]
    );
    if (result.rowCount === 1) stored += 1;
  }
  return stored;
}

export async function runImprovementCandidateJob(db, options = {}) {
  const persist = options.persist === true;
  if (!persist) {
    const rows = await fetchDailyMetricRollups(db, options);
    const result = generateImprovementCandidates(rows, options);
    return { ...result, dryRun: true, stored: 0 };
  }

  const businessDateKst = dateOnly(options.businessDateKst);
  if (!businessDateKst) throw new Error('persist job requires businessDateKst');
  const client = typeof db.connect === 'function' ? await db.connect() : db;
  const runId = crypto.randomUUID();

  try {
    await client.query('BEGIN');
    const lock = await client.query(
      'SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired',
      [`${IMPROVEMENT_CANDIDATE_JOB_NAME}:${businessDateKst}`]
    );
    if (!lock.rows[0]?.acquired) {
      await client.query('ROLLBACK');
      return { businessDateKst, status: 'skipped_locked', dryRun: false, stored: 0, candidates: [] };
    }

    await client.query(
      `INSERT INTO job_runs (
         run_id, job_name, business_date_kst, status, attempt_count,
         rows_affected, started_at, finished_at, error_code, error_message,
         metadata, created_at, updated_at
       ) VALUES ($1,$2,$3,'running',1,0,NOW(),NULL,NULL,NULL,'{}'::jsonb,NOW(),NOW())
       ON CONFLICT (job_name, business_date_kst) DO UPDATE SET
         run_id = EXCLUDED.run_id,
         status = 'running',
         attempt_count = job_runs.attempt_count + 1,
         rows_affected = 0,
         started_at = NOW(),
         finished_at = NULL,
         error_code = NULL,
         error_message = NULL,
         metadata = '{}'::jsonb,
         updated_at = NOW()`,
      [runId, IMPROVEMENT_CANDIDATE_JOB_NAME, businessDateKst]
    );

    const rows = await fetchDailyMetricRollups(client, { ...options, businessDateKst });
    const result = generateImprovementCandidates(rows, { ...options, businessDateKst });
    const stored = await persistProposedCandidates(client, result.candidates);
    await client.query(
      `UPDATE job_runs
          SET status = 'success', rows_affected = $3, finished_at = NOW(),
              metadata = $4::jsonb, updated_at = NOW()
        WHERE job_name = $1 AND business_date_kst = $2::date`,
      [
        IMPROVEMENT_CANDIDATE_JOB_NAME,
        businessDateKst,
        stored,
        JSON.stringify({
          candidateCount: result.candidates.length,
          stored,
          dataStatus: result.dataStatus,
          surfaceAvailability: result.surfaceAvailability,
          automaticChangesApplied: false,
        }),
      ]
    );
    await client.query('COMMIT');
    return { ...result, status: 'success', dryRun: false, stored };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    await db.query(
      `INSERT INTO job_runs (
         run_id, job_name, business_date_kst, status, attempt_count,
         rows_affected, started_at, finished_at, error_code, error_message,
         metadata, created_at, updated_at
       ) VALUES ($1,$2,$3,'failed',1,0,NOW(),NOW(),$4,$5,$6::jsonb,NOW(),NOW())
       ON CONFLICT (job_name, business_date_kst) DO UPDATE SET
         run_id = EXCLUDED.run_id,
         status = 'failed',
         attempt_count = job_runs.attempt_count + 1,
         finished_at = NOW(),
         error_code = EXCLUDED.error_code,
         error_message = EXCLUDED.error_message,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        runId,
        IMPROVEMENT_CANDIDATE_JOB_NAME,
        businessDateKst,
        error.code || 'IMPROVEMENT_CANDIDATE_JOB_FAILED',
        String(error.message).slice(0, 500),
        JSON.stringify({ automaticChangesApplied: false }),
      ]
    );
    throw error;
  } finally {
    if (client !== db && typeof client.release === 'function') client.release();
  }
}
