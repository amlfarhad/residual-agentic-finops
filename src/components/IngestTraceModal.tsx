import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileJson,
  UploadCloud,
  X,
} from 'lucide-react';
import { parseAndDetectTelemetry } from '../engine/ingestion/detectFormat';
import { normalizeLangfuse } from '../engine/ingestion/normalizeLangfuse';
import { normalizeOtelGenAI } from '../engine/ingestion/normalizeOtelGenAI';
import { normalizeTauBench } from '../engine/ingestion/normalizeTauBench';
import { useFinOpsStore } from '../store/useFinOpsStore';
import {
  LangfuseTraceRaw,
  NormalizedTrace,
  OtelGenAIExportPayload,
  TauBenchTrajectoryRaw,
} from '../types/telemetry';

const SAMPLE_OTEL_GENAI: OtelGenAIExportPayload = {
  resourceSpans: [
    {
      resource: { attributes: { 'service.name': 'autonomous-sre-agent' } },
      scopeSpans: [
        {
          scope: { name: 'opentelemetry.instrumentation.genai', version: '1.27.0' },
          spans: [
            {
              traceId: 'otel-live-9921a',
              spanId: 'sp-01',
              name: 'agent.diagnose_redis_oom',
              startTimeUnixNano: '1739360000000000000',
              endTimeUnixNano: '1739360018500000000',
              attributes: {
                'gen_ai.system': 'anthropic',
                'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
                'gen_ai.usage.input_tokens': 22400,
                'gen_ai.usage.cache_read_input_tokens': 14200,
                'gen_ai.usage.output_tokens': 890,
                'tool.name': 'kubectl_describe_pod',
                'tool.status': 'schema_error',
                'tool.error': 'ValidationError: namespace parameter missing for pod redis-primary-0',
                'residual.task_id': 'SRE-REDIS-992',
                'residual.domain': 'it-operations',
                'residual.sla_tier': 'P1',
                'residual.soc_code': '15-1232',
                'residual.human_baseline_minutes': 28,
                'residual.ground_truth_passed': true,
              },
            },
            {
              traceId: 'otel-live-9921a',
              spanId: 'sp-02',
              parentSpanId: 'sp-01',
              name: 'agent.retry_describe_and_patch_limit',
              startTimeUnixNano: '1739360019000000000',
              endTimeUnixNano: '1739360041200000000',
              attributes: {
                'gen_ai.system': 'anthropic',
                'gen_ai.request.model': 'claude-3-5-sonnet-20241022',
                'gen_ai.usage.input_tokens': 26900,
                'gen_ai.usage.cache_read_input_tokens': 21000,
                'gen_ai.usage.output_tokens': 740,
                'tool.name': 'kubectl_describe_pod',
                'tool.status': 'success',
                'gen_ai.completion': 'Updated Redis maxmemory policy to allkeys-lru and verified pod Ready.',
              },
            },
          ],
        },
      ],
    },
  ],
};

const SAMPLE_LANGFUSE: LangfuseTraceRaw = {
  id: 'lf-billing-4810',
  name: 'Enterprise Invoice Dispute & Credit Memo Agent',
  timestamp: '2025-02-14T11:20:00.000Z',
  tags: ['billing', 'langfuse-prod'],
  metadata: {
    task_id: 'FIN-INV-4810',
    domain: 'retail-support',
    sla_tier: 'P2',
    soc_code: '43-4051',
    human_baseline_minutes: 18,
  },
  input: 'Customer disputes duplicate seat overage charge ($420) on Invoice #INV-88219.',
  scores: [{ name: 'passed', value: 1 }],
  observations: [
    {
      id: 'obs-1',
      traceId: 'lf-billing-4810',
      type: 'GENERATION',
      name: 'lookup_stripe_invoice',
      model: 'gpt-4o',
      startTime: '2025-02-14T11:20:00.000Z',
      endTime: '2025-02-14T11:20:06.400Z',
      usage: { input: 6200, cachedInput: 3800, output: 280 },
      input: { invoice_id: 'INV-88219' },
      output: 'Confirmed duplicate metered seat webhook on 2025-02-01.',
    },
    {
      id: 'obs-2',
      traceId: 'lf-billing-4810',
      type: 'GENERATION',
      name: 'issue_credit_memo',
      model: 'gpt-4o',
      startTime: '2025-02-14T11:20:07.000Z',
      endTime: '2025-02-14T11:20:15.200Z',
      usage: { input: 7450, cachedInput: 5900, output: 310 },
      input: { invoice_id: 'INV-88219', credit_usd: 420 },
      output: 'Issued Credit Memo #CM-2025-991 for $420.00 cleanly.',
    },
  ],
};

const SAMPLE_TAU_BENCH: TauBenchTrajectoryRaw = {
  task_id: 204,
  domain: 'airline',
  model: 'gpt-4o',
  reward: 1.0,
  info: {
    sla_tier: 'P1',
    task: {
      instruction: 'Rebook reservation #8TY44P from SFO to ORD and waive change fee for Gold tier.',
      user_id: 'elena_rostova_77',
    },
  },
  traj: [
    {
      role: 'user',
      content: 'Hi, I need to move reservation #8TY44P from SFO to ORD to tomorrow morning.',
    },
    {
      role: 'assistant',
      content: null,
      latency_ms: 4200,
      usage: { prompt_tokens: 4900, cached_tokens: 3100, completion_tokens: 180 },
      tool_calls: [
        {
          id: 'tc_1',
          type: 'function',
          function: {
            name: 'get_reservation_details',
            arguments: '{"reservation_id":"8TY44P"}',
          },
        },
      ],
    },
    {
      role: 'tool',
      tool_call_id: 'tc_1',
      content: '{"reservation_id":"8TY44P","cabin":"economy","membership":"gold"}',
    },
    {
      role: 'assistant',
      content: 'Your Gold membership waives the fee. I have updated reservation #8TY44P to flight HAT221.',
      latency_ms: 5800,
      usage: { prompt_tokens: 5800, cached_tokens: 4600, completion_tokens: 210 },
      tool_calls: [
        {
          id: 'tc_2',
          type: 'function',
          function: {
            name: 'update_reservation_flights',
            arguments: '{"reservation_id":"8TY44P","flights":[{"flight_number":"HAT221","date":"2025-02-15"}]}',
          },
        },
      ],
    },
    {
      role: 'tool',
      tool_call_id: 'tc_2',
      content: '{"status":"updated","fee":0}',
    },
  ],
};

export const IngestTraceModal: React.FC = () => {
  const { ingestionDrawerOpen, setIngestionDrawerOpen, ingestCustomTraces } = useFinOpsStore();
  const [rawText, setRawText] = useState('');
  const [ingestMode, setIngestMode] = useState<'append' | 'replace'>('append');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detection = useMemo(() => {
    if (!rawText.trim()) return null;
    return parseAndDetectTelemetry(rawText);
  }, [rawText]);

  if (!ingestionDrawerOpen) return null;

  const handleFileLoad = async (file: File) => {
    setErrorMsg(null);
    try {
      const content = await file.text();
      setRawText(content);
    } catch (err) {
      setErrorMsg(`Failed reading file: ${(err as Error).message}`);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileLoad(file);
    }
  };

  const handleLoadSample = (kind: 'otel' | 'langfuse' | 'tau') => {
    setErrorMsg(null);
    if (kind === 'otel') setRawText(JSON.stringify(SAMPLE_OTEL_GENAI, null, 2));
    if (kind === 'langfuse') setRawText(JSON.stringify(SAMPLE_LANGFUSE, null, 2));
    if (kind === 'tau') setRawText(JSON.stringify(SAMPLE_TAU_BENCH, null, 2));
  };

  const handleDownloadSample = (kind: 'otel' | 'langfuse' | 'tau') => {
    const payload =
      kind === 'otel'
        ? SAMPLE_OTEL_GENAI
        : kind === 'langfuse'
          ? SAMPLE_LANGFUSE
          : SAMPLE_TAU_BENCH;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `residual-sample-${kind}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleIngest = () => {
    setErrorMsg(null);
    if (!detection || detection.format === 'unknown' || !detection.parsedPayload) {
      setErrorMsg('Please supply a valid OpenTelemetry GenAI, Langfuse, or TAU-bench JSON/JSONL payload.');
      return;
    }

    try {
      let normalized: NormalizedTrace[] = [];
      if (detection.format === 'otel-genai') {
        normalized = normalizeOtelGenAI(detection.parsedPayload as OtelGenAIExportPayload);
      } else if (detection.format === 'langfuse') {
        normalized = normalizeLangfuse(detection.parsedPayload as LangfuseTraceRaw);
      } else if (detection.format === 'tau-bench') {
        normalized = normalizeTauBench(detection.parsedPayload as TauBenchTrajectoryRaw);
      }

      if (normalized.length === 0) {
        setErrorMsg('Schema parsed, but zero valid agent traces were extracted.');
        return;
      }

      ingestCustomTraces(normalized, ingestMode);
      setRawText('');
    } catch (err) {
      setErrorMsg(`Normalization failed: ${(err as Error).message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink-primary/35 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Live Telemetry Ingestion Pipeline"
    >
      <div className="flex-1" onClick={() => setIngestionDrawerOpen(false)} />

      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-vellum-rule bg-vellum-sheet shadow-drawer">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-vellum-border bg-vellum-panel px-6 py-4">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-finops-indigo">
              Client-Side Telemetry Pipeline
            </p>
            <h3 className="mt-1 font-serif text-xl font-semibold text-ink-primary">
              Ingest OTel GenAI, Langfuse, or τ-bench Traces
            </h3>
            <p className="mt-1 font-sans text-xs text-ink-muted">
              100% browser-side parsing and normalization — zero trace data leaves your session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIngestionDrawerOpen(false)}
            className="rounded-sm border border-vellum-rule bg-vellum-sheet p-1.5 text-ink-secondary hover:border-ink-primary hover:text-ink-primary"
            aria-label="Close Ingestion Drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Drag-and-Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-sm border-2 border-dashed p-6 text-center transition-colors ${
              dragActive
                ? 'border-finops-indigo bg-finops-indigoSoft/35'
                : 'border-vellum-rule bg-vellum-panel/50 hover:border-ink-primary'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.jsonl,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileLoad(f);
              }}
            />
            <UploadCloud className="mx-auto h-7 w-7 text-ink-secondary" />
            <p className="mt-2 font-sans text-sm font-medium text-ink-primary">
              Drop `.json` or `.jsonl` trace export here, or click to browse
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">
              Auto-detects OpenTelemetry GenAI (v1.27+), Langfuse Trace Exports, and Sierra τ-bench trajectories
            </p>
          </div>

          {/* One-Click Schema Samples */}
          <div className="rounded-sm border border-vellum-border bg-vellum-panel/60 p-3.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Instant Schema Templates (Paste or Download)
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { key: 'otel' as const, label: 'OTel GenAI Span' },
                { key: 'langfuse' as const, label: 'Langfuse Trace' },
                { key: 'tau' as const, label: 'τ-bench Trajectory' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-sm border border-vellum-rule bg-vellum-sheet px-2.5 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => handleLoadSample(item.key)}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-ink-primary hover:text-finops-indigo"
                  >
                    <FileJson className="h-3.5 w-3.5 text-finops-indigo" />
                    {item.label}
                  </button>
                  <button
                    type="button"
                    title={`Download ${item.label} JSON`}
                    onClick={() => handleDownloadSample(item.key)}
                    className="text-ink-muted hover:text-ink-primary"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Raw JSON/JSONL Paste Area */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="raw-telemetry-paste"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-secondary"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Raw JSON / JSONL Payload
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setErrorMsg(null);
                  }}
                  className="font-mono text-[10px] text-ink-muted hover:text-finops-crimson"
                >
                  Clear Editor
                </button>
              )}
            </div>
            <textarea
              id="raw-telemetry-paste"
              rows={11}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setErrorMsg(null);
              }}
              placeholder='Paste OpenTelemetry GenAI {"resourceSpans": [...]}, Langfuse {"id": "...", "observations": [...]}, or TAU-bench {"task_id": 1, "traj": [...]} JSON here...'
              className="w-full rounded-sm border border-vellum-rule bg-vellum-panel/40 p-3 font-mono text-xs text-ink-primary placeholder:text-ink-faint focus:border-ink-primary focus:outline-none"
            />
          </div>

          {/* Real-Time Autodetection Validation Banner */}
          {detection && (
            <div
              className={`rounded-sm border p-3 text-xs ${
                detection.format !== 'unknown'
                  ? 'border-finops-emerald/35 bg-finops-emeraldSoft/40 text-finops-emerald'
                  : 'border-finops-crimson/35 bg-finops-crimsonSoft/45 text-finops-crimson'
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase">
                {detection.format !== 'unknown' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {detection.format !== 'unknown'
                    ? `Schema Validated: ${detection.format.toUpperCase()} (${detection.recordCount} record${
                        detection.recordCount === 1 ? '' : 's'
                      })`
                    : 'Schema Validation Failed'}
                </span>
              </div>
              <ul className="mt-1.5 list-disc pl-5 font-sans text-ink-secondary">
                {detection.diagnostics.map((d, idx) => (
                  <li key={idx}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-sm border border-finops-crimson/40 bg-finops-crimsonSoft/60 p-3 font-mono text-xs text-finops-crimson">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-vellum-border bg-vellum-panel px-6 py-4">
          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-secondary">
            <span>Mode:</span>
            <button
              type="button"
              onClick={() => setIngestMode('append')}
              className={`rounded-sm px-2 py-1 border ${
                ingestMode === 'append'
                  ? 'border-ink-primary bg-ink-primary text-vellum-sheet'
                  : 'border-vellum-rule bg-vellum-sheet text-ink-secondary'
              }`}
            >
              Append
            </button>
            <button
              type="button"
              onClick={() => setIngestMode('replace')}
              className={`rounded-sm px-2 py-1 border ${
                ingestMode === 'replace'
                  ? 'border-ink-primary bg-ink-primary text-vellum-sheet'
                  : 'border-vellum-rule bg-vellum-sheet text-ink-secondary'
              }`}
            >
              Replace Custom
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIngestionDrawerOpen(false)}
              className="rounded-sm border border-vellum-rule bg-vellum-sheet px-3.5 py-1.5 font-sans text-xs font-medium text-ink-secondary hover:border-ink-primary hover:text-ink-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleIngest}
              disabled={!detection || detection.format === 'unknown'}
              className="rounded-sm border border-ink-primary bg-ink-primary px-4 py-1.5 font-sans text-xs font-medium text-vellum-sheet transition-colors hover:bg-ink-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Normalize &amp; Settle Ledger
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
