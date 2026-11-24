export type TelemetryFormat = 'otel-genai' | 'langfuse' | 'tau-bench' | 'unknown';

export type BenchmarkDomain =
  | 'airline-support'
  | 'retail-support'
  | 'software-engineering'
  | 'it-operations'
  | 'custom';

export type TaskResolutionStatus =
  | 'resolved_first_pass'
  | 'resolved_with_rework'
  | 'escalated_to_human'
  | 'failed_unresolved';

export type SpanKind = 'llm' | 'tool' | 'retrieval' | 'agent_step' | 'human_handoff';

export type SLASeverityTier = 'P1' | 'P2' | 'P3';

export interface ToolCallRecord {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  output?: string;
  status: 'success' | 'schema_error' | 'runtime_error' | 'policy_violation' | 'timeout';
  errorMessage?: string;
  latencyMs: number;
}

export interface TokenUsage {
  promptTokens: number;
  cachedPromptTokens: number;
  cacheWriteTokens?: number;
  completionTokens: number;
  reasoningTokens?: number;
  visionImageUnits?: number;
  audioSeconds?: number;
}

export interface NormalizedSpan {
  spanId: string;
  parentSpanId?: string;
  stepIndex: number;
  kind: SpanKind;
  name: string;
  modelId: string;
  provider: string;
  startedAt: string;
  endedAt: string;
  latencyMs: number;
  tokens: TokenUsage;
  inputSummary: string;
  outputSummary: string;
  toolCalls: ToolCallRecord[];
  httpStatus?: number;
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'error';
  attributes?: Record<string, string | number | boolean>;
}

export interface NormalizedTrace {
  traceId: string;
  taskId: string;
  corpusId: string;
  sourceFormat: TelemetryFormat;
  domain: BenchmarkDomain;
  title: string;
  objective: string;
  primaryModelId: string;
  slaTier: SLASeverityTier;
  socOccupationCode: string;
  humanBaselineMinutes: number;
  humanReviewMinutes: number;
  humanEscalationMinutes: number;
  startedAt: string;
  endedAt: string;
  totalDurationMs: number;
  resolutionStatus: TaskResolutionStatus;
  groundTruthPassed: boolean;
  spans: NormalizedSpan[];
  metadata: {
    benchmarkVersion?: string;
    repository?: string;
    userPersona?: string;
    policyConstraints?: string[];
    tags?: string[];
  };
}

/**
 * Raw OpenTelemetry GenAI Semantic Conventions (v1.27+) Span Export
 */
export interface OtelGenAIAttributeMap {
  'gen_ai.system'?: string;
  'gen_ai.request.model'?: string;
  'gen_ai.response.model'?: string;
  'gen_ai.usage.input_tokens'?: number;
  'gen_ai.usage.output_tokens'?: number;
  'gen_ai.usage.cache_read_input_tokens'?: number;
  'gen_ai.usage.cache_creation_input_tokens'?: number;
  'gen_ai.usage.reasoning_tokens'?: number;
  'gen_ai.response.finish_reasons'?: string[];
  'gen_ai.operation.name'?: string;
  'tool.name'?: string;
  'tool.status'?: string;
  'tool.error'?: string;
  'residual.task_id'?: string;
  'residual.domain'?: BenchmarkDomain;
  'residual.sla_tier'?: SLASeverityTier;
  'residual.soc_code'?: string;
  'residual.human_baseline_minutes'?: number;
  'residual.ground_truth_passed'?: boolean;
  [key: string]: unknown;
}

export interface OtelGenAISpanRaw {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string | number;
  endTimeUnixNano: string | number;
  status?: { code?: number | string; message?: string };
  attributes: OtelGenAIAttributeMap;
  events?: Array<{
    name: string;
    timeUnixNano?: string | number;
    attributes?: Record<string, unknown>;
  }>;
}

export interface OtelGenAIExportPayload {
  resourceSpans?: Array<{
    resource?: { attributes?: Record<string, unknown> };
    scopeSpans: Array<{
      scope?: { name?: string; version?: string };
      spans: OtelGenAISpanRaw[];
    }>;
  }>;
  spans?: OtelGenAISpanRaw[];
}

/**
 * Raw Langfuse Trace Export Payload
 */
export interface LangfuseObservationRaw {
  id: string;
  traceId: string;
  parentObservationId?: string | null;
  type: 'GENERATION' | 'SPAN' | 'EVENT';
  name: string;
  model?: string | null;
  startTime: string;
  endTime?: string | null;
  input?: unknown;
  output?: unknown;
  level?: 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR';
  statusMessage?: string | null;
  usage?: {
    input?: number;
    output?: number;
    total?: number;
    cachedInput?: number;
    reasoning?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface LangfuseTraceRaw {
  id: string;
  name?: string;
  timestamp: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  input?: unknown;
  output?: unknown;
  scores?: Array<{ name: string; value: number }>;
  observations: LangfuseObservationRaw[];
}

/**
 * Raw TAU-bench Trajectory Record (Sierra tau-bench eval JSON format)
 */
export interface TauBenchMessageRaw {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    cached_tokens?: number;
  };
  latency_ms?: number;
}

export interface TauBenchTrajectoryRaw {
  task_id: number | string;
  trial?: number;
  domain?: 'airline' | 'retail';
  model?: string;
  reward: number;
  info?: {
    task?: {
      instruction?: string;
      user_id?: string;
    };
    source?: string;
    sla_tier?: SLASeverityTier;
  };
  traj: TauBenchMessageRaw[];
}
