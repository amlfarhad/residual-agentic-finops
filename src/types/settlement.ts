import { ReworkCategory, ReworkEvent } from './economics';
import { NormalizedTrace } from './telemetry';

export interface SpanCostBreakdown {
  spanId: string;
  stepIndex: number;
  modelId: string;
  uncachedInputCostUsd: number;
  cachedInputCostUsd: number;
  cacheWriteCostUsd: number;
  outputCostUsd: number;
  reasoningCostUsd: number;
  multimodalCostUsd: number;
  cacheSavingsUsd: number;
  totalSpanCostUsd: number;
  isReworkSpan: boolean;
  reworkAttributionRatio: number;
  firstPassCostUsd: number;
  reworkCostUsd: number;
  reworkCategories: ReworkCategory[];
}

export interface SLAAccrualAudit {
  tier: string;
  targetMinutes: number;
  effectiveResolutionMinutes: number;
  breached: boolean;
  overageMinutes: number;
  accruedPenaltyUsd: number;
}

export interface TraceSettlementLedger {
  trace: NormalizedTrace;
  spanCosts: SpanCostBreakdown[];
  reworkEvents: ReworkEvent[];
  /** Total prompt + completion + reasoning tokens */
  totalTokens: number;
  promptTokens: number;
  cachedPromptTokens: number;
  completionTokens: number;
  effectiveCacheHitPct: number;
  /** What naive FinOps trackers report (raw API token bill only) */
  nominalApiCostUsd: number;
  /** Productive first-pass inference cost */
  firstPassTokenCostUsd: number;
  /** Wasted token inference cost due to retries, thrashing, and loops */
  reworkTokenCostUsd: number;
  /** Prompt cache savings captured */
  cacheSavingsUsd: number;
  /** BLS loaded labor cost of human QA/oversight review on the trace */
  humanOversightCostUsd: number;
  /** BLS loaded labor cost of human agent takeover when escalated or failed */
  humanEscalationCostUsd: number;
  /** SLA penalty accrual */
  slaAudit: SLAAccrualAudit;
  /** Fully-loaded true unit cost = nominalApiCost + humanOversight + humanEscalation + slaPenalty */
  trueUnitCostUsd: number;
  /** Hidden cost delta above productive first-pass tokens = reworkTokenCost + humanOversight + humanEscalation + slaPenalty */
  hiddenReworkTaxUsd: number;
  /** Hidden Rework Tax as % of True Unit Cost */
  hiddenReworkTaxPct: number;
  /** Rework tokens as % of total tokens */
  reworkTokenSharePct: number;
  /** What it would have cost a human worker (BLS loaded hourly rate * humanBaselineMinutes) */
  humanBaselineCostUsd: number;
  /** Net economic surplus = humanBaselineCostUsd - trueUnitCostUsd (negative = economic deficit) */
  netEconomicSurplusUsd: number;
  /** ROI percentage = (netEconomicSurplusUsd / trueUnitCostUsd) * 100 */
  roiPct: number;
  /** Human hourly rate used in settlement (after simulation wage escalation) */
  effectiveHumanHourlyRateUsd: number;
  blsOccupationTitle: string;
}

export interface ReworkCategoryAggregate {
  category: ReworkCategory;
  label: string;
  eventCount: number;
  costUsd: number;
  tokens: number;
  shareOfReworkPct: number;
}

export interface ModelEfficiencyPoint {
  traceId: string;
  taskId: string;
  title: string;
  modelId: string;
  domain: string;
  trueUnitCostUsd: number;
  nominalApiCostUsd: number;
  latencySeconds: number;
  totalTokens: number;
  hiddenReworkTaxPct: number;
  resolutionStatus: NormalizedTrace['resolutionStatus'];
  groundTruthPassed: boolean;
}

export interface PortfolioMetricsSummary {
  totalTasks: number;
  resolvedTasks: number;
  firstPassResolvedTasks: number;
  escalatedOrFailedTasks: number;
  resolutionRatePct: number;
  firstPassYieldPct: number;
  /** Mean true fully-loaded cost per task */
  meanTrueUnitCostUsd: number;
  /** Mean naive API-only token cost per task */
  meanNominalApiCostUsd: number;
  /** Mean BLS human baseline cost per task */
  meanHumanBaselineCostUsd: number;
  /** Total spend across corpus */
  totalTrueCostUsd: number;
  totalNominalApiCostUsd: number;
  totalFirstPassTokenCostUsd: number;
  totalReworkTokenCostUsd: number;
  totalHumanOversightCostUsd: number;
  totalHumanEscalationCostUsd: number;
  totalSlaPenaltyUsd: number;
  totalHiddenReworkTaxUsd: number;
  totalHumanBaselineCostUsd: number;
  totalNetSurplusUsd: number;
  totalCacheSavingsUsd: number;
  /** Portfolio-wide Hidden Rework Tax % */
  portfolioReworkTaxPct: number;
  /** Portfolio Net FinOps Margin % = totalNetSurplusUsd / totalHumanBaselineCostUsd */
  netFinOpsMarginPct: number;
  /** Ratio of true cost to nominal API token cost (e.g. 4.8x) */
  hiddenCostMultiplier: number;
  totalTokens: number;
  totalReworkTokens: number;
  slaBreachCount: number;
  reworkByCategory: ReworkCategoryAggregate[];
  efficiencyPoints: ModelEfficiencyPoint[];
}
