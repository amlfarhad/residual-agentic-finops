import { resolveRateCard } from '../../data/oracles/llmRateCards';
import {
  NormalizedSpan,
  NormalizedTrace,
  TauBenchTrajectoryRaw,
  ToolCallRecord,
} from '../../types/telemetry';

/**
 * Estimates tokens cleanly using standard BPE char/4 ratio ONLY if a raw TAU-bench export
 * omitted per-turn API usage objects (while preserving exact API usage whenever present).
 */
function estimateTokensFromText(text: string | null | undefined): number {
  if (!text) return 0;
  return Math.max(12, Math.ceil(text.length / 4));
}

export function normalizeTauBench(payload: TauBenchTrajectoryRaw | TauBenchTrajectoryRaw[]): NormalizedTrace[] {
  const trajectories = Array.isArray(payload) ? payload : [payload];

  return trajectories.map((trajItem, trajIdx) => {
    const domain = trajItem.domain === 'retail' ? 'retail-support' : 'airline-support';
    const rateCard = resolveRateCard(trajItem.model ?? 'gpt-4o');
    const baseTimestamp = Date.now() - (trajectories.length - trajIdx) * 120_000;

    // Build lookup of tool outputs keyed by tool_call_id
    const toolOutputs = new Map<string, string>();
    for (const msg of trajItem.traj) {
      if (msg.role === 'tool' && msg.tool_call_id) {
        toolOutputs.set(msg.tool_call_id, msg.content ?? '');
      }
    }

    const spans: NormalizedSpan[] = [];
    let cumulativePromptTokens = 1400; // Baseline system policy + tool schema overhead
    let cursorMs = baseTimestamp;
    let stepIndex = 0;

    for (let i = 0; i < trajItem.traj.length; i++) {
      const msg = trajItem.traj[i];
      if (msg.role !== 'assistant') {
        cumulativePromptTokens += estimateTokensFromText(msg.content);
        continue;
      }

      stepIndex += 1;
      const latencyMs = msg.latency_ms ?? 3800 + (msg.tool_calls?.length ?? 0) * 850;
      const promptTokens = msg.usage?.prompt_tokens ?? cumulativePromptTokens;
      const cachedPromptTokens =
        msg.usage?.cached_tokens ?? (stepIndex > 1 ? Math.round(promptTokens * 0.55) : 0);
      const completionTokens =
        msg.usage?.completion_tokens ??
        estimateTokensFromText(msg.content) +
          (msg.tool_calls ? estimateTokensFromText(JSON.stringify(msg.tool_calls)) : 0);

      const toolCalls: ToolCallRecord[] = (msg.tool_calls ?? []).map((tc) => {
        const output = toolOutputs.get(tc.id) ?? '';
        const lowerOut = output.toLowerCase();
        const isSchemaErr =
          lowerOut.includes('validationerror') ||
          lowerOut.includes('invalid') ||
          lowerOut.includes('unexpected argument') ||
          lowerOut.includes('must start with');
        const isPolicyErr =
          lowerOut.includes('policy') || lowerOut.includes('not allowed') || lowerOut.includes('cannot');
        const isRuntimeErr = lowerOut.includes('error') || lowerOut.includes('exception') || lowerOut.includes('failed');

        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || '{}');
        } catch {
          parsedArgs = { raw: tc.function.arguments };
        }

        return {
          id: tc.id,
          name: tc.function.name,
          arguments: parsedArgs,
          output,
          status: isSchemaErr
            ? 'schema_error'
            : isPolicyErr
              ? 'policy_violation'
              : isRuntimeErr
                ? 'runtime_error'
                : 'success',
          errorMessage: isSchemaErr || isPolicyErr || isRuntimeErr ? output.slice(0, 200) : undefined,
          latencyMs: 280,
        };
      });

      const isHandoff = toolCalls.some((tc) => tc.name === 'transfer_to_human_agents');
      const prevUserMsg = [...trajItem.traj.slice(0, i)].reverse().find((m) => m.role === 'user');

      spans.push({
        spanId: `tau-${trajItem.task_id}-s${stepIndex}`,
        stepIndex,
        kind: isHandoff ? 'human_handoff' : 'llm',
        name: toolCalls.length > 0 ? `assistant.${toolCalls[0].name}` : `assistant.turn_${stepIndex}`,
        modelId: rateCard.modelId,
        provider: rateCard.provider,
        startedAt: new Date(cursorMs).toISOString(),
        endedAt: new Date(cursorMs + latencyMs).toISOString(),
        latencyMs,
        tokens: {
          promptTokens,
          cachedPromptTokens: Math.min(cachedPromptTokens, promptTokens),
          completionTokens,
        },
        inputSummary: (prevUserMsg?.content ?? 'User turn').slice(0, 180),
        outputSummary:
          msg.content?.slice(0, 180) ??
          `Invoked ${toolCalls.map((t) => t.name).join(', ')}`,
        toolCalls,
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      });

      cursorMs += latencyMs + 400;
      cumulativePromptTokens += completionTokens;
    }

    const hasEscalation = spans.some((s) => s.kind === 'human_handoff');
    const hasErrors = spans.some((s) => s.toolCalls.some((t) => t.status !== 'success'));
    const passed = trajItem.reward >= 0.5;
    const humanBaselineMinutes = domain === 'airline-support' ? 16 : 12;

    return {
      traceId: `tau-ingested-${trajItem.task_id}-${trajIdx}`,
      taskId: `TAU-${domain === 'airline-support' ? 'AIR' : 'RET'}-${trajItem.task_id}`,
      corpusId: 'custom',
      sourceFormat: 'tau-bench',
      domain,
      title:
        trajItem.info?.task?.instruction?.slice(0, 74) ??
        `TAU-bench ${domain === 'airline-support' ? 'Airline' : 'Retail'} Task #${trajItem.task_id}`,
      objective:
        trajItem.info?.task?.instruction ??
        'Ingested Sierra TAU-bench multi-turn support trajectory.',
      primaryModelId: rateCard.modelId,
      slaTier: trajItem.info?.sla_tier ?? (domain === 'airline-support' ? 'P1' : 'P3'),
      socOccupationCode: '43-4051',
      humanBaselineMinutes,
      humanReviewMinutes: 1.2,
      humanEscalationMinutes: hasEscalation || !passed ? Math.round(humanBaselineMinutes * 0.85) : 0,
      startedAt: new Date(baseTimestamp).toISOString(),
      endedAt: new Date(cursorMs).toISOString(),
      totalDurationMs: Math.max(500, cursorMs - baseTimestamp),
      resolutionStatus: hasEscalation
        ? 'escalated_to_human'
        : !passed
          ? 'failed_unresolved'
          : hasErrors
            ? 'resolved_with_rework'
            : 'resolved_first_pass',
      groundTruthPassed: passed,
      spans,
      metadata: {
        benchmarkVersion: 'tau-bench-ingested',
        userPersona: trajItem.info?.task?.user_id,
        tags: ['ingested', 'tau-bench', domain],
      },
    };
  });
}
