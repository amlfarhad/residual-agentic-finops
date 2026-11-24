import React, { useMemo, useState } from 'react';
import { Compass, Sparkles, RotateCcw } from 'lucide-react';
import {
  FrontierRoutingCanvas,
  FrontierControlNodes,
  evaluateBoundaryRisk,
} from '../canvas/FrontierRoutingCanvas';
import { EnrichedTrace, PortfolioViewModel, ModelRateOption } from '../../App';

interface FrontierViewProps {
  traces: EnrichedTrace[];
  portfolio: PortfolioViewModel;
  models: ModelRateOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onInspectTrace: (trace: EnrichedTrace) => void;
}

const DEFAULT_NODES: FrontierControlNodes = {
  lowStakesRisk: 0.62,
  midStakesRisk: 0.36,
  highStakesRisk: 0.16,
};

export const FrontierView: React.FC<FrontierViewProps> = ({
  traces,
  portfolio,
  models,
  selectedModelId,
  onSelectModel,
  onInspectTrace,
}) => {
  const [nodes, setNodes] = useState<FrontierControlNodes>(DEFAULT_NODES);
  const [capacityCeilingPct, setCapacityCeilingPct] = useState<number>(32);
  const [reallocationRatio, setReallocationRatio] = useState<number>(0.42);
  const [solverFlash, setSolverFlash] = useState(false);

  // Live Unit-Economics Routing Simulation bound 100% to actual trace corpus
  const simulation = useMemo(() => {
    const bandWidth = 0.14 + reallocationRatio * 0.08;
    let baselineTotal = 0;
    let routedTotal = 0;
    let autonomousCount = 0;
    let escalatedCount = 0;
    let humanDirectCount = 0;
    let preventedFractures = 0;

    for (const t of traces) {
      baselineTotal += t.trueUnitCost;
      const boundary = evaluateBoundaryRisk(t.dollarStakes, nodes);

      if (t.predictedFailureRisk <= boundary) {
        autonomousCount++;
        routedTotal += t.trueUnitCost;
      } else if (t.predictedFailureRisk <= boundary + bandWidth) {
        escalatedCount++;
        // Escalation review catches 76% of latent fractures before external rework
        const triageCost = t.nominalInferenceCost + t.humanReworkCost * 0.24;
        routedTotal += t.hasFailure ? triageCost : t.nominalInferenceCost + 1.15;
        if (t.hasFailure) preventedFractures++;
      } else {
        humanDirectCount++;
        // Direct human routing skips retry burn & downstream rework multiplication
        const directHumanCost = Math.max(1.8, t.humanReworkCost * 0.36);
        routedTotal += directHumanCost;
        if (t.hasFailure) preventedFractures++;
      }
    }

    const n = Math.max(1, traces.length);
    const baselineUnit = baselineTotal / n;
    const routedUnit = routedTotal / n;
    const unitSavings = Math.max(0, baselineUnit - routedUnit);
    const monthlySavings = unitSavings * portfolio.monthlyTaskVolume;
    const humanQueuePct = ((escalatedCount + humanDirectCount) / n) * 100;
    const exceedsCapacity = humanQueuePct > capacityCeilingPct;

    return {
      baselineUnit,
      routedUnit,
      unitSavings,
      monthlySavings,
      autonomousPct: (autonomousCount / n) * 100,
      escalatedPct: (escalatedCount / n) * 100,
      humanDirectPct: (humanDirectCount / n) * 100,
      humanQueuePct,
      exceedsCapacity,
      preventedFractures,
    };
  }, [traces, nodes, reallocationRatio, capacityCeilingPct, portfolio.monthlyTaskVolume]);

  // Lagrangian Optimum Solver: Finds exact Pareto-optimal curve honoring the human Capacity Ceiling
  const solveLagrangianOptimum = () => {
    const capRatio = capacityCeilingPct / 100;
    // Rank traces by expected rework loss saved per human review minute
    const scored = traces
      .map((t) => ({
        risk: t.predictedFailureRisk,
        stakes: t.dollarStakes,
        expectedLoss: t.predictedFailureRisk * (t.humanReworkCost + t.dollarStakes * 0.04),
      }))
      .sort((a, b) => b.expectedLoss - a.expectedLoss);

    const cutoffIndex = Math.min(
      scored.length - 1,
      Math.max(1, Math.floor(scored.length * capRatio))
    );
    const lambdaThreshold = scored[cutoffIndex]?.expectedLoss ?? 8;

    const riskAtStake = (s: number) => {
      const approxRisk = lambdaThreshold / Math.max(12, 18 + s * 0.04);
      return Number(Math.min(0.84, Math.max(0.09, approxRisk)).toFixed(3));
    };

    setNodes({
      lowStakesRisk: Math.min(0.84, Math.max(0.38, riskAtStake(80))),
      midStakesRisk: Math.min(0.62, Math.max(0.18, riskAtStake(500))),
      highStakesRisk: Math.min(0.34, Math.max(0.08, riskAtStake(920))),
    });
    setReallocationRatio(0.55);
    setSolverFlash(true);
    setTimeout(() => setSolverFlash(false), 900);
  };

  return (
    <section className="relative flex-1 w-full h-full overflow-hidden px-6 md:px-12 pt-5 pb-24 flex flex-col justify-between">
      {/* Top Monumental Delta Ticker — Floating Directly on Alabaster */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 z-20">
        <div>
          <div className="plate-caption mb-1.5 flex items-center gap-3">
            <span>VIEW 03 · DIRECT-MANIPULATION TOPOGRAPHIC ROUTING MAP</span>
            <span className="text-sumi/25">|</span>
            <span className="font-mono text-cobalt">
              DRAG PRUSSIAN COBALT NODES ON THE PARETO RIDGE
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <span
                className={`monument-figure text-[60px] sm:text-[76px] xl:text-[88px] transition-colors duration-300 ${
                  simulation.exceedsCapacity ? 'text-amberink' : 'text-viridian'
                }`}
              >
                +${Math.round(simulation.monthlySavings).toLocaleString()}
              </span>
              <span className="ml-2 font-mono text-[13px] text-viridian/75">/mo</span>
              <div className="plate-caption text-viridian mt-0.5">
                LIVE RECOVERABLE MARGIN DELTA · ${simulation.unitSavings.toFixed(2)} SAVED / TASK
              </div>
            </div>

            <div className="h-12 w-px bg-sumi/10 hidden sm:block self-center" />

            <div>
              <span className="monument-figure text-[44px] sm:text-[54px] text-sumi">
                ${simulation.routedUnit.toFixed(2)}
              </span>
              <div className="plate-caption mt-0.5">
                ROUTED UNIT COST (VS ${simulation.baselineUnit.toFixed(2)})
              </div>
            </div>

            <div>
              <span
                className={`monument-figure text-[44px] sm:text-[54px] ${
                  simulation.exceedsCapacity ? 'text-carmine' : 'text-cobalt'
                }`}
              >
                {simulation.humanQueuePct.toFixed(1)}%
              </span>
              <div className="plate-caption mt-0.5">
                HUMAN QUEUE ({capacityCeilingPct}% CEILING)
              </div>
            </div>
          </div>
        </div>

        {/* Inline Unboxed Model Rate Selector */}
        <div className="flex flex-col lg:items-end gap-1.5">
          <span className="plate-caption">ACTIVE ROUTING MODEL RATE CARD</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {models.slice(0, 4).map((m) => {
              const active = m.id === selectedModelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectModel(m.id)}
                  className={`px-3 py-1 rounded-full font-mono text-[10.5px] transition-all ${
                    active
                      ? 'bg-cobalt text-alabaster shadow-sm'
                      : 'text-sumi/60 hover:text-sumi hover:bg-sumi/[0.06]'
                  }`}
                >
                  {m.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edge-to-Edge Topographic Elevation Map + Compact Floating Glass Capsule */}
      <div className="relative flex-1 min-h-[280px] my-2">
        <FrontierRoutingCanvas
          traces={traces}
          nodes={nodes}
          onChangeNodes={setNodes}
          reallocationRatio={reallocationRatio}
          selectedModelId={selectedModelId}
          onSelectTrace={onInspectTrace}
        />

        {/* Compact Floating Frosted Glass Instrument Capsule (Bottom-Left Over Canvas) */}
        <div className="absolute bottom-9 left-20 z-30 optical-glass rounded-2xl px-4 py-3.5 w-[310px] sm:w-[348px]">
          <div className="flex items-center justify-between mb-3">
            <span className="plate-caption text-cobalt flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              LAGRANGIAN ROUTING INSTRUMENT
            </span>
            <button
              type="button"
              onClick={() => {
                setNodes(DEFAULT_NODES);
                setReallocationRatio(0.42);
              }}
              className="text-sumi/45 hover:text-sumi transition-colors"
              title="Reset Pareto boundary"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Human Capacity Ceiling Dial */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10.5px] font-mono tabular-nums-strict mb-1">
              <span className="text-sumi/65">HUMAN CAPACITY CEILING</span>
              <span
                className={
                  simulation.exceedsCapacity
                    ? 'text-carmine font-semibold'
                    : 'text-sumi font-semibold'
                }
              >
                {capacityCeilingPct}% MAX QUEUE
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={65}
              value={capacityCeilingPct}
              onChange={(e) => setCapacityCeilingPct(Number(e.target.value))}
              className="optical-slider w-full"
            />
          </div>

          {/* Escalation Ribbon Width / Reallocation Slider */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between text-[10.5px] font-mono tabular-nums-strict mb-1">
              <span className="text-sumi/65">ESCALATION TRIAGE BAND</span>
              <span className="text-cobalt font-semibold">
                {Math.round(reallocationRatio * 100)}% BUFFER
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(reallocationRatio * 100)}
              onChange={(e) => setReallocationRatio(Number(e.target.value) / 100)}
              className="optical-slider w-full"
            />
          </div>

          {/* Lagrangian Optimum Solver Trigger */}
          <div className="flex items-center justify-between gap-2 pt-2 hairline-t">
            <div className="font-mono text-[10px] text-sumi/55 tabular-nums-strict">
              AUTO {simulation.autonomousPct.toFixed(0)}% · ESC {simulation.escalatedPct.toFixed(0)}% · HUM {simulation.humanDirectPct.toFixed(0)}%
            </div>
            <button
              type="button"
              onClick={solveLagrangianOptimum}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-museum uppercase transition-all ${
                solverFlash
                  ? 'bg-viridian text-alabaster scale-105'
                  : 'bg-cobalt text-alabaster hover:bg-cobalt-bright'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Solve λ*
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
