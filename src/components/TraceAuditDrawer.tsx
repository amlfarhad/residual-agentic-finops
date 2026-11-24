import React, { useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  ShieldAlert,
  Terminal,
  UserCheck,
  X,
} from 'lucide-react';
import { formatMoney, useFinOpsStore } from '../store/useFinOpsStore';
import { ReworkCategory } from '../types/economics';
import { TraceSettlementLedger } from '../types/settlement';

interface TraceAuditDrawerProps {
  ledger: TraceSettlementLedger | null;
  onClose: () => void;
}

const REWORK_BADGE_META: Record<ReworkCategory, { label: string; style: string }> = {
  TOOL_SCHEMA_RETRY: {
    label: 'Tool Schema Retry',
    style: 'border-finops-amber/40 bg-finops-amberSoft text-finops-amber',
  },
  HALLUCINATION_CORRECTION: {
    label: 'Policy / Hallucination Loop',
    style: 'border-finops-crimson/40 bg-finops-crimsonSoft text-finops-crimson',
  },
  CONTEXT_THRASHING: {
    label: 'Context Thrashing',
    style: 'border-finops-amber/40 bg-finops-amberSoft text-finops-amber',
  },
  COMPILATION_TEST_LOOP: {
    label: 'Compile / Pytest Retry Loop',
    style: 'border-finops-amber/40 bg-finops-amberSoft text-finops-amber',
  },
  HUMAN_ESCALATION_HANDOFF: {
    label: 'Human Escalation Handoff',
    style: 'border-finops-crimson/40 bg-finops-crimsonSoft text-finops-crimson',
  },
};

export const TraceAuditDrawer: React.FC<TraceAuditDrawerProps> = ({ ledger, onClose }) => {
  const { simulation } = useFinOpsStore();
  const c = simulation.currency;

  useEffect(() => {
    if (!ledger) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ledger, onClose]);

  if (!ledger) return null;

  const { trace, spanCosts, reworkEvents, slaAudit } = ledger;
  const isSurplus = ledger.netEconomicSurplusUsd >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink-primary/35 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Forensic Trace Audit for ${trace.taskId}`}
    >
      {/* Backdrop click target */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Over Vellum Audit Dossier */}
      <aside className="relative flex h-full w-full max-w-3xl flex-col border-l border-vellum-rule bg-vellum-sheet shadow-drawer">
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-4 border-b border-vellum-border bg-vellum-panel px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-finops-indigo">
                Forensic Audit Dossier
              </span>
              <span className="text-vellum-rule">|</span>
              <span className="font-mono text-xs font-semibold text-ink-primary">
                {trace.taskId}
              </span>
              <span className="rounded-sm border border-vellum-rule bg-vellum-sheet px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                {trace.sourceFormat.toUpperCase()}
              </span>
              <span className="rounded-sm border border-vellum-rule bg-vellum-sheet px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                SLA {trace.slaTier}
              </span>
            </div>
            <h3 className="mt-1.5 font-serif text-xl font-semibold text-ink-primary">
              {trace.title}
            </h3>
            <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
              {trace.objective}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Forensic Drawer"
            className="rounded-sm border border-vellum-rule bg-vellum-sheet p-1.5 text-ink-secondary hover:border-ink-primary hover:text-ink-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. Economic Waterfall Reconciliation */}
          <section className="rounded-sm border border-vellum-border bg-vellum-panel/60 p-4">
            <div className="flex items-center justify-between border-b border-vellum-border pb-2.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                Unit-Economics Settlement Waterfall
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                {ledger.blsOccupationTitle} @ {formatMoney(ledger.effectiveHumanHourlyRateUsd, c, 2)}/hr loaded
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-2.5">
                <p className="font-mono text-[10px] uppercase text-ink-muted">1st-Pass Tokens</p>
                <p className="mt-1 font-mono text-sm font-semibold text-finops-indigo">
                  {formatMoney(ledger.firstPassTokenCostUsd, c, 4)}
                </p>
              </div>
              <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-2.5">
                <p className="font-mono text-[10px] uppercase text-ink-muted">Rework Tokens</p>
                <p className="mt-1 font-mono text-sm font-semibold text-finops-amber">
                  {formatMoney(ledger.reworkTokenCostUsd, c, 4)}
                </p>
              </div>
              <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-2.5">
                <p className="font-mono text-[10px] uppercase text-ink-muted">Human QA + Esc</p>
                <p className="mt-1 font-mono text-sm font-semibold text-ink-primary">
                  {formatMoney(
                    ledger.humanOversightCostUsd + ledger.humanEscalationCostUsd,
                    c,
                    2
                  )}
                </p>
              </div>
              <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-2.5">
                <p className="font-mono text-[10px] uppercase text-ink-muted">SLA Accrual</p>
                <p
                  className={`mt-1 font-mono text-sm font-semibold ${
                    slaAudit.breached ? 'text-finops-crimson' : 'text-finops-emerald'
                  }`}
                >
                  {formatMoney(slaAudit.accruedPenaltyUsd, c, 2)}
                </p>
              </div>
              <div className="rounded-sm border border-ink-primary/20 bg-vellum-sheet p-2.5">
                <p className="font-mono text-[10px] uppercase text-ink-muted">True Unit Cost</p>
                <p className="mt-1 font-mono text-sm font-bold text-ink-primary">
                  {formatMoney(ledger.trueUnitCostUsd, c, 2)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-vellum-border pt-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 font-mono">
                <span className="text-ink-secondary">
                  BLS Human Baseline:{' '}
                  <strong className="text-ink-primary">
                    {formatMoney(ledger.humanBaselineCostUsd, c, 2)}
                  </strong>{' '}
                  ({trace.humanBaselineMinutes}m)
                </span>
                <span className="text-ink-secondary">
                  Cache Hit:{' '}
                  <strong className="text-finops-emerald">
                    {ledger.effectiveCacheHitPct.toFixed(1)}%
                  </strong>{' '}
                  (saved {formatMoney(ledger.cacheSavingsUsd, c, 4)})
                </span>
              </div>

              <div
                className={`rounded-sm border px-2.5 py-1 font-mono text-xs font-semibold ${
                  isSurplus
                    ? 'border-finops-emerald/30 bg-finops-emeraldSoft text-finops-emerald'
                    : 'border-finops-crimson/30 bg-finops-crimsonSoft text-finops-crimson'
                }`}
              >
                Net {isSurplus ? 'Surplus' : 'Deficit'}: {isSurplus ? '+' : ''}
                {formatMoney(ledger.netEconomicSurplusUsd, c, 2)} ({ledger.roiPct >= 0 ? '+' : ''}
                {ledger.roiPct.toFixed(0)}% ROI)
              </div>
            </div>
          </section>

          {/* 2. SLA Compliance Banner */}
          <section
            className={`flex items-start gap-3 rounded-sm border p-3.5 text-xs ${
              slaAudit.breached
                ? 'border-finops-crimson/35 bg-finops-crimsonSoft/60 text-finops-crimson'
                : 'border-finops-emerald/30 bg-finops-emeraldSoft/45 text-finops-emerald'
            }`}
          >
            {slaAudit.breached ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                {slaAudit.breached
                  ? `Contractual SLA ${slaAudit.tier} Breach Triggered`
                  : `SLA ${slaAudit.tier} Compliant`}
              </p>
              <p className="mt-0.5 font-sans text-ink-secondary">
                Effective resolution time:{' '}
                <strong className="font-mono text-ink-primary">
                  {slaAudit.effectiveResolutionMinutes.toFixed(1)} min
                </strong>{' '}
                vs. target{' '}
                <strong className="font-mono text-ink-primary">
                  {slaAudit.targetMinutes} min
                </strong>
                {slaAudit.breached
                  ? ` (+${slaAudit.overageMinutes.toFixed(1)} min overage → ${formatMoney(
                      slaAudit.accruedPenaltyUsd,
                      c,
                      2
                    )} service credit penalty).`
                  : ' — zero contractual penalty accrued.'}
              </p>
            </div>
          </section>

          {/* 3. Forensic Rework Root-Cause Diagnostics */}
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-serif text-base font-semibold text-ink-primary">
                <AlertTriangle className="h-4 w-4 text-finops-amber" />
                Forensic Rework Diagnosis ({reworkEvents.length} detected)
              </h4>
              <span className="font-mono text-[11px] text-finops-amber">
                Hidden Rework Tax: {ledger.hiddenReworkTaxPct.toFixed(1)}% of True Cost
              </span>
            </div>

            {reworkEvents.length === 0 ? (
              <div className="rounded-sm border border-finops-emerald/30 bg-finops-emeraldSoft/35 p-3.5 text-xs text-finops-emerald">
                Clean first-pass execution — zero tool schema errors, hallucinated policy loops, redundant context reads, or human handoffs detected.
              </div>
            ) : (
              <div className="space-y-2.5">
                {reworkEvents.map((evt) => {
                  const badge = REWORK_BADGE_META[evt.category];
                  return (
                    <div
                      key={evt.id}
                      className="rounded-sm border border-vellum-border bg-vellum-panel/50 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-semibold text-ink-muted">
                            STEP {evt.stepIndex}
                          </span>
                          <span
                            className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badge.style}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-medium text-ink-primary">{evt.title}</span>
                        </div>
                        <span className="font-mono font-semibold text-finops-amber">
                          +{formatMoney(evt.reworkCostUsd, c, 4)} ·{' '}
                          {((evt.wastedPromptTokens + evt.wastedCompletionTokens) / 1000).toFixed(1)}
                          k tok
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink-secondary">
                        {evt.diagnosticEvidence}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Step-by-Step Span & Tool-Call Execution Timeline */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-serif text-base font-semibold text-ink-primary">
                <Layers className="h-4 w-4 text-finops-indigo" />
                Step-by-Step Span &amp; Tool-Call Timeline ({trace.spans.length} spans)
              </h4>
              <span className="font-mono text-[11px] text-ink-muted">
                Total Runtime: {(trace.totalDurationMs / 1000).toFixed(1)}s ·{' '}
                {(ledger.totalTokens / 1000).toFixed(1)}k tokens
              </span>
            </div>

            <div className="space-y-3 border-l-2 border-vellum-rule pl-4">
              {trace.spans.map((span, idx) => {
                const cost = spanCosts[idx];
                const isHandoff = span.kind === 'human_handoff';
                const isRework = cost?.isReworkSpan ?? false;

                return (
                  <div
                    key={span.spanId}
                    className={`relative rounded-sm border p-3.5 text-xs ${
                      isHandoff
                        ? 'border-finops-crimson/40 bg-finops-crimsonSoft/25'
                        : isRework
                          ? 'border-finops-amber/40 bg-finops-amberSoft/20'
                          : 'border-vellum-border bg-vellum-sheet'
                    }`}
                  >
                    {/* Timeline Node Dot */}
                    <span
                      className={`absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-vellum-sheet ${
                        isHandoff
                          ? 'bg-finops-crimson'
                          : isRework
                            ? 'bg-finops-amber'
                            : 'bg-finops-indigo'
                      }`}
                    />

                    {/* Span Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-sm bg-ink-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-vellum-sheet">
                          #{span.stepIndex}
                        </span>
                        <span className="font-mono font-semibold text-ink-primary">
                          {span.name}
                        </span>
                        {isHandoff && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-finops-crimsonSoft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-finops-crimson">
                            <UserCheck className="h-3 w-3" />
                            HANDOFF
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="inline-flex items-center gap-1 text-ink-muted">
                          <Clock className="h-3 w-3" />
                          {(span.latencyMs / 1000).toFixed(1)}s
                        </span>
                        <span className="inline-flex items-center gap-1 text-ink-muted">
                          <Cpu className="h-3 w-3" />
                          {span.modelId}
                        </span>
                        <span className="font-semibold text-ink-primary">
                          {formatMoney(cost?.totalSpanCostUsd ?? 0, c, 4)}
                        </span>
                      </div>
                    </div>

                    {/* Input / Output Summaries */}
                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-sm border border-vellum-border bg-vellum-panel/50 p-2">
                        <p className="font-mono text-[10px] uppercase text-ink-muted">Input Context</p>
                        <p className="mt-0.5 text-ink-secondary">{span.inputSummary}</p>
                      </div>
                      <div className="rounded-sm border border-vellum-border bg-vellum-panel/50 p-2">
                        <p className="font-mono text-[10px] uppercase text-ink-muted">Agent Output</p>
                        <p className="mt-0.5 text-ink-primary">{span.outputSummary}</p>
                      </div>
                    </div>

                    {/* Token & Cache Telemetry Row */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-ink-muted">
                      <span>
                        Prompt: <strong className="text-ink-primary">{span.tokens.promptTokens.toLocaleString()}</strong>
                      </span>
                      <span>
                        Cached:{' '}
                        <strong className="text-finops-emerald">
                          {span.tokens.cachedPromptTokens.toLocaleString()}
                        </strong>
                      </span>
                      <span>
                        Completion:{' '}
                        <strong className="text-ink-primary">
                          {span.tokens.completionTokens.toLocaleString()}
                        </strong>
                      </span>
                      {span.tokens.reasoningTokens ? (
                        <span>
                          Reasoning:{' '}
                          <strong className="text-finops-indigo">
                            {span.tokens.reasoningTokens.toLocaleString()}
                          </strong>
                        </span>
                      ) : null}
                      {cost && cost.reworkCostUsd > 0 && (
                        <span className="text-finops-amber">
                          Rework Attrib: {(cost.reworkAttributionRatio * 100).toFixed(0)}% (
                          {formatMoney(cost.reworkCostUsd, c, 4)})
                        </span>
                      )}
                    </div>

                    {/* Tool Calls */}
                    {span.toolCalls.length > 0 && (
                      <div className="mt-2.5 space-y-1.5 border-t border-vellum-border pt-2.5">
                        {span.toolCalls.map((tc) => {
                          const failed = tc.status !== 'success';
                          return (
                            <div
                              key={tc.id}
                              className={`rounded-sm border px-2.5 py-2 font-mono text-[11px] ${
                                failed
                                  ? 'border-finops-crimson/35 bg-finops-crimsonSoft/40'
                                  : 'border-vellum-border bg-vellum-panel/70'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-ink-primary">
                                  <Terminal className="h-3 w-3 text-ink-muted" />
                                  {tc.name}
                                </span>
                                <span
                                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                    failed
                                      ? 'bg-finops-crimson text-vellum-sheet'
                                      : 'bg-finops-emeraldSoft text-finops-emerald'
                                  }`}
                                >
                                  {tc.status.replace('_', ' ')} · {tc.latencyMs}ms
                                </span>
                              </div>
                              {Object.keys(tc.arguments).length > 0 && (
                                <p className="mt-1 truncate text-[10px] text-ink-muted">
                                  args: {JSON.stringify(tc.arguments)}
                                </p>
                              )}
                              {tc.errorMessage && (
                                <p className="mt-1 flex items-start gap-1 text-finops-crimson">
                                  <AlertOctagon className="mt-0.5 h-3 w-3 shrink-0" />
                                  <span>{tc.errorMessage}</span>
                                </p>
                              )}
                              {!tc.errorMessage && tc.output && (
                                <p className="mt-1 truncate text-[10px] text-ink-secondary">
                                  out: {tc.output}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
