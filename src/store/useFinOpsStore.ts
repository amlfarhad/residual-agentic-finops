import { create } from 'zustand';
import { SWE_BENCH_CORPUS } from '../data/benchmarks/sweBenchCorpus';
import { TAU_BENCH_CORPUS } from '../data/benchmarks/tauBenchCorpus';
import { SimulationParameters } from '../types/economics';
import { NormalizedTrace, TaskResolutionStatus } from '../types/telemetry';

export type ActiveCorpusId = 'combined' | 'tau-bench' | 'swe-bench' | 'custom';

export interface CurrencyConfig {
  symbol: string;
  rate: number;
  code: 'USD' | 'EUR' | 'GBP';
}

export const CURRENCY_RATES: Record<SimulationParameters['currency'], CurrencyConfig> = {
  USD: { symbol: '$', rate: 1.0, code: 'USD' },
  EUR: { symbol: '€', rate: 0.92, code: 'EUR' },
  GBP: { symbol: '£', rate: 0.79, code: 'GBP' },
};

export const DEFAULT_SIMULATION: SimulationParameters = {
  reworkErrorMultiplier: 1.0,
  humanWageEscalationPct: 0,
  llmPriceDeflationPct: 0,
  cacheHitOverridePct: null,
  currency: 'USD',
};

interface FinOpsState {
  activeCorpusId: ActiveCorpusId;
  customTraces: NormalizedTrace[];
  searchQuery: string;
  statusFilter: TaskResolutionStatus | 'all';
  modelFilter: string;
  simulation: SimulationParameters;
  inspectedTraceId: string | null;
  ingestionDrawerOpen: boolean;

  setActiveCorpus: (corpusId: ActiveCorpusId) => void;
  ingestCustomTraces: (traces: NormalizedTrace[], mode: 'replace' | 'append') => void;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (status: TaskResolutionStatus | 'all') => void;
  setModelFilter: (modelId: string) => void;
  updateSimulation: (partial: Partial<SimulationParameters>) => void;
  resetSimulation: () => void;
  setInspectedTraceId: (traceId: string | null) => void;
  setIngestionDrawerOpen: (open: boolean) => void;
  getActiveTraces: () => NormalizedTrace[];
}

export const useFinOpsStore = create<FinOpsState>((set, get) => ({
  activeCorpusId: 'combined',
  customTraces: [],
  searchQuery: '',
  statusFilter: 'all',
  modelFilter: 'all',
  simulation: { ...DEFAULT_SIMULATION },
  inspectedTraceId: null,
  ingestionDrawerOpen: false,

  setActiveCorpus: (corpusId) =>
    set({
      activeCorpusId: corpusId,
      modelFilter: 'all',
      statusFilter: 'all',
      inspectedTraceId: null,
    }),

  ingestCustomTraces: (traces, mode) =>
    set((state) => {
      const merged = mode === 'replace' ? traces : [...state.customTraces, ...traces];
      return {
        customTraces: merged,
        activeCorpusId: 'custom',
        ingestionDrawerOpen: false,
        modelFilter: 'all',
        statusFilter: 'all',
      };
    }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setModelFilter: (modelFilter) => set({ modelFilter }),

  updateSimulation: (partial) =>
    set((state) => ({
      simulation: { ...state.simulation, ...partial },
    })),

  resetSimulation: () =>
    set((state) => ({
      simulation: { ...DEFAULT_SIMULATION, currency: state.simulation.currency },
    })),

  setInspectedTraceId: (inspectedTraceId) => set({ inspectedTraceId }),
  setIngestionDrawerOpen: (ingestionDrawerOpen) => set({ ingestionDrawerOpen }),

  getActiveTraces: () => {
    const { activeCorpusId, customTraces } = get();
    if (activeCorpusId === 'tau-bench') return TAU_BENCH_CORPUS;
    if (activeCorpusId === 'swe-bench') return SWE_BENCH_CORPUS;
    if (activeCorpusId === 'custom') return customTraces;
    return [...TAU_BENCH_CORPUS, ...SWE_BENCH_CORPUS, ...customTraces];
  },
}));

export function formatMoney(
  usdAmount: number,
  currency: SimulationParameters['currency'],
  decimals = 2
): string {
  const cfg = CURRENCY_RATES[currency];
  const converted = usdAmount * cfg.rate;
  const sign = converted < 0 ? '-' : '';
  return `${sign}${cfg.symbol}${Math.abs(converted).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
