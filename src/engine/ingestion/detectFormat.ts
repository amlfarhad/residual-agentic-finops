import { TelemetryFormat } from '../../types/telemetry';

export interface DetectionResult {
  format: TelemetryFormat;
  confidence: 'high' | 'medium' | 'low';
  recordCount: number;
  parsedPayload: unknown;
  diagnostics: string[];
}

/**
 * Parses either standard JSON or newline-delimited JSONL into a normalized payload,
 * then classifies the telemetry schema as OpenTelemetry GenAI, Langfuse, or TAU-bench.
 */
export function parseAndDetectTelemetry(rawText: string): DetectionResult {
  const trimmed = rawText.trim();
  const diagnostics: string[] = [];

  if (!trimmed) {
    return {
      format: 'unknown',
      confidence: 'low',
      recordCount: 0,
      parsedPayload: null,
      diagnostics: ['Empty payload supplied.'],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Attempt JSONL parsing (newline-delimited JSON records, common in TAU-bench / Otel exports)
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    try {
      parsed = lines.map((line) => JSON.parse(line));
      diagnostics.push(`Parsed ${lines.length} JSONL lines successfully.`);
    } catch (err) {
      return {
        format: 'unknown',
        confidence: 'low',
        recordCount: 0,
        parsedPayload: null,
        diagnostics: [`Invalid JSON / JSONL syntax: ${(err as Error).message}`],
      };
    }
  }

  // 1. Check OpenTelemetry GenAI format
  if (isOtelGenAIPayload(parsed)) {
    const spansCount = countOtelSpans(parsed);
    diagnostics.push(`Detected OpenTelemetry GenAI semantic conventions (${spansCount} spans).`);
    return {
      format: 'otel-genai',
      confidence: 'high',
      recordCount: spansCount,
      parsedPayload: parsed,
      diagnostics,
    };
  }

  // 2. Check Langfuse Trace Export format
  if (isLangfusePayload(parsed)) {
    const traces = Array.isArray(parsed) ? parsed : [parsed];
    diagnostics.push(`Detected Langfuse trace export (${traces.length} trace(s) with observations).`);
    return {
      format: 'langfuse',
      confidence: 'high',
      recordCount: traces.length,
      parsedPayload: parsed,
      diagnostics,
    };
  }

  // 3. Check TAU-bench Trajectory format
  if (isTauBenchPayload(parsed)) {
    const trajectories = Array.isArray(parsed) ? parsed : [parsed];
    diagnostics.push(`Detected Sierra TAU-bench trajectory log (${trajectories.length} task trajectory(ies)).`);
    return {
      format: 'tau-bench',
      confidence: 'high',
      recordCount: trajectories.length,
      parsedPayload: parsed,
      diagnostics,
    };
  }

  diagnostics.push(
    'JSON is valid, but does not match OpenTelemetry GenAI (resourceSpans/spans), Langfuse (observations), or TAU-bench (traj) schemas.'
  );
  return {
    format: 'unknown',
    confidence: 'low',
    recordCount: 0,
    parsedPayload: parsed,
    diagnostics,
  };
}

function isOtelGenAIPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  if (!Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.resourceSpans)) return true;
    if (Array.isArray(obj.spans) && obj.spans.length > 0) {
      const first = obj.spans[0] as Record<string, unknown>;
      return Boolean(first.traceId && first.spanId && first.attributes);
    }
    return false;
  }
  const first = payload[0] as Record<string, unknown> | undefined;
  return Boolean(first && typeof first === 'object' && 'traceId' in first && 'spanId' in first && 'attributes' in first);
}

function countOtelSpans(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.spans)) return obj.spans.length;
  if (Array.isArray(obj.resourceSpans)) {
    let count = 0;
    for (const rs of obj.resourceSpans as Array<{ scopeSpans?: Array<{ spans?: unknown[] }> }>) {
      for (const ss of rs.scopeSpans ?? []) {
        count += ss.spans?.length ?? 0;
      }
    }
    return count;
  }
  return 0;
}

function isLangfusePayload(payload: unknown): boolean {
  const sample = Array.isArray(payload) ? payload[0] : payload;
  if (!sample || typeof sample !== 'object') return false;
  const obj = sample as Record<string, unknown>;
  return Array.isArray(obj.observations) && typeof obj.id === 'string';
}

function isTauBenchPayload(payload: unknown): boolean {
  const sample = Array.isArray(payload) ? payload[0] : payload;
  if (!sample || typeof sample !== 'object') return false;
  const obj = sample as Record<string, unknown>;
  return Array.isArray(obj.traj) && ('task_id' in obj || 'reward' in obj);
}
