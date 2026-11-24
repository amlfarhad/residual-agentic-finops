import React from 'react';
import { ArrowRight, ArrowUpRight, Layers, AlertTriangle } from 'lucide-react';
import { FractureFlowCanvas } from '../canvas/FractureFlowCanvas';
import { OpticalCurtainOverlay } from '../shell/OpticalCurtainOverlay';
import type {
  SettlementHorizonSnapshot,
  SettlementTimelineIndex,
} from '../../engine/settlementTimeline';
import type { EnrichedTrace } from '../../App';

interface FractureViewProps {
  traces: EnrichedTrace[];
  timeline: SettlementTimelineIndex;
  snapshot: SettlementHorizonSnapshot;
  cutoffHours: number;
  onChangeCutoffHours: (nextHours: number) => void;
  isReplaying: boolean;
  onToggleReplay: () => void;
  onOpenLedger: () => void;
  onJumpToFrontier: () => void;
  onJumpToAutopsy: (filter: 'clean' | 'fracture') => void;
}

export const FractureView: React.FC<FractureViewProps> = ({
  traces,
  timeline,
  snapshot,
  cutoffHours,
  onChangeCutoffHours,
  isReplaying,
  onToggleReplay,
  onOpenLedger,
  onJumpToFrontier,
  onJumpToAutopsy,
}) => {
  const isAtZero = cutoffHours < 0.5;
  const isSettled = cutoffHours >= 335.5;
  const roundedHours = Math.round(cutoffHours);

  // Format dynamic dollar figures cleanly at 2 decimal places (matches $0.06 -> $0.08 -> $0.10 or $0.19 -> $6.84)
  const fmtUnit = (val: number) => `$${val.toFixed(2)}`;

  // Smooth chromatic progression of multiplier from serene silver (1.0x at T=0h) to full Carmine at T=336h
  const bleedToneClass = isAtZero
    ? 'text-sumi/45'
    : snapshot.realizedSharePct < 45
    ? 'text-amberink'
    : 'text-carmine';

  const bleedRuleClass = isAtZero
    ? 'bg-sumi/25'
    : snapshot.realizedSharePct < 45
    ? 'bg-amberink/50'
    : 'bg-carmine/50';

  return (
    <section className="relative flex-1 w-full h-full overflow-hidden">
      {/* 60fps HTML5 Kinetic Particle Clearing Stream reading cutoffHours directly via ref */}
      <FractureFlowCanvas
        cutoffHours={cutoffHours}
        traces={traces}
        timeline={timeline}
        onSelectStream={(stream) => onJumpToAutopsy(stream)}
      />

      {/* Signature Draggable Actuarial Settlement Horizon Prism */}
      <OpticalCurtainOverlay
        cutoffHours={cutoffHours}
        onChangeCutoffHours={onChangeCutoffHours}
        snapshot={snapshot}
        isReplaying={isReplaying}
        onToggleReplay={onToggleReplay}
      />

      {/* Monumental Floating Typography — Zero Boxed Cards */}
      <div className="pointer-events-none relative z-30 w-full h-full px-6 md:px-12 pt-5 md:pt-8 flex flex-col justify-between">
        {/* Top Floating Live Actuarial Equation */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          {/* Left: Dynamic Unit-Economics Equation Bound to T_cutoff */}
          <div>
            <div className="plate-caption mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>VIEW 01 · LIVE ACTUARIAL SETTLEMENT HORIZON</span>
              <span className="text-sumi/25">|</span>
              <span className="font-mono text-sumi/70 tabular-nums-strict">
                T = +{roundedHours}h · SURFACED {snapshot.surfacedCount}/{snapshot.fracturedTraceCount} FRACTURES
              </span>
              <span className="text-sumi/25">|</span>
              <span className="font-mono text-amberink tabular-nums-strict">
                IBNR {snapshot.ibnrSharePct.toFixed(0)}% ({fmtUnit(snapshot.ibnrReserveUnitCost)})
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 md:gap-x-6 gap-y-2">
              {/* Constant Nominal Engineering Cost */}
              <div className="flex flex-col">
                <span className="monument-figure text-[58px] sm:text-[78px] xl:text-[98px] text-sumi/65">
                  {fmtUnit(snapshot.nominalUnitCost)}
                </span>
                <span className="plate-caption mt-1">
                  NOMINAL API / TRACE (T=0h)
                </span>
              </div>

              {/* Dynamic Hidden Bleed Multiplier Vector */}
              <div className="flex flex-col items-center self-center px-1">
                <div className={`flex items-center gap-2 transition-colors duration-200 ${bleedToneClass}`}>
                  <span className={`h-px w-6 md:w-10 transition-colors ${bleedRuleClass}`} />
                  <span className="font-mono text-[13px] md:text-[15px] font-semibold tabular-nums-strict">
                    {snapshot.realizedMultiplier.toFixed(1)}×{' '}
                    {isAtZero ? 'ENG ILLUSION' : isSettled ? 'FULL BLEED' : 'REALIZED'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span className="font-mono text-[10px] text-sumi/50 mt-1 tabular-nums-strict">
                  +{fmtUnit(snapshot.realizedHiddenUnitCost)} SURFACED · +{fmtUnit(snapshot.ibnrReserveUnitCost)} IBNR
                </span>
              </div>

              {/* Dynamic Realized Settlement Cost C_realized(T) */}
              <div className="flex flex-col">
                <span
                  className={`monument-figure text-[64px] sm:text-[84px] xl:text-[108px] transition-colors duration-200 ${
                    isAtZero ? 'text-sumi/80' : 'text-carmine'
                  }`}
                >
                  {fmtUnit(snapshot.realizedUnitCost)}
                </span>
                <span
                  className={`plate-caption mt-1 ${
                    isAtZero ? 'text-sumi/55' : 'text-carmine/85'
                  }`}
                >
                  {isSettled
                    ? 'FULL 14D CFO SETTLEMENT / TRACE'
                    : `REALIZED COST AT T+${roundedHours}h`}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Counterfactual Myopic Window Trap + Recoverable Margin */}
          <div className="pointer-events-auto lg:text-right flex flex-col lg:items-end pt-0.5 max-w-[440px]">
            <span className="plate-caption text-viridian">
              {isSettled
                ? 'FULL 14D RECOVERABLE ROUTING MARGIN'
                : `RECOVERABLE MARGIN VISIBLE AT T+${roundedHours}h`}
            </span>
            <button
              type="button"
              onClick={onJumpToFrontier}
              className="group inline-flex items-baseline gap-2 mt-0.5 text-left lg:text-right focus:outline-none"
              title="Open View 03: Topographic Routing Frontier"
            >
              <span className="monument-figure text-[46px] sm:text-[58px] xl:text-[68px] text-viridian group-hover:text-viridian-soft transition-colors">
                +${Math.round(snapshot.recoverableMonthlyAtT).toLocaleString()}
              </span>
              <span className="font-mono text-[12px] text-viridian/75">/mo</span>
              <ArrowUpRight className="w-4 h-4 text-viridian/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            {/* Counterfactual Myopic Window Trap Callout (Unboxed Hairline Editorial Accent) */}
            <div className="mt-2 pt-2 hairline-t w-full lg:text-right">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.11em] text-amberink">
                <AlertTriangle className="w-3 h-3" />
                MYOPIC WINDOW TRAP · 24h VS 14D SETTLEMENT
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-sumi/65">
                {cutoffHours <= 48 ? (
                  <>
                    Closing eval at <span className="font-mono font-semibold text-sumi">T+{Math.max(24, roundedHours)}h</span> hides{' '}
                    <span className="font-mono font-semibold text-carmine">
                      {snapshot.myopic24hMissedPct.toFixed(0)}%
                    </span>{' '}
                    of rework, misrouting{' '}
                    <span className="font-mono font-semibold text-amberink tabular-nums-strict">
                      +${Math.round(snapshot.myopic24hTrapMonthly).toLocaleString()}/mo
                    </span>{' '}
                    into autonomous bleed.
                  </>
                ) : (
                  <>
                    A 24h myopic window would have missed{' '}
                    <span className="font-mono font-semibold text-amberink tabular-nums-strict">
                      +${Math.round(snapshot.myopic24hTrapMonthly).toLocaleString()}/mo
                    </span>{' '}
                    vs 14-day settlement. Remaining blindspot past T+{roundedHours}h:{' '}
                    <span className="font-mono font-semibold text-sumi tabular-nums-strict">
                      ${Math.round(snapshot.myopicPolicyBlindspotMonthly).toLocaleString()}/mo
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            {/* Direct Unboxed Action Hairlines */}
            <div className="mt-3 flex items-center gap-5">
              <button
                type="button"
                onClick={onOpenLedger}
                className="inline-flex items-center gap-1.5 pb-0.5 border-b border-sumi/30 hover:border-sumi text-[10.5px] font-semibold tracking-museum uppercase text-sumi/75 hover:text-sumi transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                Settlement Ledger
              </button>
              <button
                type="button"
                onClick={() => onJumpToAutopsy('fracture')}
                className="inline-flex items-center gap-1 pb-0.5 border-b border-carmine/40 hover:border-carmine text-[10.5px] font-semibold tracking-museum uppercase text-carmine/85 hover:text-carmine transition-colors"
              >
                Autopsy Trace
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Open-Air Marginalia Decomposition Strip (Strictly Synchronized to T_cutoff) */}
        <div className="pointer-events-auto pb-20 md:pb-[74px] flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
            <div>
              <div className="plate-caption">APPARENT CLEAN (AT T+{roundedHours}h)</div>
              <div className="font-mono text-[15px] font-medium text-viridian tabular-nums-strict mt-0.5">
                {(snapshot.cleanResolutionRateAtT * 100).toFixed(1)}%
              </div>
            </div>

            <div className="h-6 w-px bg-sumi/10 hidden sm:block" />

            <div>
              <div className="plate-caption">SURFACED FRACTURES</div>
              <div className="font-mono text-[15px] font-medium text-carmine tabular-nums-strict mt-0.5">
                {snapshot.surfacedCount} / {snapshot.fracturedTraceCount}
              </div>
            </div>

            <div className="h-6 w-px bg-sumi/10 hidden sm:block" />

            <div>
              <div className="plate-caption">REALIZED RETRY + REWORK</div>
              <div className="font-mono text-[15px] font-medium text-carmine tabular-nums-strict mt-0.5">
                {fmtUnit(snapshot.realizedHiddenUnitCost)}
              </div>
            </div>

            <div className="h-6 w-px bg-sumi/10 hidden sm:block" />

            <div>
              <div className="plate-caption">SUBMERGED IBNR RESERVE</div>
              <div className="font-mono text-[15px] font-medium text-amberink tabular-nums-strict mt-0.5">
                {fmtUnit(snapshot.ibnrReserveUnitCost)}{' '}
                <span className="text-[11px] text-amberink/70">
                  ({snapshot.ibnrSharePct.toFixed(0)}%)
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-sumi/10 hidden lg:block" />

            <div className="hidden lg:block">
              <div className="plate-caption">CONSERVATION INVARIANT (C + IBNR)</div>
              <div className="font-mono text-[15px] font-medium text-sumi/80 tabular-nums-strict mt-0.5">
                {fmtUnit(snapshot.realizedUnitCost + snapshot.ibnrReserveUnitCost)}{' '}
                <span className="text-[10.5px] text-sumi/45">≡ 14D ULTIMATE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
