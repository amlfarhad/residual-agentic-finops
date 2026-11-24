import React, { useState } from 'react';
import {
  X,
  Cpu,
  RefreshCw,
  UserCheck,
  Database,
  CheckCircle2,
  AlertOctagon,
  Clock,
} from 'lucide-react';
import { EnrichedTrace } from '../../App';

interface TraceAutopsyDrawerProps {
  trace: EnrichedTrace | null;
  laborHourlyRate: number;
  laborRegionLabel: string;
  onClose: () => void;
}

export const TraceAutopsyDrawer: React.FC<TraceAutopsyDrawerProps> = ({
  trace,
  laborHourlyRate,
  laborRegionLabel,
  onClose,
}) => {
  const [showRawNegative, setShowRawNegative] = useState(false);

  if (!trace) return null;

  const multiplier = trace.trueUnitCost / Math.max(0.01, trace.nominalInferenceCost);
  const totalTokens = trace.inputTokens + trace.outputTokens;
  const cachedTokens = Math.round(trace.inputTokens * trace.cacheHitRate);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-sumi/20 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[660px] h-full optical-glass border-l border-sumi/12 flex flex-col overflow-hidden"
      >
        {/* Top Drawer Whisper Header */}
        <div className="px-7 pt-6 pb-4 hairline-b flex items-start justify-between gap-4">
          <div>
            <div className="plate-caption flex items-center gap-2.5">
              <span>FORENSIC TRACE AUTOPSY</span>
              <span className="text-sumi/25">/</span>
              <span className="font-mono text-sumi/75">{trace.corpus.toUpperCase()}</span>
              <span className="text-sumi/25">/</span>
              <span className="font-mono text-sumi/75">{trace.domain}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-4">
              <h2 className="font-serif text-[38px] leading-none tracking-[-0.02em] text-sumi">
                {trace.id}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-semibold ${
                  trace.hasFailure
                    ? 'bg-carmine/12 text-carmine'
                    : 'bg-viridian/12 text-viridian'
                }`}
              >
                {trace.failureTaxonomy}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-sumi/[0.06] text-sumi/60 hover:text-sumi transition-colors"
            aria-label="Close autopsy drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Forensic Body */}
        <div className="flex-1 overflow-y-auto optical-scroll px-7 py-6 space-y-7">
          {/* Unboxed Monumental Unit-Economics Clearing Breakdown */}
          <div className="flex flex-wrap items-baseline justify-between gap-6 pb-6 hairline-b">
            <div>
              <div className="plate-caption">NOMINAL API</div>
              <div className="monument-figure text-[44px] text-sumi/75 mt-1">
                ${trace.nominalInferenceCost.toFixed(3)}
              </div>
            </div>

            <div>
              <div className="plate-caption text-amberink">RETRY + IBNR</div>
              <div className="monument-figure text-[44px] text-amberink mt-1">
                ${(trace.retryBurnCost + trace.ibnrReserveCost).toFixed(2)}
              </div>
            </div>

            <div>
              <div className="plate-caption text-carmine">HUMAN REWORK</div>
              <div className="monument-figure text-[44px] text-carmine mt-1">
                ${trace.humanReworkCost.toFixed(2)}
              </div>
            </div>

            <div className="text-right">
              <div className="plate-caption">TRUE SETTLED</div>
              <div className="monument-figure text-[52px] text-sumi mt-1">
                ${trace.trueUnitCost.toFixed(2)}
              </div>
              <div className="font-mono text-[10.5px] text-carmine tabular-nums-strict">
                {multiplier.toFixed(1)}× nominal bleed
              </div>
            </div>
          </div>

          {/* Root Cause Forensic Summary */}
          <div className="pb-6 hairline-b">
            <div className="plate-caption mb-2 flex items-center gap-2">
              {trace.hasFailure ? (
                <AlertOctagon className="w-3.5 h-3.5 text-carmine" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-viridian" />
              )}
              FORENSIC ROOT CAUSE DETERMINATION
            </div>
            <p className="text-[13.5px] leading-relaxed text-sumi/85">
              {trace.rootCauseNote}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-mono text-[11px] text-sumi/60 tabular-nums-strict">
              <span>STAKES: ${trace.dollarStakes.toFixed(0)}</span>
              <span>DISCOVERY LAG: T+{trace.reworkDiscoveryHours.toFixed(0)}h</span>
              <span>RISK SCORE: {(trace.predictedFailureRisk * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Step-by-Step Tool Execution Spans */}
          <div className="pb-6 hairline-b">
            <div className="flex items-center justify-between mb-3.5">
              <span className="plate-caption">
                STEP-BY-STEP EXECUTION SPANS ({trace.spans.length} EVENTS)
              </span>
              <span className="font-mono text-[10.5px] text-viridian tabular-nums-strict">
                CACHE HIT: {(trace.cacheHitRate * 100).toFixed(0)}% ({cachedTokens.toLocaleString()} tok)
              </span>
            </div>

            <div className="relative pl-5 space-y-3.5">
              {/* Vertical Optical Spine */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-sumi/14" />

              {trace.spans.map((span, idx) => {
                const isRetry = span.status === 'retry';
                const isFailed = span.status === 'error';
                return (
                  <div key={idx} className="relative">
                    <span
                      className={`absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-alabaster-vellum ${
                        isFailed
                          ? 'bg-carmine'
                          : isRetry
                          ? 'bg-amberink'
                          : 'bg-viridian'
                      }`}
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] font-semibold text-sumi">
                            {span.toolName}
                          </span>
                          {span.cacheHit && (
                            <span className="px-1.5 py-0.5 rounded bg-viridian/12 text-viridian font-mono text-[9.5px] font-semibold">
                              CACHE HIT
                            </span>
                          )}
                          {isRetry && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amberink/14 text-amberink font-mono text-[9.5px] font-semibold">
                              <RefreshCw className="w-2.5 h-2.5" />
                              RETRY COIL
                            </span>
                          )}
                          {isFailed && (
                            <span className="px-1.5 py-0.5 rounded bg-carmine/14 text-carmine font-mono text-[9.5px] font-semibold">
                              FRACTURE
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-sumi/65 mt-0.5">
                          {span.summary}
                        </p>
                      </div>
                      <div className="text-right font-mono text-[11px] text-sumi/60 tabular-nums-strict shrink-0">
                        <div>{span.tokens.toLocaleString()} tok</div>
                        <div className="text-[10px] text-sumi/45 flex items-center justify-end gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {span.latencyMs}ms
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Token Economics & BLS Wage Settlement Proof */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4">
            <div>
              <div className="plate-caption mb-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sumi/55" />
                TOKEN UNIT ECONOMICS
              </div>
              <div className="space-y-1.5 font-mono text-[11.5px] tabular-nums-strict text-sumi/75">
                <div className="flex justify-between">
                  <span className="text-sumi/50">Model Rate Card</span>
                  <span>{trace.modelId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sumi/50">Input / Output</span>
                  <span>
                    {trace.inputTokens.toLocaleString()} / {trace.outputTokens.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sumi/50">Total Context</span>
                  <span>{totalTokens.toLocaleString()} tok</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sumi/50">Retry Burn</span>
                  <span className="text-amberink">${trace.retryBurnCost.toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="plate-caption mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-carmine" />
                BLS LABOR WAGE SETTLEMENT
              </div>
              <div className="space-y-1.5 font-mono text-[11.5px] tabular-nums-strict text-sumi/75">
                <div className="flex justify-between">
                  <span className="text-sumi/50">BLS Region</span>
                  <span>{laborRegionLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sumi/50">Loaded Wage</span>
                  <span>${laborHourlyRate.toFixed(2)} / hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sumi/50">Rework Effort</span>
                  <span>{trace.reworkMinutes.toFixed(1)} min</span>
                </div>
                <div className="flex justify-between font-semibold text-carmine">
                  <span>Realized Rework</span>
                  <span>${trace.humanReworkCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Toggleable Sumi-Obsidian Inverted Raw Trace JSON Negative */}
          <div>
            <button
              type="button"
              onClick={() => setShowRawNegative((v) => !v)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sumi text-alabaster text-[10px] font-semibold tracking-museum uppercase hover:bg-sumi-obsidian transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-viridian-soft" />
              {showRawNegative ? 'Hide Sumi-Obsidian JSON Negative' : 'Inspect Raw Trace JSON (Sumi-Obsidian)'}
            </button>

            {showRawNegative && (
              <pre className="mt-3 obsidian-glass rounded-2xl p-4 text-[11px] font-mono leading-relaxed overflow-x-auto obsidian-scroll">
                {JSON.stringify(
                  {
                    trace_id: trace.id,
                    corpus: trace.corpus,
                    domain: trace.domain,
                    model_rate_card: trace.modelId,
                    failure_taxonomy: trace.failureTaxonomy,
                    economics: {
                      nominal_inference_usd: Number(trace.nominalInferenceCost.toFixed(4)),
                      retry_burn_usd: Number(trace.retryBurnCost.toFixed(4)),
                      realized_human_rework_usd: Number(trace.humanReworkCost.toFixed(2)),
                      ibnr_reserve_usd: Number(trace.ibnrReserveCost.toFixed(2)),
                      true_settled_unit_cost_usd: Number(trace.trueUnitCost.toFixed(2)),
                    },
                    telemetry: {
                      input_tokens: trace.inputTokens,
                      output_tokens: trace.outputTokens,
                      cache_hit_rate: Number(trace.cacheHitRate.toFixed(3)),
                      tool_calls: trace.toolCalls,
                      retry_count: trace.retryCount,
                      rework_discovery_hours: trace.reworkDiscoveryHours,
                      predicted_failure_risk: Number(trace.predictedFailureRisk.toFixed(3)),
                    },
                  },
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
