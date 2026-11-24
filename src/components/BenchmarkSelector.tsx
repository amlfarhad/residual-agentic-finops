import React from 'react';
import { BookOpen, Code2, Headphones, Layers, UploadCloud } from 'lucide-react';
import { BENCHMARK_MANIFEST } from '../data/benchmarks/manifest';
import { ActiveCorpusId, useFinOpsStore } from '../store/useFinOpsStore';

export const BenchmarkSelector: React.FC = () => {
  const { activeCorpusId, setActiveCorpus, customTraces, setIngestionDrawerOpen } = useFinOpsStore();

  const iconForCorpus = (id: string) => {
    if (id === 'tau-bench') return <Headphones className="h-4 w-4" />;
    if (id === 'swe-bench') return <Code2 className="h-4 w-4" />;
    return <Layers className="h-4 w-4" />;
  };

  return (
    <section aria-label="Benchmark Corpus Picker" className="rounded-sm border border-vellum-border bg-vellum-panel/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-ink-secondary" />
          <h2 className="font-serif text-base font-semibold text-ink-primary">
            Public Telemetry Benchmark Corpora &amp; Live Trace Ingestion
          </h2>
        </div>
        <span className="font-mono text-[11px] text-ink-muted">
          Zero Synthetic Data · Grounded in Published Agentic Eval Traces
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {BENCHMARK_MANIFEST.map((corpus) => {
          const isActive = activeCorpusId === corpus.id;
          return (
            <button
              key={corpus.id}
              type="button"
              onClick={() => setActiveCorpus(corpus.id as ActiveCorpusId)}
              className={`group flex flex-col justify-between rounded-sm border p-3.5 text-left transition-all ${
                isActive
                  ? 'border-ink-primary bg-vellum-sheet shadow-editorial'
                  : 'border-vellum-border bg-vellum-sheet/60 hover:border-ink-muted hover:bg-vellum-sheet'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                      isActive ? 'text-finops-indigo' : 'text-ink-muted'
                    }`}
                  >
                    {iconForCorpus(corpus.id)}
                    {corpus.shortName}
                  </span>
                  <span
                    className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${
                      isActive
                        ? 'bg-ink-primary text-vellum-sheet'
                        : 'bg-vellum-panel text-ink-secondary'
                    }`}
                  >
                    {corpus.traceCountLabel}
                  </span>
                </div>
                <p className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">
                  {corpus.description}
                </p>
              </div>
              <p className="mt-3 border-t border-vellum-border pt-2 font-mono text-[10px] text-ink-muted">
                {corpus.citation}
              </p>
            </button>
          );
        })}

        {/* Custom Ingestion Card */}
        <div
          className={`flex flex-col justify-between rounded-sm border p-3.5 transition-all ${
            activeCorpusId === 'custom'
              ? 'border-ink-primary bg-vellum-sheet shadow-editorial'
              : 'border-dashed border-ink-faint bg-vellum-sheet/40 hover:border-ink-primary hover:bg-vellum-sheet'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-finops-amber">
                <UploadCloud className="h-4 w-4" />
                Custom Telemetry
              </span>
              <span className="rounded-sm bg-vellum-panel px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                {customTraces.length} loaded
              </span>
            </div>
            <p className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">
              Drop or paste live OpenTelemetry GenAI JSON spans, Langfuse exports, or Sierra τ-bench JSONL trajectories for instant FinOps settlement.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-vellum-border pt-2">
            <button
              type="button"
              onClick={() => setIngestionDrawerOpen(true)}
              className="flex-1 rounded-sm border border-ink-primary bg-ink-primary px-2.5 py-1 font-mono text-[11px] font-medium text-vellum-sheet hover:bg-ink-secondary"
            >
              Open Dropzone
            </button>
            {customTraces.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCorpus('custom')}
                className="rounded-sm border border-vellum-rule bg-vellum-panel px-2.5 py-1 font-mono text-[11px] font-medium text-ink-primary hover:border-ink-primary"
              >
                View Only
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
