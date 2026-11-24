export type WaterlineChapterId =
  | 'hidden-bill'
  | 'time-delay'
  | 'smart-fix'
  | 'real-mistake';

export type DatasetScope = 'all' | 'support' | 'engineering';

export interface OtelSpanRecord {
  spanId: string;
  stepNumber: number;
  toolName: string;
  humanStepLabel: string;
  status: 'ok' | 'retry' | 'error';
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
  detail: string;
}

export interface WaterlineTask {
  id: string;
  shortLabel: string;
  humanTitle: string;
  corpus: 'tau-bench' | 'swe-bench';
  category: 'support' | 'engineering';
  teamLabel: string;
  domain: string;
  modelName: string;

  // Act 1: What the AI Bill Shows (Token Economics)
  inputTokens: number;
  outputTokens: number;
  cacheHitRate: number;
  retryCount: number;
  tokenCostUsd: number;

  // Act 2: Submerged Human Cleanup Reality (BLS OEWS Wages)
  failed: boolean;
  /** Hours after AI finishes until the human catches & fixes the mistake (Infinity if clean) */
  discoveryHours: number;
  cleanupMinutes: number;
  blsRoleTitle: string;
  blsSocCode: string;
  blsHourlyRateUsd: number;
  humanCleanupCostUsd: number;
  totalSettledCostUsd: number;

  // Routing & Stakes Telemetry
  dollarStakesUsd: number;
  failureRiskProb: number; // 0..1 pre-execution predicted failure probability

  // Plain-English Human Storytelling Vignette
  humanVignette: string;
  aiActionSummary: string;
  humanFixSummary: string;
  failureRootCause: string;

  // Full Forensic OpenTelemetry Trace
  otelSpans: OtelSpanRecord[];
}

export interface PlumbHoverState {
  task: WaterlineTask;
  clientX: number;
  clientY: number;
  isSubmerged: boolean;
}

export interface WaterlineMetricsAtCutoff {
  cutoffHours: number;
  totalTasks: number;
  cleanTasksCount: number;
  failedTasksTotal: number;
  surfacedFailuresCount: number;
  hiddenFailuresCount: number;

  // Per-task unit averages
  avgTokenCostUsd: number;
  avgSurfacedCleanupUsd: number;
  avgHiddenIbnrUsd: number;
  avgRealizedTotalUsd: number;
  avgUltimateTotalUsd: number;

  // Multipliers & rates
  realizedMultiplier: number;
  ultimateMultiplier: number;
  apparentCleanPct: number;
  trueCleanPct: number;
  trueDefectPct: number;
}

export interface BlsWageCard {
  socCode: string;
  occupation: string;
  baseHourlyUsd: number;
  benefitsMultiplier: number;
  fullyLoadedHourlyUsd: number;
  sourceNote: string;
}

export interface LlmRateCard {
  model: string;
  provider: string;
  inputPer1MUsd: number;
  outputPer1MUsd: number;
  cachedInputDiscountPct: number;
}
