import { resolveBLSOccupation } from '../../data/oracles/blsLaborMatrix';
import { resolveSLAPolicy } from '../../data/oracles/slaSchedules';
import { SimulationParameters } from '../../types/economics';
import { SLAAccrualAudit, SpanCostBreakdown, TraceSettlementLedger } from '../../types/settlement';
import { NormalizedTrace } from '../../types/telemetry';
import { detectTraceRework } from './reworkDetector';
import { calculateSpanTokenCost } from './tokenCostEngine';

/**
 * Computes full enterprise FinOps unit-economics settlement for a single normalized agent trace:
 *  - Exact token billing (uncached, cached, cache-write, completion, reasoning)
 *  - First-pass productive token cost vs Hidden Rework token cost (scaled by scenario rework multiplier)
 *  - BLS loaded human labor baseline vs actual human QA oversight + escalation takeover cost
 *  - Contractual SLA breach accrual penalty
 *  - Fully-loaded True Unit Cost, Hidden Rework Tax %, and Net Economic Surplus
 */
export function settleTraceEconomics(
  trace: NormalizedTrace,
  sim: SimulationParameters
): TraceSettlementLedger {
  const bls = resolveBLSOccupation(trace.socOccupationCode);
  const slaPolicy = resolveSLAPolicy(trace.slaTier);

  const wageScale = 1 + sim.humanWageEscalationPct / 100;
  const effectiveHumanHourlyRateUsd = bls.loadedHourlyRateUsd * wageScale;
  const humanRatePerMinute = effectiveHumanHourlyRateUsd / 60;

  const reworkDetection = detectTraceRework(trace, sim);
  const reworkMultiplier = sim.reworkErrorMultiplier;

  let totalTokens = 0;
  let promptTokens = 0;
  let cachedPromptTokens = 0;
  let completionTokens = 0;
  let totalFirstPassTokenCostUsd = 0;
  let totalReworkTokenCostUsd = 0;
  let totalCacheSavingsUsd = 0;

  const spanCosts: SpanCostBreakdown[] = trace.spans.map((span) => {
    const pricing = calculateSpanTokenCost(span, sim);
    const cls = reworkDetection.classifications.get(span.spanId);
    const isReworkSpan = cls?.isReworkSpan ?? false;
    const ratio = cls?.reworkAttributionRatio ?? 0;

    const baseFirstPassCost = pricing.totalSpanCostUsd * (1 - ratio);
    // Apply executive stress multiplier to rework portion only
    const scaledReworkCost = pricing.totalSpanCostUsd * ratio * reworkMultiplier;
    const effectiveTotalSpanCost = baseFirstPassCost + scaledReworkCost;

    const spanPrompt = span.tokens.promptTokens;
    const spanCompletion = span.tokens.completionTokens + (span.tokens.reasoningTokens ?? 0);

    promptTokens += spanPrompt;
    cachedPromptTokens += pricing.effectiveCachedTokens;
    completionTokens += spanCompletion;
    totalTokens += spanPrompt + spanCompletion;

    totalFirstPassTokenCostUsd += baseFirstPassCost;
    totalReworkTokenCostUsd += scaledReworkCost;
    totalCacheSavingsUsd += pricing.cacheSavingsUsd;

    return {
      spanId: span.spanId,
      stepIndex: span.stepIndex,
      modelId: span.modelId,
      uncachedInputCostUsd: pricing.uncachedInputCostUsd,
      cachedInputCostUsd: pricing.cachedInputCostUsd,
      cacheWriteCostUsd: pricing.cacheWriteCostUsd,
      outputCostUsd: pricing.outputCostUsd,
      reasoningCostUsd: pricing.reasoningCostUsd,
      multimodalCostUsd: pricing.multimodalCostUsd,
      cacheSavingsUsd: pricing.cacheSavingsUsd,
      totalSpanCostUsd: effectiveTotalSpanCost,
      isReworkSpan,
      reworkAttributionRatio: ratio,
      firstPassCostUsd: baseFirstPassCost,
      reworkCostUsd: scaledReworkCost,
      reworkCategories: cls?.categories ?? [],
    };
  });

  // Scale rework event dollar amounts cleanly by simulator multiplier
  const scaledReworkEvents = reworkDetection.events.map((evt) => ({
    ...evt,
    reworkCostUsd: evt.reworkCostUsd * reworkMultiplier,
    wastedPromptTokens: Math.round(evt.wastedPromptTokens * reworkMultiplier),
    wastedCompletionTokens: Math.round(evt.wastedCompletionTokens * reworkMultiplier),
  }));

  const nominalApiCostUsd = totalFirstPassTokenCostUsd + totalReworkTokenCostUsd;

  // Human QA oversight labor scales slightly when rework multiplier rises on tasks with rework
  const oversightScale = reworkDetection.events.length > 0 ? 0.65 + 0.35 * reworkMultiplier : 1.0;
  const humanOversightCostUsd = trace.humanReviewMinutes * oversightScale * humanRatePerMinute;

  // Human escalation labor (when autonomous agent fails or transfers to human desk)
  const effectiveEscalationMinutes =
    trace.humanEscalationMinutes > 0
      ? trace.humanEscalationMinutes * Math.min(1.6, 0.5 + 0.5 * reworkMultiplier)
      : 0;
  const humanEscalationCostUsd = effectiveEscalationMinutes * humanRatePerMinute;

  // Contractual SLA Breach Evaluation:
  // Total wall-clock time = autonomous runtime + human escalation queue/takeover minutes
  const agentDurationMinutes = trace.totalDurationMs / 60_000;
  const effectiveResolutionMinutes = agentDurationMinutes + effectiveEscalationMinutes;
  const thresholdWithGrace = slaPolicy.targetResolutionMinutes + slaPolicy.graceBufferMinutes;
  const breached = effectiveResolutionMinutes > thresholdWithGrace;
  const overageMinutes = breached ? effectiveResolutionMinutes - slaPolicy.targetResolutionMinutes : 0;

  let accruedPenaltyUsd = 0;
  if (breached) {
    const rawPenalty =
      slaPolicy.flatBreachFeeUsd + (overageMinutes / 60) * slaPolicy.penaltyPerHourUsd;
    accruedPenaltyUsd = Math.min(slaPolicy.maxCreditCapUsd, rawPenalty);
  }

  const slaAudit: SLAAccrualAudit = {
    tier: slaPolicy.tier,
    targetMinutes: slaPolicy.targetResolutionMinutes,
    effectiveResolutionMinutes,
    breached,
    overageMinutes,
    accruedPenaltyUsd,
  };

  const trueUnitCostUsd =
    nominalApiCostUsd + humanOversightCostUsd + humanEscalationCostUsd + accruedPenaltyUsd;

  // Hidden Rework Tax captures everything beyond clean first-pass inference + baseline QA
  const hiddenReworkTaxUsd =
    totalReworkTokenCostUsd + humanEscalationCostUsd + accruedPenaltyUsd +
    (reworkDetection.events.length > 0 ? humanOversightCostUsd * 0.5 : 0);

  const hiddenReworkTaxPct =
    trueUnitCostUsd > 0 ? (hiddenReworkTaxUsd / trueUnitCostUsd) * 100 : 0;

  const reworkTokens = scaledReworkEvents.reduce(
    (acc, e) => acc + e.wastedPromptTokens + e.wastedCompletionTokens,
    0
  );
  const reworkTokenSharePct =
    totalTokens > 0 ? Math.min(100, (reworkTokens / totalTokens) * 100) : 0;

  const humanBaselineCostUsd = trace.humanBaselineMinutes * humanRatePerMinute;
  const netEconomicSurplusUsd = humanBaselineCostUsd - trueUnitCostUsd;
  const roiPct = trueUnitCostUsd > 0 ? (netEconomicSurplusUsd / trueUnitCostUsd) * 100 : 0;

  const effectiveCacheHitPct = promptTokens > 0 ? (cachedPromptTokens / promptTokens) * 100 : 0;

  return {
    trace,
    spanCosts,
    reworkEvents: scaledReworkEvents,
    totalTokens,
    promptTokens,
    cachedPromptTokens,
    completionTokens,
    effectiveCacheHitPct,
    nominalApiCostUsd,
    firstPassTokenCostUsd: totalFirstPassTokenCostUsd,
    reworkTokenCostUsd: totalReworkTokenCostUsd,
    cacheSavingsUsd: totalCacheSavingsUsd,
    humanOversightCostUsd,
    humanEscalationCostUsd,
    slaAudit,
    trueUnitCostUsd,
    hiddenReworkTaxUsd,
    hiddenReworkTaxPct,
    reworkTokenSharePct,
    humanBaselineCostUsd,
    netEconomicSurplusUsd,
    roiPct,
    effectiveHumanHourlyRateUsd,
    blsOccupationTitle: `${bls.socCode} · ${bls.title}`,
  };
}
