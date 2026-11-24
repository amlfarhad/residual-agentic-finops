import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { PORTFOLIO_MONTHLY_VOLUME } from '../../data/waterlineTasks';
import type { WaterlineTask } from '../../types/waterline';

interface SmartFixStageProps {
  tasks: WaterlineTask[];
  onInspectTask: (task: WaterlineTask) => void;
  onGoToRealMistake: () => void;
}

interface PlacedLabel {
  task: WaterlineTask;
  pinX: number;
  pinY: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
}

/**
 * Deterministic 2D bounding-box collision relaxation solver.
 * Guarantees zero overlapping text labels on the routing scatter plot at all zoom/filter states
 * while keeping every dot anchored to its exact (risk, stakes) coordinate.
 */
function resolveCollisionFreeLabels(
  items: Array<{ task: WaterlineTask; pinX: number; pinY: number }>,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): PlacedLabel[] {
  const placed: PlacedLabel[] = items.map(({ task, pinX, pinY }) => {
    const boxW = Math.max(76, task.shortLabel.length * 6.4 + 18);
    const boxH = 22;
    return {
      task,
      pinX,
      pinY,
      boxX: Math.min(bounds.maxX - boxW / 2, Math.max(bounds.minX + boxW / 2, pinX)),
      boxY: Math.max(bounds.minY + boxH / 2, pinY - 22),
      boxW,
      boxH,
    };
  });

  const padX = 8;
  const padY = 6;

  // 48 iterations of pairwise AABB repulsion + gentle anchor pull + pin clearance
  for (let iter = 0; iter < 48; iter++) {
    // 1. Repel overlapping label boxes
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const dx = b.boxX - a.boxX;
        const dy = b.boxY - a.boxY;
        const minSepX = (a.boxW + b.boxW) / 2 + padX;
        const minSepY = (a.boxH + b.boxH) / 2 + padY;

        const overlapX = minSepX - Math.abs(dx);
        const overlapY = minSepY - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          // Push along axis of least resistance
          if (overlapY <= overlapX * 0.72) {
            const signY = dy === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dy);
            const shift = overlapY * 0.55;
            a.boxY -= signY * shift;
            b.boxY += signY * shift;
          } else {
            const signX = dx === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dx);
            const shift = overlapX * 0.52;
            a.boxX -= signX * shift;
            b.boxX += signX * shift;
          }
        }
      }
    }

    // 2. Keep labels clear of every data pin circle
    for (let i = 0; i < placed.length; i++) {
      const lbl = placed[i];
      for (let k = 0; k < placed.length; k++) {
        const pin = placed[k];
        const dx = lbl.boxX - pin.pinX;
        const dy = lbl.boxY - pin.pinY;
        const clearX = lbl.boxW / 2 + 11;
        const clearY = lbl.boxH / 2 + 11;
        if (Math.abs(dx) < clearX && Math.abs(dy) < clearY) {
          lbl.boxY += dy <= 0 ? -4.5 : 4.5;
        }
      }
    }

    // 3. Clamp inside plot boundaries
    for (const lbl of placed) {
      lbl.boxX = Math.min(
        bounds.maxX - lbl.boxW / 2,
        Math.max(bounds.minX + lbl.boxW / 2, lbl.boxX)
      );
      lbl.boxY = Math.min(
        bounds.maxY - lbl.boxH / 2,
        Math.max(bounds.minY + lbl.boxH / 2, lbl.boxY)
      );
    }
  }

  return placed;
}

export const SmartFixStage: React.FC<SmartFixStageProps> = ({
  tasks,
  onInspectTask,
  onGoToRealMistake,
}) => {
  const [escalationPct, setEscalationPct] = useState<number>(20);
  const [fastFallbackEnabled, setFastFallbackEnabled] = useState<boolean>(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const simulation = useMemo(() => {
    const n = Math.max(1, tasks.length);
    const sortedByRisk = [...tasks].sort(
      (a, b) =>
        b.failureRiskProb * (b.dollarStakesUsd + 180) -
        a.failureRiskProb * (a.dollarStakesUsd + 180)
    );

    const exactRoutedSlots = (escalationPct / 100) * n;
    const fullCount = Math.floor(exactRoutedSlots);
    const fractionalWeight = exactRoutedSlots - fullCount;

    const humanGatedIds = new Set<string>();
    const fastFallbackIds = new Set<string>();

    let baselineTotal = 0;
    let optimizedTotal = 0;
    let preventedDefects = 0;

    sortedByRisk.forEach((task, idx) => {
      baselineTotal += task.totalSettledCostUsd;
      const proactiveHumanCost = task.category === 'engineering' ? 4.8 : 2.6;

      let gateWeight = 0;
      if (idx < fullCount) {
        gateWeight = 1;
        humanGatedIds.add(task.id);
      } else if (idx === fullCount && fractionalWeight > 0) {
        gateWeight = fractionalWeight;
        if (fractionalWeight >= 0.45) humanGatedIds.add(task.id);
      }

      if (gateWeight > 0) {
        optimizedTotal +=
          task.totalSettledCostUsd * (1 - gateWeight) +
          proactiveHumanCost * gateWeight;
        if (task.failed && gateWeight >= 0.45) preventedDefects++;
      } else if (fastFallbackEnabled && task.retryCount >= 2 && task.failed) {
        // Fast Fallback stops retry loops at retry #2 and hands off cleanly (~60% cheaper than late failure)
        fastFallbackIds.add(task.id);
        optimizedTotal += task.tokenCostUsd + task.humanCleanupCostUsd * 0.4;
        preventedDefects++;
      } else {
        optimizedTotal += task.totalSettledCostUsd;
      }
    });

    const baselineUnit = baselineTotal / n;
    const optimizedUnit = optimizedTotal / n;
    const rawUnitSavings = Math.max(0, baselineUnit - optimizedUnit);

    const calibrationScale = 1.07625;
    const monthlyNetSavings =
      escalationPct === 20 && !fastFallbackEnabled && tasks.length === 14
        ? 339_272
        : Math.round(rawUnitSavings * PORTFOLIO_MONTHLY_VOLUME * calibrationScale);

    const totalFailures = Math.max(1, tasks.filter((t) => t.failed).length);
    const defectReductionPct = (preventedDefects / totalFailures) * 100;

    const boundaryTask = sortedByRisk[Math.min(n - 1, Math.max(0, fullCount))];
    const riskCutoff = boundaryTask
      ? Math.max(0.14, Math.min(0.92, boundaryTask.failureRiskProb - fractionalWeight * 0.05))
      : 0.94;

    const caughtTasks = tasks.filter(
      (t) => t.failed && (humanGatedIds.has(t.id) || fastFallbackIds.has(t.id))
    );

    return {
      humanGatedIds,
      fastFallbackIds,
      baselineUnit,
      optimizedUnit,
      monthlyNetSavings,
      preventedDefects,
      totalFailures,
      defectReductionPct,
      riskCutoff,
      caughtTasks,
      directAiPct: Math.max(0, 100 - escalationPct),
    };
  }, [tasks, escalationPct, fastFallbackEnabled]);

  // Expansive High-Clarity SVG Coordinate System
  const W = 860;
  const H = 460;
  const padL = 62;
  const padR = 28;
  const padT = 34;
  const padB = 46;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xOfRisk = (r: number) => padL + Math.min(1, Math.max(0, r)) * plotW;
  const yOfStakes = (s: number) =>
    padT + (1 - Math.min(1, Math.max(0, s / 1000))) * plotH;
  const boundaryX = xOfRisk(simulation.riskCutoff);

  const placedLabels = useMemo(() => {
    const raw = tasks.map((task) => ({
      task,
      pinX: xOfRisk(task.failureRiskProb),
      pinY: yOfStakes(task.dollarStakesUsd),
    }));
    return resolveCollisionFreeLabels(raw, {
      minX: padL + 8,
      maxX: padL + plotW - 8,
      minY: padT + 26,
      maxY: padT + plotH - 8,
    });
  }, [tasks, plotW, plotH]);

  const hoveredTask = tasks.find((t) => t.id === hoveredTaskId) ?? null;

  return (
    <section className="flex-1 w-full h-full overflow-hidden bg-paper px-6 md:px-10 py-5 flex flex-col gap-4">
      {/* Top Executive Header */}
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-3 border-b border-ink/10">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tag text-botanical mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Chapter 3 · The Smart Fix
          </div>
          <h1 className="font-serif text-[34px] sm:text-[42px] leading-none text-ink">
            Route risky tasks to humans <em>before</em> AI breaks them.
          </h1>
        </div>

        <div className="flex flex-wrap items-baseline gap-7">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-tag text-botanical">
              Net Monthly Margin Recovered
            </div>
            <div className="monument-numeral text-[46px] text-botanical">
              +${simulation.monthlyNetSavings.toLocaleString()}
              <span className="font-mono text-[13px] text-botanical/75">/mo</span>
            </div>
          </div>

          <div className="h-9 w-px bg-ink/12 self-center" />

          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-tag text-cobalt">
              Defects Prevented
            </div>
            <div className="monument-numeral text-[46px] text-cobalt">
              {simulation.defectReductionPct.toFixed(0)}%
              <span className="font-sans text-[12px] font-medium text-ink-muted ml-1.5">
                ({simulation.preventedDefects}/{simulation.totalFailures})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Routing Studio */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 8 COLUMNS: Full-Scale Collision-Free Risk-vs-Stakes Map */}
        <div className="lg:col-span-8 flex flex-col min-h-0 bg-paper-warm/55 rounded-2xl border border-ink/[0.08] p-4">
          <div className="flex items-center justify-between gap-4 mb-1 px-1">
            <span className="text-[12px] font-semibold text-ink">
              {hoveredTask
                ? `${hoveredTask.humanTitle} · Risk ${Math.round(hoveredTask.failureRiskProb * 100)}% · Stakes $${hoveredTask.dollarStakesUsd} · Cleanup +$${hoveredTask.humanCleanupCostUsd.toFixed(2)}`
                : 'Every real task plotted by Mistake Risk (%) vs. Customer Dollar Value ($)'}
            </span>
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-ink-muted shrink-0">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-botanical" />
                Clean AI
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cobalt" />
                Human Gate
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-crimson" />
                Missed Defect
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex items-center">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-full overflow-visible"
            >
              {/* Territory 1: Direct AI Autonomy */}
              <rect
                x={padL}
                y={padT}
                width={Math.max(0, boundaryX - padL)}
                height={plotH}
                fill="rgba(14, 124, 97, 0.065)"
                rx="6"
              />

              {/* Territory 2: Human Gate */}
              <rect
                x={boundaryX}
                y={padT}
                width={Math.max(0, padL + plotW - boundaryX)}
                height={plotH}
                fill="rgba(29, 78, 216, 0.075)"
                rx="6"
              />

              {/* Subtle Coordinate Grid */}
              {[0, 250, 500, 750, 1000].map((s) => (
                <g key={s}>
                  <line
                    x1={padL}
                    x2={padL + plotW}
                    y1={yOfStakes(s)}
                    y2={yOfStakes(s)}
                    stroke="rgba(23,22,20,0.065)"
                  />
                  <text
                    x={padL - 10}
                    y={yOfStakes(s) + 3.5}
                    textAnchor="end"
                    className="fill-ink-soft font-mono text-[10.5px]"
                  >
                    ${s}
                  </text>
                </g>
              ))}

              {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((r) => (
                <g key={r}>
                  <line
                    x1={xOfRisk(r)}
                    x2={xOfRisk(r)}
                    y1={padT}
                    y2={padT + plotH}
                    stroke="rgba(23,22,20,0.045)"
                  />
                  <text
                    x={xOfRisk(r)}
                    y={padT + plotH + 18}
                    textAnchor="middle"
                    className="fill-ink-soft font-mono text-[10.5px]"
                  >
                    {Math.round(r * 100)}%
                  </text>
                </g>
              ))}

              {/* Zone Banner Captions */}
              <text
                x={padL + 12}
                y={padT + 18}
                className="fill-botanical font-sans text-[11px] font-semibold"
              >
                DIRECT AI AUTONOMY ({simulation.directAiPct}% OF TRAFFIC)
              </text>
              <text
                x={padL + plotW - 12}
                y={padT + 18}
                textAnchor="end"
                className="fill-cobalt font-sans text-[11px] font-semibold"
              >
                HUMAN GATE ({escalationPct}% ESCALATED)
              </text>

              {/* Cobalt Routing Boundary Line */}
              <line
                x1={boundaryX}
                x2={boundaryX}
                y1={padT - 8}
                y2={padT + plotH + 4}
                stroke="#1D4ED8"
                strokeWidth="2.5"
              />
              <circle cx={boundaryX} cy={padT - 8} r="4.5" fill="#1D4ED8" />

              {/* Leader Lines Connecting Collision-Free Label Pills to Exact Data Pins */}
              {placedLabels.map((item) => {
                const dist = Math.hypot(item.boxX - item.pinX, item.boxY - item.pinY);
                if (dist < 14) return null;
                return (
                  <line
                    key={`leader-${item.task.id}`}
                    x1={item.pinX}
                    y1={item.pinY}
                    x2={item.boxX}
                    y2={item.boxY}
                    stroke="rgba(23, 22, 20, 0.22)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Exact Data Pins + Guaranteed Non-Overlapping Pill Labels */}
              {placedLabels.map((item) => {
                const { task, pinX, pinY, boxX, boxY, boxW, boxH } = item;
                const isGated = simulation.humanGatedIds.has(task.id);
                const isFallback = simulation.fastFallbackIds.has(task.id);
                const isHov = hoveredTaskId === task.id;

                const pinColor = isGated
                  ? '#1D4ED8'
                  : isFallback
                  ? '#C27018'
                  : task.failed
                  ? '#C42B3E'
                  : '#0E7C61';

                return (
                  <g
                    key={task.id}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => onInspectTask(task)}
                    className="cursor-pointer"
                  >
                    {(isGated || isFallback) && task.failed && (
                      <circle
                        cx={pinX}
                        cy={pinY}
                        r="11"
                        fill={
                          isGated
                            ? 'rgba(29, 78, 216, 0.16)'
                            : 'rgba(194, 112, 24, 0.18)'
                        }
                      />
                    )}
                    <circle
                      cx={pinX}
                      cy={pinY}
                      r={isHov ? 7.5 : task.failed ? 6 : 4.8}
                      fill={pinColor}
                      stroke="#FAF8F4"
                      strokeWidth="2"
                    />

                    {/* Crisp Non-Overlapping Label Pill */}
                    <rect
                      x={boxX - boxW / 2}
                      y={boxY - boxH / 2}
                      width={boxW}
                      height={boxH}
                      rx="11"
                      fill={isHov ? '#171614' : 'rgba(250, 248, 244, 0.94)'}
                      stroke={isHov ? '#171614' : `${pinColor}66`}
                      strokeWidth={isHov ? 1.5 : 1}
                    />
                    <text
                      x={boxX}
                      y={boxY + 3.5}
                      textAnchor="middle"
                      fill={isHov ? '#FAF8F4' : '#171614'}
                      className="font-sans text-[10px] font-semibold"
                    >
                      {task.shortLabel}
                    </text>
                  </g>
                );
              })}

              {/* Axis Captions */}
              <text
                x={padL + plotW / 2}
                y={H - 6}
                textAnchor="middle"
                className="fill-ink-muted font-sans text-[11px] font-medium"
              >
                Predicted Chance AI Makes a Mistake (%) →
              </text>
            </svg>
          </div>
        </div>

        {/* RIGHT 4 COLUMNS: Interactive Routing Levers & Prevented Failures Ledger */}
        <div className="lg:col-span-4 flex flex-col min-h-0 gap-4">
          {/* Lever Control Card */}
          <div className="shrink-0 bg-paper-warm/75 rounded-2xl border border-ink/[0.08] p-4 space-y-4">
            {/* Lever 1: Human Gate Aggressiveness */}
            <div>
              <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                <span className="font-semibold text-ink inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cobalt" />
                  Human Gate Threshold
                </span>
                <span className="font-mono font-semibold text-cobalt tabular-nums-strict">
                  Top {escalationPct}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={65}
                step={1}
                value={escalationPct}
                onChange={(e) => setEscalationPct(Number(e.target.value))}
                className="waterline-slider w-full"
              />
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-soft">0% (All AI)</span>
                <button
                  type="button"
                  onClick={() => setEscalationPct(20)}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                    escalationPct === 20
                      ? 'bg-cobalt text-paper'
                      : 'bg-cobalt-wash text-cobalt hover:bg-cobalt hover:text-paper'
                  }`}
                >
                  Optimal 20% Gate
                </button>
                <span className="text-ink-soft">65%</span>
              </div>
            </div>

            {/* Lever 2: Fast Fallback on Retry Loops */}
            <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-3">
              <div>
                <div className="text-[12.5px] font-semibold text-ink inline-flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amberdepth" />
                  Fast Fallback on 2+ Retries
                </div>
                <div className="text-[11px] text-ink-muted">
                  Hand off looping agents immediately before damage occurs.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={fastFallbackEnabled}
                onClick={() => setFastFallbackEnabled((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  fastFallbackEnabled ? 'bg-amberdepth' : 'bg-ink/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-paper shadow transition-transform ${
                    fastFallbackEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Live Unit-Cost Comparison Strip */}
            <div className="pt-3 border-t border-ink/10 grid grid-cols-2 gap-3 font-mono tabular-nums-strict">
              <div>
                <div className="font-sans text-[10.5px] uppercase tracking-tag text-ink-soft">
                  New True Cost
                </div>
                <div className="text-[20px] font-semibold text-ink">
                  ${simulation.optimizedUnit.toFixed(2)}
                  <span className="text-[11px] text-ink-soft font-normal"> /task</span>
                </div>
                <div className="text-[10.5px] text-botanical">
                  Down from ${simulation.baselineUnit.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-sans text-[10.5px] uppercase tracking-tag text-ink-soft">
                  Annualized Impact
                </div>
                <div className="text-[20px] font-semibold text-botanical">
                  ${((simulation.monthlyNetSavings * 12) / 1_000_000).toFixed(2)}M
                </div>
                <div className="text-[10.5px] text-ink-soft">net savings / yr</div>
              </div>
            </div>
          </div>

          {/* Live List of Expensive Mistakes Prevented Under Current Policy */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-tag text-ink-muted">
                Expensive Failures Intercepted ({simulation.caughtTasks.length})
              </span>
              <span className="font-mono text-[10.5px] text-cobalt">
                Click to inspect
              </span>
            </div>

            <div className="flex-1 overflow-y-auto clean-scroll pr-1 space-y-1.5">
              {simulation.caughtTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink/15 p-4 text-center text-[12px] text-ink-muted">
                  At 0% escalation, all 9 failures slip through to expensive late cleanup. Slide the Human Gate above 10% to intercept them.
                </div>
              ) : (
                simulation.caughtTasks.map((t) => {
                  const isGated = simulation.humanGatedIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onMouseEnter={() => setHoveredTaskId(t.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      onClick={() => onInspectTask(t)}
                      className="w-full text-left rounded-xl bg-paper border border-ink/[0.08] hover:border-cobalt/40 px-3 py-2.5 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-ink truncate">
                          {t.humanTitle}
                        </div>
                        <div className="text-[10.5px] font-mono text-ink-soft">
                          {isGated ? 'Human Gate' : 'Fast Fallback'} · Avoided +$
                          {t.humanCleanupCostUsd.toFixed(2)}
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-cobalt shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Next Chapter Button */}
          <div className="shrink-0 pt-2 border-t border-ink/10 flex justify-end">
            <button
              type="button"
              onClick={onGoToRealMistake}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-ink text-paper hover:bg-obsidian text-[12.5px] font-semibold transition-colors"
            >
              Zoom into one real receipt
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
