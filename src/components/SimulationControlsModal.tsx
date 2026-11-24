import React from 'react';
import { RotateCcw, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { DEFAULT_SIMULATION, useFinOpsStore } from '../store/useFinOpsStore';
import { SimulationParameters } from '../types/economics';

interface SimulationControlsModalProps {
  /** 'inline' renders the executive stress-test strip directly in the cockpit; 'modal' renders a full dialog overlay */
  mode?: 'inline' | 'modal';
  open?: boolean;
  onClose?: () => void;
}

interface PresetScenario {
  id: string;
  label: string;
  description: string;
  params: Partial<SimulationParameters>;
}

const EXECUTIVE_PRESETS: PresetScenario[] = [
  {
    id: 'baseline',
    label: 'Actual Telemetry Baseline',
    description: 'Unadjusted observed benchmark traces, 2025-Q1 LLM rate cards & BLS ECEC 1.34× wages.',
    params: {
      reworkErrorMultiplier: 1.0,
      humanWageEscalationPct: 0,
      llmPriceDeflationPct: 0,
      cacheHitOverridePct: null,
    },
  },
  {
    id: 'prompt-cache-opt',
    label: '80% Prompt Cache + Guardrails',
    description: 'Cuts rework loops in half (0.5×) via tool-schema validation & locks 80% prefix caching.',
    params: {
      reworkErrorMultiplier: 0.5,
      humanWageEscalationPct: 0,
      llmPriceDeflationPct: 10,
      cacheHitOverridePct: 80,
    },
  },
  {
    id: 'price-war',
    label: 'LLM Token Deflation (-50%)',
    description: 'Demonstrates why 50% cheaper tokens still fail to fix P&L when human escalation dominates.',
    params: {
      reworkErrorMultiplier: 1.0,
      humanWageEscalationPct: 0,
      llmPriceDeflationPct: 50,
      cacheHitOverridePct: null,
    },
  },
  {
    id: 'stress-drift',
    label: 'Production Drift Stress (1.8×)',
    description: 'Models API schema drift raising rework 1.8× alongside +15% peak human wage inflation.',
    params: {
      reworkErrorMultiplier: 1.8,
      humanWageEscalationPct: 15,
      llmPriceDeflationPct: 0,
      cacheHitOverridePct: 20,
    },
  },
];

export const SimulationControlsModal: React.FC<SimulationControlsModalProps> = ({
  mode = 'inline',
  open = true,
  onClose,
}) => {
  const { simulation, updateSimulation, resetSimulation } = useFinOpsStore();

  const isModified =
    simulation.reworkErrorMultiplier !== DEFAULT_SIMULATION.reworkErrorMultiplier ||
    simulation.humanWageEscalationPct !== DEFAULT_SIMULATION.humanWageEscalationPct ||
    simulation.llmPriceDeflationPct !== DEFAULT_SIMULATION.llmPriceDeflationPct ||
    simulation.cacheHitOverridePct !== DEFAULT_SIMULATION.cacheHitOverridePct;

  const content = (
    <div className="rounded-sm border border-vellum-border bg-vellum-panel/80 p-5 shadow-editorial">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-vellum-border pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-finops-amber" />
            <h2 className="font-serif text-lg font-semibold text-ink-primary">
              Executive Scenario Stress-Test Simulator
            </h2>
            {isModified && (
              <span className="rounded-sm border border-finops-amber/40 bg-finops-amberSoft px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-finops-amber">
                Modified
              </span>
            )}
          </div>
          <p className="mt-0.5 font-sans text-xs text-ink-muted">
            Sensitivity-test unit economics against rework error drift, BLS wage escalation, LLM rate-card deflation, and prompt-cache architecture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetSimulation}
            disabled={!isModified}
            className="inline-flex items-center gap-1.5 rounded-sm border border-vellum-rule bg-vellum-sheet px-2.5 py-1.5 font-mono text-[11px] font-medium text-ink-primary transition-colors hover:border-ink-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Baseline
          </button>
          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-vellum-rule bg-vellum-sheet p-1.5 text-ink-secondary hover:border-ink-primary hover:text-ink-primary"
              aria-label="Close Simulator"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted mr-1">
          <Sparkles className="h-3 w-3 text-finops-indigo" />
          Presets:
        </span>
        {EXECUTIVE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            onClick={() => updateSimulation(preset.params)}
            className="rounded-sm border border-vellum-rule bg-vellum-sheet px-2.5 py-1 font-mono text-[11px] text-ink-secondary transition-colors hover:border-ink-primary hover:text-ink-primary"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* 4 Interactive Sensitivity Sliders */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Slider 1: Rework Error Multiplier */}
        <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-3.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sim-rework-mult"
              className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-secondary"
            >
              Rework Loop Multiplier
            </label>
            <span className="font-mono text-sm font-bold text-finops-amber">
              {simulation.reworkErrorMultiplier.toFixed(2)}×
            </span>
          </div>
          <input
            id="sim-rework-mult"
            type="range"
            min={0.25}
            max={2.5}
            step={0.05}
            value={simulation.reworkErrorMultiplier}
            onChange={(e) =>
              updateSimulation({ reworkErrorMultiplier: parseFloat(e.target.value) })
            }
            className="mt-3 w-full accent-finops-amber cursor-pointer"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-muted">
            <span>0.25× (Tight QA)</span>
            <span>1.0×</span>
            <span>2.5× (Drift)</span>
          </div>
        </div>

        {/* Slider 2: Human Wage Escalation */}
        <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-3.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sim-wage-esc"
              className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-secondary"
            >
              BLS Wage Escalation
            </label>
            <span className="font-mono text-sm font-bold text-ink-primary">
              {simulation.humanWageEscalationPct >= 0 ? '+' : ''}
              {simulation.humanWageEscalationPct}%
            </span>
          </div>
          <input
            id="sim-wage-esc"
            type="range"
            min={-15}
            max={35}
            step={1}
            value={simulation.humanWageEscalationPct}
            onChange={(e) =>
              updateSimulation({ humanWageEscalationPct: parseInt(e.target.value, 10) })
            }
            className="mt-3 w-full accent-ink-primary cursor-pointer"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-muted">
            <span>-15% (Offshore)</span>
            <span>0% BLS</span>
            <span>+35% (HCOL)</span>
          </div>
        </div>

        {/* Slider 3: LLM Token Price Deflation */}
        <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-3.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sim-llm-deflation"
              className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-secondary"
            >
              LLM Price Deflation
            </label>
            <span className="font-mono text-sm font-bold text-finops-indigo">
              -{simulation.llmPriceDeflationPct}%
            </span>
          </div>
          <input
            id="sim-llm-deflation"
            type="range"
            min={0}
            max={75}
            step={5}
            value={simulation.llmPriceDeflationPct}
            onChange={(e) =>
              updateSimulation({ llmPriceDeflationPct: parseInt(e.target.value, 10) })
            }
            className="mt-3 w-full accent-finops-indigo cursor-pointer"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-muted">
            <span>0% (2025-Q1)</span>
            <span>-35%</span>
            <span>-75%</span>
          </div>
        </div>

        {/* Slider 4: Prompt Cache Hit Override */}
        <div className="rounded-sm border border-vellum-border bg-vellum-sheet p-3.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sim-cache-hit"
              className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-secondary"
            >
              Prompt Cache Hit %
            </label>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold text-finops-emerald">
                {simulation.cacheHitOverridePct === null
                  ? 'AUTO'
                  : `${simulation.cacheHitOverridePct}%`}
              </span>
              {simulation.cacheHitOverridePct !== null && (
                <button
                  type="button"
                  onClick={() => updateSimulation({ cacheHitOverridePct: null })}
                  className="rounded-sm border border-vellum-rule px-1 py-0.5 font-mono text-[9px] text-ink-muted hover:text-ink-primary"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
          <input
            id="sim-cache-hit"
            type="range"
            min={0}
            max={90}
            step={5}
            value={simulation.cacheHitOverridePct ?? 50}
            onChange={(e) =>
              updateSimulation({ cacheHitOverridePct: parseInt(e.target.value, 10) })
            }
            className="mt-3 w-full accent-finops-emerald cursor-pointer"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-muted">
            <span>0% (Cold)</span>
            <span>45%</span>
            <span>90% (Pinned)</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === 'modal') {
    if (!open) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/40 p-4 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-label="Executive Scenario Stress Simulator"
      >
        <div className="w-full max-w-5xl">{content}</div>
      </div>
    );
  }

  return content;
};
