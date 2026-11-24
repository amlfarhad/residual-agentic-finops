import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Code2,
  Receipt,
  Clock,
  UserCheck,
  Activity,
} from 'lucide-react';
import type { WaterlineTask } from '../../types/waterline';

interface RealMistakeStageProps {
  tasks: WaterlineTask[];
  selectedTask: WaterlineTask;
  onSelectTask: (task: WaterlineTask) => void;
}

interface CascadeStep {
  id: string;
  timeLabel: string;
  actor: 'Customer' | 'AI Agent' | 'Human Specialist';
  title: string;
  detail: string;
  costDeltaUsd: number;
  tone: 'neutral' | 'ok' | 'retry' | 'error';
}

export const RealMistakeStage: React.FC<RealMistakeStageProps> = ({
  tasks,
  selectedTask,
  onSelectTask,
}) => {
  const [inspectRawTelemetry, setInspectRawTelemetry] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  const totalTokens = selectedTask.inputTokens + selectedTask.outputTokens;
  const multiplier =
    selectedTask.totalSettledCostUsd / Math.max(0.01, selectedTask.tokenCostUsd);

  // Decompose Human Cleanup Cost into transparent operational line items (Triage + Debugging + Reprocessing)
  const costAnatomy = useMemo(() => {
    const api = selectedTask.tokenCostUsd;
    if (!selectedTask.failed) {
      return {
        api,
        triage: 0,
        remediation: 0,
        reprocessing: 0,
        total: api,
      };
    }
    const triage = Number((selectedTask.humanCleanupCostUsd * 0.22).toFixed(2));
    const remediation = Number((selectedTask.humanCleanupCostUsd * 0.62).toFixed(2));
    const reprocessing = Number(
      Math.max(0, selectedTask.humanCleanupCostUsd - triage - remediation).toFixed(2)
    );
    return {
      api,
      triage,
      remediation,
      reprocessing,
      total: selectedTask.totalSettledCostUsd,
    };
  }, [selectedTask]);

  // Build interactive end-to-end Customer & Agent Failure Cascade timeline
  const cascadeSteps = useMemo<CascadeStep[]>(() => {
    const steps: CascadeStep[] = [
      {
        id: 'req',
        timeLabel: 'T + 0s',
        actor: 'Customer',
        title: selectedTask.humanTitle,
        detail: `Incoming ${selectedTask.teamLabel} request ($${selectedTask.dollarStakesUsd} at stake) routed autonomously to ${selectedTask.modelName}.`,
        costDeltaUsd: 0,
        tone: 'neutral',
      },
    ];

    const spanCostShare =
      selectedTask.tokenCostUsd / Math.max(1, selectedTask.otelSpans.length);

    selectedTask.otelSpans.forEach((span, idx) => {
      steps.push({
        id: span.spanId,
        timeLabel: `T + ${((idx + 1) * 1.4).toFixed(1)}s`,
        actor: 'AI Agent',
        title: span.humanStepLabel,
        detail: `${span.detail} (${(span.inputTokens + span.outputTokens).toLocaleString()} tok · ${span.latencyMs}ms)`,
        costDeltaUsd: spanCostShare,
        tone: span.status,
      });
    });

    if (selectedTask.failed) {
      steps.push({
        id: 'discovery',
        timeLabel: `T + ${selectedTask.discoveryHours}h`,
        actor: 'Customer',
        title: `Silent defect discovered (Day ${Math.max(1, Math.round(selectedTask.discoveryHours / 24))})`,
        detail: selectedTask.failureRootCause,
        costDeltaUsd: costAnatomy.triage,
        tone: 'error',
      });
      steps.push({
        id: 'human-fix',
        timeLabel: `+${selectedTask.cleanupMinutes} min`,
        actor: 'Human Specialist',
        title: `${selectedTask.blsRoleTitle} fixes broken outcome`,
        detail: `${selectedTask.humanFixSummary} Billed at $${selectedTask.blsHourlyRateUsd.toFixed(2)}/hr (BLS SOC ${selectedTask.blsSocCode}).`,
        costDeltaUsd: costAnatomy.remediation + costAnatomy.reprocessing,
        tone: 'error',
      });
    } else {
      steps.push({
        id: 'verified',
        timeLabel: 'T + 14 Days',
        actor: 'AI Agent',
        title: 'Verified clean through 14-day window',
        detail: selectedTask.humanFixSummary,
        costDeltaUsd: 0,
        tone: 'ok',
      });
    }

    return steps;
  }, [selectedTask, costAnatomy]);

  const safeStepIdx = Math.min(activeStepIdx, cascadeSteps.length - 1);

  return (
    <section className="flex-1 w-full h-full overflow-hidden bg-paper-mist px-5 md:px-8 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* COLS 1–3: Compact Plain-English Real Task Selector */}
      <aside className="lg:col-span-3 flex flex-col min-h-0">
        <div className="mb-2.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-tag text-ink-soft">
            Chapter 4 · Forensic Tear-Sheet
          </div>
          <h1 className="font-serif text-[28px] leading-tight text-ink">
            14 Real Tasks
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto clean-scroll pr-1 space-y-1.5">
          {tasks.map((task) => {
            const active = task.id === selectedTask.id;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  onSelectTask(task);
                  setActiveStepIdx(0);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-ink text-paper shadow-sm'
                    : 'bg-paper/80 hover:bg-paper text-ink'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        task.failed ? 'bg-crimson' : 'bg-botanical'
                      }`}
                    />
                    <span className="text-[12.5px] font-semibold truncate">
                      {task.shortLabel}
                    </span>
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 truncate ${
                      active ? 'text-paper/60' : 'text-ink-soft'
                    }`}
                  >
                    {task.teamLabel}
                  </div>
                </div>

                <div className="text-right font-mono text-[11.5px] shrink-0 tabular-nums-strict">
                  <div
                    className={`font-semibold ${
                      task.failed
                        ? active
                          ? 'text-crimson-glow'
                          : 'text-crimson'
                        : active
                        ? 'text-botanical-soft'
                        : 'text-botanical'
                    }`}
                  >
                    ${task.totalSettledCostUsd.toFixed(2)}
                  </div>
                  <div
                    className={`text-[9.5px] ${
                      active ? 'text-paper/55' : 'text-ink-soft'
                    }`}
                  >
                    AI ${task.tokenCostUsd.toFixed(2)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* COLS 4–8: Physical Two-Act Tear-Off Receipt OR Sumi-Obsidian OTel JSON */}
      <div className="lg:col-span-5 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-[11px] font-mono text-ink-muted truncate">
            {selectedTask.corpus === 'tau-bench' ? 'Sierra TAU-bench' : 'Princeton SWE-bench'} · {selectedTask.id}
          </span>
          <button
            type="button"
            onClick={() => setInspectRawTelemetry((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
              inspectRawTelemetry
                ? 'bg-obsidian text-paper'
                : 'bg-paper text-ink border border-ink/12 hover:bg-ink hover:text-paper'
            }`}
          >
            {inspectRawTelemetry ? (
              <>
                <Receipt className="w-3.5 h-3.5" />
                Show Receipt
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5" />
                Inspect Raw OTel JSON
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto clean-scroll pb-2">
          {inspectRawTelemetry ? (
            <div className="bg-obsidian text-paper rounded-2xl p-5 font-mono text-[11.5px] leading-relaxed shadow-xl h-full overflow-auto dark-scroll">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-paper/12 text-[10.5px] text-paper/60">
                <span>OPENTELEMETRY SPAN &amp; AUDIT JSON · {selectedTask.id}</span>
                <span className="text-botanical-soft">{totalTokens.toLocaleString()} tok</span>
              </div>
              <pre className="text-paper/85">
                {JSON.stringify(
                  {
                    trace_id: selectedTask.id,
                    benchmark: selectedTask.corpus,
                    domain: selectedTask.domain,
                    model: selectedTask.modelName,
                    act_1_ai_invoice: {
                      input_tokens: selectedTask.inputTokens,
                      output_tokens: selectedTask.outputTokens,
                      cache_hit_rate: selectedTask.cacheHitRate,
                      retry_count: selectedTask.retryCount,
                      token_cost_usd: selectedTask.tokenCostUsd,
                    },
                    act_2_human_rework: {
                      failed: selectedTask.failed,
                      discovery_hours: Number.isFinite(selectedTask.discoveryHours)
                        ? selectedTask.discoveryHours
                        : null,
                      cleanup_minutes: selectedTask.cleanupMinutes,
                      bls_soc_code: selectedTask.blsSocCode,
                      bls_loaded_hourly_usd: selectedTask.blsHourlyRateUsd,
                      cost_breakdown: costAnatomy,
                      root_cause: selectedTask.failureRootCause,
                    },
                    otel_spans: selectedTask.otelSpans,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            <div className="w-full shadow-[0_18px_46px_-20px_rgba(23,22,20,0.22)] rounded-2xl overflow-hidden">
              {/* ACT 1: THE AI BILL */}
              <div className="bg-paper px-6 py-5">
                <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-ink/10">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-tag text-ink-soft">
                      Act 1 · The AI Invoice ({selectedTask.modelName})
                    </div>
                    <h2 className="font-serif text-[28px] leading-tight text-ink mt-0.5">
                      {selectedTask.humanTitle}
                    </h2>
                    <p className="text-[12.5px] text-ink-muted mt-1">
                      {selectedTask.aiActionSummary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="monument-numeral text-[42px] text-ink">
                      ${selectedTask.tokenCostUsd.toFixed(2)}
                    </div>
                    <div className="font-mono text-[10.5px] text-ink-soft tabular-nums-strict">
                      {totalTokens.toLocaleString()} tok
                    </div>
                  </div>
                </div>

                {/* Tool Spans on Receipt */}
                <div className="mt-3.5 space-y-2">
                  {selectedTask.otelSpans.map((span) => (
                    <div
                      key={span.spanId}
                      className="flex items-start justify-between gap-3 text-[12px]"
                    >
                      <div className="flex items-start gap-2">
                        {span.status === 'ok' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-botanical shrink-0 mt-0.5" />
                        )}
                        {span.status === 'retry' && (
                          <RefreshCw className="w-3.5 h-3.5 text-amberdepth shrink-0 mt-0.5" />
                        )}
                        {span.status === 'error' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-crimson shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-ink">
                            {span.humanStepLabel}
                            {span.cacheHit && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-botanical-wash text-botanical font-mono text-[9px]">
                                cached
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-ink-muted">
                            {span.detail}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-[10.5px] text-ink-soft shrink-0 tabular-nums-strict">
                        {span.latencyMs}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PHYSICAL TEAR-OFF PERFORATION */}
              <div className="relative h-5 bg-paper flex items-center justify-center">
                <div className="absolute inset-x-0 top-0 h-2.5 receipt-perforation" />
                <div className="w-full border-t border-dashed border-ink/20" />
              </div>

              {/* ACT 2: HUMAN CLEANUP BILL */}
              {selectedTask.failed ? (
                <div className="bg-[#FDF4F5] px-6 py-5 border-t border-crimson/15">
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-crimson/15">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-tag text-crimson">
                        <Clock className="w-3.5 h-3.5" />
                        Act 2 · {selectedTask.discoveryHours}h later — Human Cleanup Bill
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-ink leading-relaxed">
                        {selectedTask.humanFixSummary}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="monument-numeral text-[42px] text-crimson">
                        +${selectedTask.humanCleanupCostUsd.toFixed(2)}
                      </div>
                      <div className="font-mono text-[10.5px] text-crimson/80 tabular-nums-strict">
                        {selectedTask.cleanupMinutes} min work
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] font-mono text-ink-muted tabular-nums-strict">
                    <span className="inline-flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-crimson" />
                      {selectedTask.blsRoleTitle} (SOC {selectedTask.blsSocCode})
                    </span>
                    <span>
                      {selectedTask.cleanupMinutes}m × ${selectedTask.blsHourlyRateUsd.toFixed(2)}/hr
                    </span>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-crimson/20 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-tag text-ink-muted">
                        True Total Cost
                      </div>
                      <div className="text-[12px] text-crimson font-semibold">
                        {multiplier.toFixed(1)}× the ${selectedTask.tokenCostUsd.toFixed(2)} AI bill
                      </div>
                    </div>
                    <div className="monument-numeral text-[48px] text-ink">
                      ${selectedTask.totalSettledCostUsd.toFixed(2)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-botanical-wash/80 px-6 py-5 border-t border-botanical/15 flex items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-tag text-botanical">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Act 2 · Zero Human Cleanup Needed
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      {selectedTask.humanFixSummary}
                    </p>
                  </div>
                  <div className="monument-numeral text-[42px] text-botanical shrink-0">
                    ${selectedTask.totalSettledCostUsd.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* COLS 9–12: Cost Delta Breakdown + Interactive Customer & Agent Failure Cascade */}
      <div className="lg:col-span-4 flex flex-col min-h-0 gap-4">
        {/* Side-by-Side Cost Delta Anatomy */}
        <div className="shrink-0 bg-paper rounded-2xl border border-ink/[0.08] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-tag text-ink-muted">
              Cost Explosion Anatomy
            </span>
            <span className="font-mono text-[11px] font-semibold text-crimson tabular-nums-strict">
              {selectedTask.failed ? `${multiplier.toFixed(1)}× Hidden Multiplier` : '1.0× Clean'}
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-[11.5px] tabular-nums-strict">
            {/* Nominal API Bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-sans font-medium text-ink">
                  Nominal API Tokens
                </span>
                <span className="font-semibold text-botanical">
                  ${costAnatomy.api.toFixed(2)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-ink/[0.07] overflow-hidden">
                <div
                  style={{
                    width: `${Math.max(
                      3,
                      (costAnatomy.api / Math.max(0.01, costAnatomy.total)) * 100
                    )}%`,
                  }}
                  className="h-full bg-botanical rounded-full"
                />
              </div>
            </div>

            {selectedTask.failed && (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-ink-muted">
                      Escalation &amp; Ticket Triage
                    </span>
                    <span className="text-amberdepth font-semibold">
                      +${costAnatomy.triage.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ink/[0.07] overflow-hidden">
                    <div
                      style={{
                        width: `${(costAnatomy.triage / costAnatomy.total) * 100}%`,
                      }}
                      className="h-full bg-amberdepth rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-ink-muted">
                      {selectedTask.category === 'engineering'
                        ? 'Senior Eng Debugging & Patch'
                        : 'Specialist Reversal & Fix'}
                    </span>
                    <span className="text-crimson font-semibold">
                      +${costAnatomy.remediation.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ink/[0.07] overflow-hidden">
                    <div
                      style={{
                        width: `${(costAnatomy.remediation / costAnatomy.total) * 100}%`,
                      }}
                      className="h-full bg-crimson rounded-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-sans text-ink-muted">
                      Verification &amp; Reprocessing
                    </span>
                    <span className="text-crimson-deep font-semibold">
                      +${costAnatomy.reprocessing.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ink/[0.07] overflow-hidden">
                    <div
                      style={{
                        width: `${(costAnatomy.reprocessing / costAnatomy.total) * 100}%`,
                      }}
                      className="h-full bg-crimson-deep rounded-full"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Interactive Step-by-Step Customer Journey & Agent Failure Cascade */}
        <div className="flex-1 min-h-0 bg-paper rounded-2xl border border-ink/[0.08] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-tag text-ink-muted">
              <Activity className="w-3.5 h-3.5 text-cobalt" />
              Customer &amp; Agent Cascade
            </span>
            <span className="font-mono text-[10.5px] text-ink-soft">
              {cascadeSteps.length} events
            </span>
          </div>

          <div className="flex-1 overflow-y-auto clean-scroll pr-1 relative pl-5 space-y-2.5">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-ink/15" />

            {cascadeSteps.map((step, idx) => {
              const isSelected = idx === safeStepIdx;
              const dotClass =
                step.tone === 'error'
                  ? 'bg-crimson'
                  : step.tone === 'retry'
                  ? 'bg-amberdepth'
                  : step.tone === 'ok'
                  ? 'bg-botanical'
                  : 'bg-ink';

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepIdx(idx)}
                  className={`relative w-full text-left rounded-xl p-2.5 transition-all border ${
                    isSelected
                      ? 'bg-paper-warm border-ink/25 shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-paper-warm/60'
                  }`}
                >
                  <span
                    className={`absolute -left-5 top-3.5 w-3.5 h-3.5 rounded-full border-2 border-paper ${dotClass}`}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                      {step.timeLabel} · {step.actor}
                    </span>
                    {step.costDeltaUsd > 0 && (
                      <span
                        className={`font-mono text-[10.5px] font-semibold tabular-nums-strict ${
                          step.tone === 'error' ? 'text-crimson' : 'text-ink-muted'
                        }`}
                      >
                        +${step.costDeltaUsd.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] font-semibold text-ink mt-0.5 leading-snug">
                    {step.title}
                  </div>
                  <p className="text-[11.5px] text-ink-muted mt-0.5 leading-relaxed">
                    {step.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
