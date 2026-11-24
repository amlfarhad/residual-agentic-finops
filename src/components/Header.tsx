import React from 'react';
import { Upload, Database, Scale, FileSpreadsheet } from 'lucide-react';
import { useFinOpsStore } from '../store/useFinOpsStore';
import { SimulationParameters } from '../types/economics';

interface HeaderProps {
  activeTraceCount: number;
  isSimulated: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTraceCount, isSimulated }) => {
  const { simulation, updateSimulation, setIngestionDrawerOpen, activeCorpusId } = useFinOpsStore();

  const currencies: SimulationParameters['currency'][] = ['USD', 'EUR', 'GBP'];

  const corpusLabelMap = {
    combined: 'Blended Enterprise Ledger',
    'tau-bench': 'TAU-bench CX Corpus',
    'swe-bench': 'SWE-bench Verified Dev',
    custom: 'Custom Ingested Telemetry',
  };

  return (
    <header className="sticky top-0 z-30 border-b border-vellum-border bg-vellum-sheet/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        {/* Left Masthead */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-ink-primary bg-ink-primary text-vellum-sheet font-serif text-xl font-semibold tracking-tight">
            R
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-primary leading-none">
                RESIDUAL
              </h1>
              <span className="hidden sm:inline-block rounded-sm border border-vellum-rule bg-vellum-panel px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-secondary">
                FinOps Unit-Economics Engine v1.4
              </span>
              {isSimulated && (
                <span className="rounded-sm border border-finops-amber/40 bg-finops-amberSoft px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-finops-amber">
                  Stress Scenario Active
                </span>
              )}
            </div>
            <p className="mt-1 font-sans text-xs text-ink-muted">
              Agentic Operations &amp; &ldquo;Hidden Rework&rdquo; Audit Ledger · BLS OEWS + Live LLM Rate Oracles
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Corpus Indicator */}
          <div className="hidden md:flex items-center gap-2 rounded-sm border border-vellum-border bg-vellum-panel px-3 py-1.5 text-xs">
            <Database className="h-3.5 w-3.5 text-finops-indigo" />
            <span className="font-medium text-ink-secondary">{corpusLabelMap[activeCorpusId]}</span>
            <span className="text-vellum-rule">|</span>
            <span className="font-mono font-semibold text-ink-primary">{activeTraceCount} traces</span>
          </div>

          {/* Oracle Reference Pill */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-sm border border-vellum-border bg-vellum-sheet px-2.5 py-1.5 font-mono text-[11px] text-ink-muted">
            <Scale className="h-3.5 w-3.5 text-finops-emerald" />
            <span>BLS 1.34× Loaded</span>
          </div>

          {/* Currency Toggle */}
          <div
            className="inline-flex rounded-sm border border-vellum-rule bg-vellum-panel p-0.5"
            role="group"
            aria-label="Settlement Currency"
          >
            {currencies.map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => updateSimulation({ currency: curr })}
                className={`px-2.5 py-1 font-mono text-xs font-medium transition-colors rounded-sm ${
                  simulation.currency === curr
                    ? 'bg-ink-primary text-vellum-sheet'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Ingest Telemetry Trigger */}
          <button
            type="button"
            onClick={() => setIngestionDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-sm border border-ink-primary bg-ink-primary px-3.5 py-1.5 font-sans text-xs font-medium text-vellum-sheet transition-all hover:bg-ink-secondary shadow-editorial"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Ingest Traces</span>
          </button>
        </div>
      </div>

      {/* Subtle Editorial Footnote Sub-Bar */}
      <div className="border-t border-vellum-border/80 bg-vellum-panel/60">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-5 py-1.5 sm:px-8 font-mono text-[11px] text-ink-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>RATE ORACLES: OpenAI · Anthropic · Vertex AI · AWS Bedrock (2025-Q1)</span>
            <span className="hidden sm:inline text-vellum-rule">•</span>
            <span className="hidden sm:inline">
              LABOR ORACLES: SOC 43-4051 ($27.40/hr) · SOC 15-1232 ($40.40/hr) · SOC 15-1252 ($88.17/hr)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-ink-secondary">
            <FileSpreadsheet className="h-3 w-3" />
            <span>OTel GenAI · Langfuse · τ-bench Schema Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};
