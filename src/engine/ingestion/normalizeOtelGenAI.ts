import { resolveRateCard } from '../../data/oracles/llmRateCards';
import {
  BenchmarkDomain,
  NormalizedSpan,
  NormalizedTrace,
  OtelGenAIExportPayload,
  OtelGenAISpanRaw,
  SLASeverityTier,
  ToolCallRecord,
} from '../../types/telemetry';

function nanoToMs(nano: string | number | undefined): number {
  if (nano === undefined) return Date.now();
  const num = typeof nano === 'string' ? Number(nano) : nano;
  if (!Number.isFinite(num)) return Date.now();
  // Detect if already milliseconds vs nanoseconds
  if (num > 1e15) return Math.round(num / 1e6);
  if (num > 1e12) return Math.round(num);
  return Math.round(num * 1000);
}

export function normalizeOtelGenAI(payload: OtelGenAIExportPayload | OtelGenAISpanRaw[]): NormalizedTrace[] {
  const rawSpans: OtelGenAISpanRaw[] = [];

  if (Array.isArray(payload)) {
    rawSpans.push(...payload);
  } else if (Array.isArray(payload.spans)) {
    rawSpans.push(...payload.spans);
  } else if (Array.isArray(payload.resourceSpans)) {
    for (const rs of payload.resourceSpans) {
      for (const ss of rs.scopeSpans ?? []) {
        rawSpans.push(...(ss.spans ?? []));
      }
    }
  }

  // Group spans by traceId
  const traceMap = new Map<string, OtelGenAISpanRaw[]>();
  for (const span of rawSpans) {
    const existing = traceMap.get(span.traceId) ?? [];
    existing.push(span);
    traceMap.set(span.traceId, existing);
  }

  const normalizedTraces: NormalizedTrace[] = [];

  for (const [traceId, spans] of traceMap.entries()) {
    const sorted = [...spans].sort((a, b) => nanoToMs(a.startTimeUnixNano) - nanoToMs(b.startTimeUnixNano));
    const rootAttr = sorted[0]?.attributes ?? {};

    const domain = (rootAttr['residual.domain'] as BenchmarkDomain) ?? 'software-engineering';
    const slaTier = (rootAttr['residual.sla_tier'] as SLASeverityTier) ?? 'P2';
    const socCode =
      (rootAttr['residual.soc_code'] as string) ??
      (domain === 'software-engineering' ? '15-1252' : domain === 'it-operations' ? '15-1232' : '43-4051');

    const normalizedSpans: NormalizedSpan[] = sorted.map((s, idx) => {
      const startMs = nanoToMs(s.startTimeUnixNano);
      const endMs = Math.max(startMs + 50, nanoToMs(s.endTimeUnixNano));
      const attrs = s.attributes ?? {};
      const modelId =
        String(attrs['gen_ai.response.model'] ?? attrs['gen_ai.request.model'] ?? 'gpt-4o');
      const rateCard = resolveRateCard(modelId);

      const promptTokens = Number(attrs['gen_ai.usage.input_tokens'] ?? 0);
      const cachedPromptTokens = Number(attrs['gen_ai.usage.cache_read_input_tokens'] ?? 0);
      const cacheWriteTokens = Number(attrs['gen_ai.usage.cache_creation_input_tokens'] ?? 0);
      const completionTokens = Number(attrs['gen_ai.usage.output_tokens'] ?? 0);
      const reasoningTokens = Number(attrs['gen_ai.usage.reasoning_tokens'] ?? 0);

      const toolCalls: ToolCallRecord[] = [];
      if (attrs['tool.name']) {
        const rawStatus = String(attrs['tool.status'] ?? 'success').toLowerCase();
        const status: ToolCallRecord['status'] =
          rawStatus.includes('schema')
            ? 'schema_error'
            : rawStatus.includes('policy')
              ? 'policy_violation'
              : rawStatus.includes('error') || s.status?.code === 2 || s.status?.code === 'ERROR'
                ? 'runtime_error'
                : 'success';

        toolCalls.push({
          id: `${s.spanId}-tool`,
          name: String(attrs['tool.name']),
          arguments: {},
          status,
          errorMessage: attrs['tool.error'] ? String(attrs['tool.error']) : s.status?.message,
          latencyMs: Math.min(endMs - startMs, 1500),
        });
      }

      const isHandoff =
        s.name.toLowerCase().includes('handoff') ||
        s.name.toLowerCase().includes('escalat') ||
        toolCalls.some((t) => t.name.toLowerCase().includes('transfer_to_human'));

      return {
        spanId: s.spanId,
        parentSpanId: s.parentSpanId,
        stepIndex: idx + 1,
        kind: isHandoff ? 'human_handoff' : attrs['tool.name'] && promptTokens === 0 ? 'tool' : 'llm',
        name: s.name,
        modelId: rateCard.modelId,
        provider: rateCard.provider,
        startedAt: new Date(startMs).toISOString(),
        endedAt: new Date(endMs).toISOString(),
        latencyMs: endMs - startMs,
        tokens: {
          promptTokens,
          cachedPromptTokens: Math.min(cachedPromptTokens, promptTokens),
          cacheWriteTokens,
          completionTokens,
          reasoningTokens,
        },
        inputSummary: String(attrs['gen_ai.prompt'] ?? s.name),
        outputSummary: String(attrs['gen_ai.completion'] ?? s.status?.message ?? 'Span executed'),
        toolCalls,
        finishReason: Array.isArray(attrs['gen_ai.response.finish_reasons'])
          ? (attrs['gen_ai.response.finish_reasons'][0] as NormalizedSpan['finishReason'])
          : 'stop',
      };
    });

    const firstStart = Math.min(...normalizedSpans.map((s) => new Date(s.startedAt).getTime()));
    const lastEnd = Math.max(...normalizedSpans.map((s) => new Date(s.endedAt).getTime()));
    const hasEscalation = normalizedSpans.some((s) => s.kind === 'human_handoff');
    const hasToolErrors = normalizedSpans.some((s) => s.toolCalls.some((t) => t.status !== 'success'));
    const passed =
      typeof rootAttr['residual.ground_truth_passed'] === 'boolean'
        ? rootAttr['residual.ground_truth_passed']
        : !hasEscalation;

    const humanBaselineMinutes =
      Number(rootAttr['residual.human_baseline_minutes']) ||
      (socCode === '15-1252' ? 50 : socCode === '15-1232' ? 24 : 14);

    normalizedTraces.push({
      traceId,
      taskId: String(rootAttr['residual.task_id'] ?? `OTEL-${traceId.slice(0, 8).toUpperCase()}`),
      corpusId: 'custom',
      sourceFormat: 'otel-genai',
      domain,
      title: `OTel GenAI Trace · ${sorted[0]?.name ?? traceId}`,
      objective: String(rootAttr['residual.objective'] ?? 'Ingested OpenTelemetry GenAI semantic conventions workflow.'),
      primaryModelId: normalizedSpans[0]?.modelId ?? 'gpt-4o',
      slaTier,
      socOccupationCode: socCode,
      humanBaselineMinutes,
      humanReviewMinutes: socCode === '15-1252' ? 7.0 : 1.5,
      humanEscalationMinutes: hasEscalation ? Math.round(humanBaselineMinutes * 0.65) : 0,
      startedAt: new Date(firstStart).toISOString(),
      endedAt: new Date(lastEnd).toISOString(),
      totalDurationMs: Math.max(100, lastEnd - firstStart),
      resolutionStatus: hasEscalation
        ? 'escalated_to_human'
        : !passed
          ? 'failed_unresolved'
          : hasToolErrors
            ? 'resolved_with_rework'
            : 'resolved_first_pass',
      groundTruthPassed: passed,
      spans: normalizedSpans,
      metadata: {
        benchmarkVersion: 'OpenTelemetry GenAI v1.27+',
        tags: ['ingested', 'otel-genai'],
      },
    });
  }

  return normalizedTraces;
}
