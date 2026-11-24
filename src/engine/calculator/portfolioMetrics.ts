import { ReworkCategory } from '../../types/economics';
import {
  ModelEfficiencyPoint,
  PortfolioMetricsSummary,
  ReworkCategoryAggregate,
  TraceSettlementLedger,
} from '../../types/settlement';

const REWORK_CATEGORY_LABELS: Record<ReworkCategory, string> = {
  TOOL_SCHEMA_RETRY: 'Tool Schema Retries',
  HALLUCINATION_CORRECTION: 'Policy & Hallucination Loops',
  CONTEXT_THRASHING: 'Context Window Thrashing',
  COMPILATION_TEST_LOOP: 'Compile & Pytest Retry Loops',
  HUMAN_ESCALATION_HANDOFF: 'Human Escalation Handoffs',
};

export function computePortfolioMetrics(
  ledgers: TraceSettlementLedger[]
): PortfolioMetricsSummary {
  const totalTasks = ledgers.length;

  if (totalTasks === 0) {
    return {
      totalTasks: 0,
      resolvedTasks: 0,
      firstPassResolvedTasks: 0,
      escalatedOrFailedTasks: 0,
      resolutionRatePct: 0,
      firstPassYieldPct: 0,
      meanTrueUnitCostUsd: 0,
      meanNominalApiCostUsd: 0,
      meanHumanBaselineCostUsd: 0,
      totalTrueCostUsd: 0,
      totalNominalApiCostUsd: 0,
      totalFirstPassTokenCostUsd: 0,
      totalReworkTokenCostUsd: 0,
      totalHumanOversightCostUsd: 0,
      totalHumanEscalationCostUsd: 0,
      totalSlaPenaltyUsd: 0,
      totalHiddenReworkTaxUsd: 0,
      totalHumanBaselineCostUsd: 0,
      totalNetSurplusUsd: 0,
      totalCacheSavingsUsd: 0,
      portfolioReworkTaxPct: 0,
      netFinOpsMarginPct: 0,
      hiddenCostMultiplier: 1,
      totalTokens: 0,
      totalReworkTokens: 0,
      slaBreachCount: 0,
      reworkByCategory: [],
      efficiencyPoints: [],
    };
  }

  let resolvedTasks = 0;
  let firstPassResolvedTasks = 0;
  let escalatedOrFailedTasks = 0;

  let totalTrueCostUsd = 0;
  let totalNominalApiCostUsd = 0;
  let totalFirstPassTokenCostUsd = 0;
  let totalReworkTokenCostUsd = 0;
  let totalHumanOversightCostUsd = 0;
  let totalHumanEscalationCostUsd = 0;
  let totalSlaPenaltyUsd = 0;
  let totalHiddenReworkTaxUsd = 0;
  let totalHumanBaselineCostUsd = 0;
  let totalCacheSavingsUsd = 0;
  let totalTokens = 0;
  let totalReworkTokens = 0;
  let slaBreachCount = 0;

  const categoryAccumulator = new Map<
    ReworkCategory,
    { eventCount: number; costUsd: number; tokens: number }
  >();

  const efficiencyPoints: ModelEfficiencyPoint[] = [];

  for (const ledger of ledgers) {
    const status = ledger.trace.resolutionStatus;
    if (status === 'resolved_first_pass' || status === 'resolved_with_rework') {
      resolvedTasks += 1;
    }
    if (status === 'resolved_first_pass') {
      firstPassResolvedTasks += 1;
    }
    if (status === 'escalated_to_human' || status === 'failed_unresolved') {
      escalatedOrFailedTasks += 1;
    }

    totalTrueCostUsd += ledger.trueUnitCostUsd;
    totalNominalApiCostUsd += ledger.nominalApiCostUsd;
    totalFirstPassTokenCostUsd += ledger.firstPassTokenCostUsd;
    totalReworkTokenCostUsd += ledger.reworkTokenCostUsd;
    totalHumanOversightCostUsd += ledger.humanOversightCostUsd;
    totalHumanEscalationCostUsd += ledger.humanEscalationCostUsd;
    totalSlaPenaltyUsd += ledger.slaAudit.accruedPenaltyUsd;
    totalHiddenReworkTaxUsd += ledger.hiddenReworkTaxUsd;
    totalHumanBaselineCostUsd += ledger.humanBaselineCostUsd;
    totalCacheSavingsUsd += ledger.cacheSavingsUsd;
    totalTokens += ledger.totalTokens;

    if (ledger.slaAudit.breached) {
      slaBreachCount += 1;
    }

    for (const evt of ledger.reworkEvents) {
      const current = categoryAccumulator.get(evt.category) ?? {
        eventCount: 0,
        costUsd: 0,
        tokens: 0,
      };
      const evtTokens = evt.wastedPromptTokens + evt.wastedCompletionTokens;
      current.eventCount += 1;
      current.costUsd += evt.reworkCostUsd;
      current.tokens += evtTokens;
      totalReworkTokens += evtTokens;
      categoryAccumulator.set(evt.category, current);
    }

    efficiencyPoints.push({
      traceId: ledger.trace.traceId,
      taskId: ledger.trace.taskId,
      title: ledger.trace.title,
      modelId: ledger.trace.primaryModelId,
      domain: ledger.trace.domain,
      trueUnitCostUsd: ledger.trueUnitCostUsd,
      nominalApiCostUsd: ledger.nominalApiCostUsd,
      latencySeconds: Number((ledger.trace.totalDurationMs / 1000).toFixed(1)),
      totalTokens: ledger.totalTokens,
      hiddenReworkTaxPct: ledger.hiddenReworkTaxPct,
      resolutionStatus: ledger.trace.resolutionStatus,
      groundTruthPassed: ledger.trace.groundTruthPassed,
    });
  }

  const totalNetSurplusUsd = totalHumanBaselineCostUsd - totalTrueCostUsd;
  const portfolioReworkTaxPct =
    totalTrueCostUsd > 0 ? (totalHiddenReworkTaxUsd / totalTrueCostUsd) * 100 : 0;
  const netFinOpsMarginPct =
    totalHumanBaselineCostUsd > 0 ? (totalNetSurplusUsd / totalHumanBaselineCostUsd) * 100 : 0;
  const hiddenCostMultiplier =
    totalNominalApiCostUsd > 0 ? totalTrueCostUsd / totalNominalApiCostUsd : 1;

  const totalReworkEventCost = Array.from(categoryAccumulator.values()).reduce(
    (sum, item) => sum + item.costUsd,
    0
  );

  const reworkByCategory: ReworkCategoryAggregate[] = (
    Object.keys(REWORK_CATEGORY_LABELS) as ReworkCategory[]
  )
    .map((cat) => {
      const agg = categoryAccumulator.get(cat) ?? { eventCount: 0, costUsd: 0, tokens: 0 };
      return {
        category: cat,
        label: REWORK_CATEGORY_LABELS[cat],
        eventCount: agg.eventCount,
        costUsd: agg.costUsd,
        tokens: agg.tokens,
        shareOfReworkPct:
          totalReworkEventCost > 0 ? (agg.costUsd / totalReworkEventCost) * 100 : 0,
      };
    })
    .filter((item) => item.eventCount > 0)
    .sort((a, b) => b.costUsd - a.costUsd);

  return {
    totalTasks,
    resolvedTasks,
    firstPassResolvedTasks,
    escalatedOrFailedTasks,
    resolutionRatePct: (resolvedTasks / totalTasks) * 100,
    firstPassYieldPct: (firstPassResolvedTasks / totalTasks) * 100,
    meanTrueUnitCostUsd: totalTrueCostUsd / totalTasks,
    meanNominalApiCostUsd: totalNominalApiCostUsd / totalTasks,
    meanHumanBaselineCostUsd: totalHumanBaselineCostUsd / totalTasks,
    totalTrueCostUsd,
    totalNominalApiCostUsd,
    totalFirstPassTokenCostUsd,
    totalReworkTokenCostUsd,
    totalHumanOversightCostUsd,
    totalHumanEscalationCostUsd,
    totalSlaPenaltyUsd,
    totalHiddenReworkTaxUsd,
    totalHumanBaselineCostUsd,
    totalNetSurplusUsd,
    totalCacheSavingsUsd,
    portfolioReworkTaxPct,
    netFinOpsMarginPct,
    hiddenCostMultiplier,
    totalTokens,
    totalReworkTokens,
    slaBreachCount,
    reworkByCategory,
    efficiencyPoints,
  };
}
