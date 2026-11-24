import { resolveRateCard } from '../../data/oracles/llmRateCards';
import { SimulationParameters } from '../../types/economics';
import { NormalizedSpan } from '../../types/telemetry';

export interface RawSpanPricingResult {
  uncachedInputCostUsd: number;
  cachedInputCostUsd: number;
  cacheWriteCostUsd: number;
  outputCostUsd: number;
  reasoningCostUsd: number;
  multimodalCostUsd: number;
  cacheSavingsUsd: number;
  totalSpanCostUsd: number;
  effectiveCachedTokens: number;
}

/**
 * Exact enterprise LLM token cost calculator supporting:
 * - Uncached vs cached prompt input rate separation
 * - Cache-write surcharge (e.g., Anthropic 1.25x prompt cache creation)
 * - Completion tokens & reasoning/thinking token billing (e.g., OpenAI o1)
 * - Vision & audio multimodal multipliers
 * - Executive scenario overrides (LLM price deflation %, cache hit % override)
 */
export function calculateSpanTokenCost(
  span: NormalizedSpan,
  sim: SimulationParameters
): RawSpanPricingResult {
  const rateCard = resolveRateCard(span.modelId);
  const priceScale = Math.max(0.1, 1 - sim.llmPriceDeflationPct / 100);

  const promptTokens = Math.max(0, span.tokens.promptTokens);
  const effectiveCachedTokens =
    sim.cacheHitOverridePct !== null
      ? Math.round(promptTokens * (sim.cacheHitOverridePct / 100))
      : Math.min(promptTokens, Math.max(0, span.tokens.cachedPromptTokens));

  const uncachedPromptTokens = Math.max(0, promptTokens - effectiveCachedTokens);
  const cacheWriteTokens =
    sim.cacheHitOverridePct !== null ? 0 : Math.max(0, span.tokens.cacheWriteTokens ?? 0);

  const completionTokens = Math.max(0, span.tokens.completionTokens);
  const reasoningTokens = Math.max(0, span.tokens.reasoningTokens ?? 0);

  const uncachedInputCostUsd =
    (uncachedPromptTokens / 1_000_000) * rateCard.inputPerMillionUsd * priceScale;

  const cachedInputCostUsd =
    (effectiveCachedTokens / 1_000_000) * rateCard.cachedInputPerMillionUsd * priceScale;

  // Cache write premium applies only to incremental delta above standard input rate
  const incrementalCacheWritePremium = Math.max(
    0,
    rateCard.cacheWritePerMillionUsd - rateCard.inputPerMillionUsd
  );
  const cacheWriteCostUsd =
    (cacheWriteTokens / 1_000_000) * incrementalCacheWritePremium * priceScale;

  const outputCostUsd =
    (completionTokens / 1_000_000) * rateCard.outputPerMillionUsd * priceScale;

  const reasoningCostUsd =
    (reasoningTokens / 1_000_000) * rateCard.reasoningPerMillionUsd * priceScale;

  const visionCost =
    ((span.tokens.visionImageUnits ?? 0) / 1_000) * rateCard.visionPerThousandUnitsUsd * priceScale;
  const audioCost =
    ((span.tokens.audioSeconds ?? 0) / 60) * rateCard.audioPerMinuteUsd * priceScale;
  const multimodalCostUsd = visionCost + audioCost;

  // Exact dollar savings captured relative to paying full uncached input rate
  const cacheSavingsUsd =
    (effectiveCachedTokens / 1_000_000) *
    Math.max(0, rateCard.inputPerMillionUsd - rateCard.cachedInputPerMillionUsd) *
    priceScale;

  const totalSpanCostUsd =
    uncachedInputCostUsd +
    cachedInputCostUsd +
    cacheWriteCostUsd +
    outputCostUsd +
    reasoningCostUsd +
    multimodalCostUsd;

  return {
    uncachedInputCostUsd,
    cachedInputCostUsd,
    cacheWriteCostUsd,
    outputCostUsd,
    reasoningCostUsd,
    multimodalCostUsd,
    cacheSavingsUsd,
    totalSpanCostUsd,
    effectiveCachedTokens,
  };
}
