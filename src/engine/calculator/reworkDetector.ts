import { ReworkCategory, ReworkEvent, SimulationParameters } from '../../types/economics';
import { NormalizedTrace } from '../../types/telemetry';
import { calculateSpanTokenCost } from './tokenCostEngine';

export interface SpanReworkClassification {
  spanId: string;
  isReworkSpan: boolean;
  reworkAttributionRatio: number;
  categories: ReworkCategory[];
}

export interface ReworkDetectionOutput {
  events: ReworkEvent[];
  classifications: Map<string, SpanReworkClassification>;
}

/**
 * Multi-Tier Agentic Rework Heuristic Engine.
 * Inspects every execution span chronologically and classifies non-productive token spend into
 * 5 rigorous operational FinOps failure taxonomies:
 *  1. TOOL_SCHEMA_RETRY       — malformed JSON/parameter schema errors & immediate recovery retries
 *  2. HALLUCINATION_CORRECTION — policy violations, fabricated parameters, or unsupported API mutations
 *  3. CONTEXT_THRASHING       — redundant identical read/lookup tool calls bloating prompt windows
 *  4. COMPILATION_TEST_LOOP   — edit-test-fail-edit cycles in autonomous software engineering runs
 *  5. HUMAN_ESCALATION_HANDOFF — terminal fallback to human agents after autonomous exhaustion
 */
export function detectTraceRework(
  trace: NormalizedTrace,
  sim: SimulationParameters
): ReworkDetectionOutput {
  const events: ReworkEvent[] = [];
  const classifications = new Map<string, SpanReworkClassification>();

  const seenReadSignatures = new Set<string>();
  let previousStepFailedTool: string | null = null;
  let previousStepHadTestFail = false;

  for (const span of trace.spans) {
    const pricing = calculateSpanTokenCost(span, sim);
    const categories: ReworkCategory[] = [];
    let attributionRatio = 0;

    // 1. Detect Tool Schema Errors
    const schemaErrors = span.toolCalls.filter((tc) => tc.status === 'schema_error');
    if (schemaErrors.length > 0) {
      categories.push('TOOL_SCHEMA_RETRY');
      attributionRatio = Math.max(attributionRatio, 0.85);
      events.push({
        id: `${span.spanId}-schema`,
        spanId: span.spanId,
        stepIndex: span.stepIndex,
        category: 'TOOL_SCHEMA_RETRY',
        severity: 'medium',
        title: `Tool Schema Rejection (${schemaErrors[0].name})`,
        diagnosticEvidence:
          schemaErrors[0].errorMessage ?? `Malformed tool payload passed to ${schemaErrors[0].name}.`,
        wastedPromptTokens: Math.round(span.tokens.promptTokens * 0.85),
        wastedCompletionTokens: Math.round(span.tokens.completionTokens * 0.85),
        reworkCostUsd: pricing.totalSpanCostUsd * 0.85,
        latencyAddedMs: span.latencyMs,
      });
      previousStepFailedTool = schemaErrors[0].name;
    } else if (
      previousStepFailedTool &&
      span.toolCalls.some((tc) => tc.name === previousStepFailedTool && tc.status === 'success')
    ) {
      // The recovery retry span itself carries incremental context re-send overhead (45% attributed as rework)
      categories.push('TOOL_SCHEMA_RETRY');
      attributionRatio = Math.max(attributionRatio, 0.45);
      events.push({
        id: `${span.spanId}-schema-recovery`,
        spanId: span.spanId,
        stepIndex: span.stepIndex,
        category: 'TOOL_SCHEMA_RETRY',
        severity: 'low',
        title: `Schema Recovery Re-Invocation (${previousStepFailedTool})`,
        diagnosticEvidence: `Extra LLM turn required to re-send context and fix arguments for ${previousStepFailedTool}.`,
        wastedPromptTokens: Math.round(span.tokens.promptTokens * 0.45),
        wastedCompletionTokens: Math.round(span.tokens.completionTokens * 0.45),
        reworkCostUsd: pricing.totalSpanCostUsd * 0.45,
        latencyAddedMs: Math.round(span.latencyMs * 0.45),
      });
      previousStepFailedTool = null;
    } else {
      previousStepFailedTool = null;
    }

    // 2. Detect Policy Violations / Hallucinated Tool Mutations
    const policyErrors = span.toolCalls.filter((tc) => tc.status === 'policy_violation');
    if (policyErrors.length > 0) {
      categories.push('HALLUCINATION_CORRECTION');
      attributionRatio = Math.max(attributionRatio, 0.92);
      events.push({
        id: `${span.spanId}-policy`,
        spanId: span.spanId,
        stepIndex: span.stepIndex,
        category: 'HALLUCINATION_CORRECTION',
        severity: 'high',
        title: `Policy / Guardrail Violation (${policyErrors[0].name})`,
        diagnosticEvidence:
          policyErrors[0].errorMessage ?? `Hallucinated unauthorized mutation on ${policyErrors[0].name}.`,
        wastedPromptTokens: Math.round(span.tokens.promptTokens * 0.92),
        wastedCompletionTokens: Math.round(span.tokens.completionTokens * 0.92),
        reworkCostUsd: pricing.totalSpanCostUsd * 0.92,
        latencyAddedMs: span.latencyMs,
      });
    }

    // 3. Detect Compilation / Unit-Test Verification Loops
    const runtimeTestErrors = span.toolCalls.filter(
      (tc) =>
        tc.status === 'runtime_error' &&
        (tc.name.includes('pytest') ||
          tc.name.includes('test') ||
          tc.name.includes('bash') ||
          tc.name.includes('modify_pending'))
    );
    if (runtimeTestErrors.length > 0) {
      categories.push('COMPILATION_TEST_LOOP');
      attributionRatio = Math.max(attributionRatio, 0.88);
      events.push({
        id: `${span.spanId}-testloop`,
        spanId: span.spanId,
        stepIndex: span.stepIndex,
        category: 'COMPILATION_TEST_LOOP',
        severity: 'high',
        title: `Verification / Execution Failure (${runtimeTestErrors[0].name})`,
        diagnosticEvidence:
          runtimeTestErrors[0].errorMessage ?? `Execution returned runtime error on ${runtimeTestErrors[0].name}.`,
        wastedPromptTokens: Math.round(span.tokens.promptTokens * 0.88),
        wastedCompletionTokens: Math.round(span.tokens.completionTokens * 0.88),
        reworkCostUsd: pricing.totalSpanCostUsd * 0.88,
        latencyAddedMs: span.latencyMs,
      });
      previousStepHadTestFail = true;
    } else if (previousStepHadTestFail && span.kind !== 'human_handoff') {
      categories.push('COMPILATION_TEST_LOOP');
      attributionRatio = Math.max(attributionRatio, 0.5);
      events.push({
        id: `${span.spanId}-testloop-fix`,
        spanId: span.spanId,
        stepIndex: span.stepIndex,
        category: 'COMPILATION_TEST_LOOP',
        severity: 'medium',
        title: 'Iterative Patch Re-Verification Cycle',
        diagnosticEvidence:
          'Subsequent reasoning + test cycle incurred solely to remediate prior failed patch/transaction.',
        wastedPromptTokens: Math.round(span.tokens.promptTokens * 0.5),
        wastedCompletionTokens: Math.round(span.tokens.completionTokens * 0.5),
        reworkCostUsd: pricing.totalSpanCostUsd * 0.5,
        latencyAddedMs: Math.round(span.latencyMs * 0.5),
      });
      previousStepHadTestFail = false;
    }

    // 4. Detect Context Thrashing (Redundant identical reads/lookups)
    let detectedThrash = false;
    for (const tc of span.toolCalls) {
      const isReadTool =
        tc.name.startsWith('get_') ||
        tc.name.startsWith('read_') ||
        tc.name.includes('lookup') ||
        tc.name.includes('search');
      if (isReadTool && tc.status === 'success') {
        const signature = `${tc.name}::${JSON.stringify(tc.arguments)}`;
        if (seenReadSignatures.has(signature)) {
          detectedThrash = true;
          categories.push('CONTEXT_THRASHING');
          attributionRatio = Math.max(attributionRatio, 0.78);
          events.push({
            id: `${span.spanId}-thrash`,
            spanId: span.spanId,
            stepIndex: span.stepIndex,
            category: 'CONTEXT_THRASHING',
            severity: 'medium',
            title: `Context Thrashing · Redundant ${tc.name}`,
            diagnosticEvidence: `Agent re-invoked identical read call ${signature} already present in conversation memory.`,
            wastedPromptTokens: Math.round(span.tokens.promptTokens * 0.78),
            wastedCompletionTokens: Math.round(span.tokens.completionTokens * 0.78),
            reworkCostUsd: pricing.totalSpanCostUsd * 0.78,
            latencyAddedMs: span.latencyMs,
          });
          break;
        }
        seenReadSignatures.add(signature);
      }
    }

    // Also flag explicit thrashing span names if uncaptured
    if (!detectedThrash && span.name.toLowerCase().includes('thrash')) {
      categories.push('CONTEXT_THRASHING');
      attributionRatio = Math.max(attributionRatio, 0.75);
    }

    // 5. Detect Human Escalation Handoff
    if (
      span.kind === 'human_handoff' ||
      span.toolCalls.some((tc) => tc.name === 'transfer_to_human_agents')
    ) {
      categories.push('HUMAN_ESCALATION_HANDOFF');
      attributionRatio = 1.0;
      events.push({
        id: `${span.spanId}-handoff`,
        spanId: span.spanId,
        stepIndex: span.stepIndex,
        category: 'HUMAN_ESCALATION_HANDOFF',
        severity: 'critical',
        title: 'Autonomous Exhaustion · Human Escalation Handoff',
        diagnosticEvidence:
          span.outputSummary || 'Agent exhausted autonomous policy/code resolution and transferred workload to human desk.',
        wastedPromptTokens: span.tokens.promptTokens,
        wastedCompletionTokens: span.tokens.completionTokens,
        reworkCostUsd: pricing.totalSpanCostUsd,
        latencyAddedMs: span.latencyMs,
      });
    }

    const uniqueCategories = Array.from(new Set(categories));
    classifications.set(span.spanId, {
      spanId: span.spanId,
      isReworkSpan: uniqueCategories.length > 0,
      reworkAttributionRatio: attributionRatio,
      categories: uniqueCategories,
    });
  }

  return { events, classifications };
}
