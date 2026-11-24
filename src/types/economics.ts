import { SLASeverityTier } from './telemetry';

export type LLMProvider = 'OpenAI' | 'Anthropic' | 'Google Vertex' | 'AWS Bedrock';

export interface LLMRateCard {
  modelId: string;
  aliases: string[];
  displayName: string;
  provider: LLMProvider;
  contextWindow: number;
  /** USD per 1,000,000 uncached input tokens */
  inputPerMillionUsd: number;
  /** USD per 1,000,000 cached input read tokens */
  cachedInputPerMillionUsd: number;
  /** USD per 1,000,000 cache write tokens (if applicable, e.g., Anthropic 1.25x) */
  cacheWritePerMillionUsd: number;
  /** USD per 1,000,000 output tokens */
  outputPerMillionUsd: number;
  /** USD per 1,000,000 reasoning/thinking tokens (if billed separately or at output rate) */
  reasoningPerMillionUsd: number;
  /** USD per 1,000 standard vision image tiles/units */
  visionPerThousandUnitsUsd: number;
  /** USD per audio minute multiplier */
  audioPerMinuteUsd: number;
  effectiveDate: string;
  sourceUrl: string;
}

export interface BLSOccupationBenchmark {
  socCode: string;
  title: string;
  shortLabel: string;
  blsSeriesRef: string;
  surveyPeriod: string;
  /** Mean hourly wage in USD from BLS OEWS */
  meanHourlyWageUsd: number;
  /** Median hourly wage in USD from BLS OEWS */
  medianHourlyWageUsd: number;
  /** 75th percentile hourly wage for senior escalation tiers */
  p75HourlyWageUsd: number;
  /** BLS Employer Costs for Employee Compensation (ECEC) total burden multiplier (benefits, payroll tax, overhead) */
  loadedBurdenMultiplier: number;
  /** Computed fully-loaded hourly rate = meanHourlyWageUsd * loadedBurdenMultiplier */
  loadedHourlyRateUsd: number;
  /** Default average handle time (AHT) in minutes for a human resolving an equivalent ticket */
  typicalHandleMinutes: number;
}

export interface SLAPolicySchedule {
  tier: SLASeverityTier;
  label: string;
  description: string;
  /** Target max resolution time in minutes */
  targetResolutionMinutes: number;
  /** Grace buffer before financial service credit triggers (minutes) */
  graceBufferMinutes: number;
  /** Contractual penalty accrual rate per breach hour (USD/hr) */
  penaltyPerHourUsd: number;
  /** Fixed incident breach surcharge when SLA is missed (USD) */
  flatBreachFeeUsd: number;
  /** Maximum contractual credit cap per incident (USD) */
  maxCreditCapUsd: number;
}

export type ReworkCategory =
  | 'TOOL_SCHEMA_RETRY'
  | 'HALLUCINATION_CORRECTION'
  | 'CONTEXT_THRASHING'
  | 'COMPILATION_TEST_LOOP'
  | 'HUMAN_ESCALATION_HANDOFF';

export interface ReworkEvent {
  id: string;
  spanId: string;
  stepIndex: number;
  category: ReworkCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  diagnosticEvidence: string;
  wastedPromptTokens: number;
  wastedCompletionTokens: number;
  reworkCostUsd: number;
  latencyAddedMs: number;
}

export interface SimulationParameters {
  /** Multiplier applied to detected rework token volume & rework loops (1.0 = baseline actuals) */
  reworkErrorMultiplier: number;
  /** Percentage adjustment to BLS loaded human hourly wage (-15 to +40) */
  humanWageEscalationPct: number;
  /** Percentage deflation in LLM token unit prices (0 to 75, where 30 = 30% cheaper tokens) */
  llmPriceDeflationPct: number;
  /** Override cache hit ratio (null = use actual trace cache telemetry; 0..90 = forced % of prompt tokens cached) */
  cacheHitOverridePct: number | null;
  /** Display currency */
  currency: 'USD' | 'EUR' | 'GBP';
}
