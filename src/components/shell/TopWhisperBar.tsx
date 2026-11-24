import React from 'react';
import {
  Database,
  Upload,
  Sparkles,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react';

export type CorpusId = 'combined' | 'tau-bench' | 'swe-bench' | 'custom';

interface TopWhisperBarProps {
  activeCorpus: CorpusId;
  onCorpusChange: (corpus: CorpusId) => void;
  traceCount: number;
  selectedModelId: string;
  selectedLaborRegion: string;
  duckdbReady: boolean;
  onOpenIngest: () => void;
  onOpenSql: () => void;
  onOpenOracle: () => void;
  onOpenLedger: () => void;
}

const CORPUS_OPTIONS: { id: CorpusId; label: string }[] = [
  { id: 'combined', label: 'ALL CORPORA' },
  { id: 'tau-bench', label: 'τ-BENCH' },
  { id: 'swe-bench', label: 'SWE-BENCH' },
];

export const TopWhisperBar: React.FC<TopWhisperBarProps> = ({
  activeCorpus,
  onCorpusChange,
  traceCount,
  selectedModelId,
  selectedLaborRegion,
  duckdbReady,
  onOpenIngest,
  onOpenSql,
  onOpenOracle,
  onOpenLedger,
}) => {
  return (
    <header className="relative z-30 w-full px-6 md:px-10 pt-4 pb-3 flex items-center justify-between hairline-b bg-alabaster/40 backdrop-blur-md">
      {/* Left: Instrument Wordmark + Corpus Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-[23px] tracking-[-0.02em] text-sumi leading-none">
            Residual
          </span>
          <span className="plate-caption text-[9.5px] hidden sm:inline">
            OPTICAL CLEARING INSTRUMENT
          </span>
        </div>

        <div className="h-3.5 w-px bg-sumi/12 hidden md:block" />

        {/* Frameless Inline Corpus Switcher */}
        <nav
          aria-label="Production Trace Corpus"
          className="hidden md:flex items-center gap-1"
        >
          {CORPUS_OPTIONS.map((opt) => {
            const active = activeCorpus === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onCorpusChange(opt.id)}
                className={`px-2.5 py-1 text-[10px] font-semibold tracking-museum uppercase transition-all duration-300 rounded-full ${
                  active
                    ? 'text-sumi bg-sumi/[0.065]'
                    : 'text-sumi/45 hover:text-sumi/80'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          {activeCorpus === 'custom' && (
            <span className="px-2.5 py-1 text-[10px] font-semibold tracking-museum uppercase text-cobalt bg-cobalt/10 rounded-full">
              CUSTOM BATCH
            </span>
          )}
        </nav>
      </div>

      {/* Center: Live Telemetry Whisper */}
      <div className="hidden xl:flex items-center gap-5 text-[11px] font-mono tabular-nums-strict text-sumi/55">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              duckdbReady ? 'bg-viridian' : 'bg-amberink animate-pulse'
            }`}
          />
          {traceCount.toLocaleString()} TRACES
        </span>
        <span className="text-sumi/20">/</span>
        <span>RATE CARD: {selectedModelId}</span>
        <span className="text-sumi/20">/</span>
        <span>BLS: {selectedLaborRegion}</span>
      </div>

      {/* Right: Instrument Action Triggers */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onOpenLedger}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10.5px] font-semibold tracking-museum uppercase text-sumi/65 hover:text-sumi hover:bg-sumi/[0.05] transition-colors"
          title="Open CFO Accounting Ledger Sheet"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-sumi/50 group-hover:text-sumi transition-colors" />
          <span className="hidden sm:inline">Ledger</span>
        </button>

        <button
          type="button"
          onClick={onOpenOracle}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10.5px] font-semibold tracking-museum uppercase text-sumi/65 hover:text-cobalt hover:bg-cobalt/[0.07] transition-colors"
          title="Open Actuarial Formula & Provenance Lens"
        >
          <Sparkles className="w-3.5 h-3.5 text-cobalt/75 group-hover:text-cobalt transition-colors" />
          <span className="hidden sm:inline">Oracle</span>
        </button>

        <button
          type="button"
          onClick={onOpenIngest}
          className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10.5px] font-semibold tracking-museum uppercase text-sumi/65 hover:text-sumi hover:bg-sumi/[0.05] transition-colors"
          title="Ingest Custom Traces & Configure Rate Cards"
        >
          <Upload className="w-3.5 h-3.5 text-sumi/50 group-hover:text-sumi transition-colors" />
          <span className="hidden md:inline">Aperture</span>
          <SlidersHorizontal className="w-3 h-3 text-sumi/40 md:hidden" />
        </button>

        <button
          type="button"
          onClick={onOpenSql}
          className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[10.5px] font-semibold tracking-museum uppercase bg-sumi text-alabaster hover:bg-sumi-obsidian transition-all shadow-sm"
          title="Open Sumi-Obsidian DuckDB SQL & Provenance Inspector"
        >
          <Database className="w-3.5 h-3.5 text-viridian-soft" />
          <span>SQL</span>
        </button>
      </div>
    </header>
  );
};
