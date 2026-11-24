import { resolveRateCard } from '../../data/oracles/llmRateCards';
import {
  BenchmarkDomain,
  LangfuseTraceRaw,
  NormalizedSpan,
  NormalizedTrace,
  SLASeverityTier,
  ToolCallRecord,
} from '../../types/telemetry';

export function normalizeLangfuse(payload: LangfuseTraceRaw | LangfuseTraceRaw[]): NormalizedTrace[] {
  const traces = Array.isArray(payload) ? payload : [payload];

  return traces.map((raw) => {
    const meta = raw.metadata ?? {};
    const domain = (meta.domain as BenchmarkDomain) ?? 'it-operations';
    const slaTier = (meta.sla_tier as SLASeverityTier) ?? 'P2';
    const socCode =
      (meta.soc_code as string) ??
      (domain === 'software-engineering' ? '15-1252' : domain === 'it-operations' ? '15-1232' : '43-4051');

    const sortedObs = [...(raw.observations ?? [])].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const spans: NormalizedSpan[] = sortedObs.map((obs, idx) => {
      const startMs = new Date(obs.startTime).getTime();
      const endMs = obs.endTime ? new Date(obs.endTime).getTime() : startMs + 1200;
      const latencyMs = Math.max(50, endMs - startMs);
      const rateCard = resolveRateCard(obs.model ?? 'gpt-4o');

      const promptTokens = obs.usage?.input ?? 0;
      const cachedPromptTokens = obs.usage?.cachedInput ?? 0;
      const completionTokens = obs.usage?.output ?? 0;
      const reasoningTokens = obs.usage?.reasoning ?? 0;

      const isError = obs.level === 'ERROR' || obs.level === 'WARNING';
      const isHandoff =
        obs.name.toLowerCase().includes('handoff') ||
        obs.name.toLowerCase().includes('escalat') ||
        obs.name.toLowerCase().includes('transfer_to_human');

      const toolCalls: ToolCallRecord[] = [];
      if (obs.type === 'SPAN' || obs.name.toLowerCase().includes('tool') || isError) {
        toolCalls.push({
          id: `${obs.id}-tc`,
          name: obs.name,
          arguments: typeof obs.input === 'object' && obs.input !== null ? (obs.input as Record<string, unknown>) : {},
          output: typeof obs.output === 'string' ? obs.output : JSON.stringify(obs.output ?? ''),
          status: isError
            ? (obs.statusMessage ?? '').toLowerCase().includes('schema')
              ? 'schema_error'
              : 'runtime_error'
            : 'success',
          errorMessage: isError ? (obs.statusMessage ?? 'Langfuse observation flagged ERROR') : undefined,
          latencyMs,
        });
      }

      return {
        spanId: obs.id,
        parentSpanId: obs.parentObservationId ?? undefined,
        stepIndex: idx + 1,
        kind: isHandoff ? 'human_handoff' : obs.type === 'GENERATION' ? 'llm' : 'tool',
        name: obs.name,
        modelId: rateCard.modelId,
        provider: rateCard.provider,
        startedAt: new Date(startMs).toISOString(),
        endedAt: new Date(endMs).toISOString(),
        latencyMs,
        tokens: {
          promptTokens,
          cachedPromptTokens: Math.min(cachedPromptTokens, promptTokens),
          completionTokens,
          reasoningTokens,
        },
        inputSummary:
          typeof obs.input === 'string' ? obs.input.slice(0, 180) : JSON.stringify(obs.input ?? obs.name).slice(0, 180),
        outputSummary:
          typeof obs.output === 'string'
            ? obs.output.slice(0, 180)
            : JSON.stringify(obs.output ?? obs.statusMessage ?? 'Completed').slice(0, 180),
        toolCalls,
        finishReason: isError ? 'error' : 'stop',
      };
    });

    const firstStart = spans.length > 0 ? Math.min(...spans.map((s) => new Date(s.startedAt).getTime())) : Date.now();
    const lastEnd = spans.length > 0 ? Math.max(...spans.map((s) => new Date(s.endedAt).getTime())) : firstStart + 1000;
    const hasEscalation = spans.some((s) => s.kind === 'human_handoff');
    const hasErrors = spans.some((s) => s.toolCalls.some((t) => t.status !== 'success'));

    const scorePassed = raw.scores?.find((sc) => sc.name === 'passed' || sc.name === 'accuracy' || sc.name === 'reward');
    const groundTruthPassed = scorePassed ? scorePassed.value >= 0.5 : !hasEscalation;
    const humanBaselineMinutes =
      Number(meta.human_baseline_minutes) || (socCode === '15-1252' ? 50 : socCode === '15-1232' ? 24 : 14);

    return {
      traceId: raw.id,
      taskId: String(meta.task_id ?? `LF-${raw.id.slice(0, 8).toUpperCase()}`),
      corpusId: 'custom',
      sourceFormat: 'langfuse',
      domain,
      title: raw.name ?? `Langfuse Trace · ${raw.id}`,
      objective:
        typeof raw.input === 'string'
          ? raw.input.slice(0, 220)
          : String(meta.objective ?? 'Ingested Langfuse production agent trace.'),
      primaryModelId: spans.find((s) => s.kind === 'llm')?.modelId ?? 'gpt-4o',
      slaTier,
      socOccupationCode: socCode,
      humanBaselineMinutes,
      humanReviewMinutes: socCode === '15-1252' ? 7.5 : 1.5,
      humanEscalationMinutes: hasEscalation ? Math.round(humanBaselineMinutes * 0.7) : 0,
      startedAt: new Date(firstStart).toISOString(),
      endedAt: new Date(lastEnd).toISOString(),
      totalDurationMs: Math.max(200, lastEnd - firstStart),
      resolutionStatus: hasEscalation
        ? 'escalated_to_human'
        : !groundTruthPassed
          ? 'failed_unresolved'
          : hasErrors
            ? 'resolved_with_rework'
            : 'resolved_first_pass',
      groundTruthPassed,
      spans,
      metadata: {
        benchmarkVersion: 'Langfuse Export v2',
        tags: [...(raw.tags ?? []), 'ingested', 'langfuse'],
      },
    };
  });
}
