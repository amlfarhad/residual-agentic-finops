import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Eye,
  Flame,
  Hourglass,
  ArrowUpRight,
} from 'lucide-react';
import { MAX_HORIZON_HOURS, PORTFOLIO_MONTHLY_VOLUME } from '../../data/waterlineTasks';
import type { WaterlineTask, WaterlineMetricsAtCutoff } from '../../types/waterline';

interface TimeDelayStageProps {
  tasks: WaterlineTask[];
  metrics: WaterlineMetricsAtCutoff;
  cutoffHours: number;
  onChangeCutoffHours: (hours: number) => void;
  onInspectTask: (task: WaterlineTask) => void;
  onGoToSmartFix: () => void;
}

interface SurvivalStep {
  hour: number;
  stillCleanPct: number;
  ciLowPct: number;
  ciHighPct: number;
  cumulativeMonthlyBleed: number;
  eventTask?: WaterlineTask;
}

export const TimeDelayStage: React.FC<TimeDelayStageProps> = ({
  tasks,
  metrics,
  cutoffHours,
  onChangeCutoffHours,
  onInspectTask,
  onGoToSmartFix,
}) => {
  const [showGreenwoodBands, setShowGreenwoodBands] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Full Kaplan-Meier survival curve + cumulative monthly dollar bleed synchronized hour-by-hour
  const { curve, maxMonthlyBleed } = useMemo(() => {
    const n = Math.max(1, tasks.length);
    const failed = tasks
      .filter((t) => t.failed && Number.isFinite(t.discoveryHours))
      .sort((a, b) => a.discoveryHours - b.discoveryHours);

    const pts: SurvivalStep[] = [
      {
        hour: 0,
        stillCleanPct: 100,
        ciLowPct: 100,
        ciHighPct: 100,
        cumulativeMonthlyBleed: 0,
      },
    ];

    let survival = 1.0;
    let greenwood = 0.0;
    let atRisk = n;
    let cumulativeCleanup = 0;

    for (const task of failed) {
      survival *= 1 - 1 / atRisk;
      if (atRisk > 1) {
        greenwood += 1 / (atRisk * (atRisk - 1));
      }
      cumulativeCleanup += task.humanCleanupCostUsd;
      const monthlyBleed = (cumulativeCleanup / n) * PORTFOLIO_MONTHLY_VOLUME;
      const se = survival * Math.sqrt(Math.max(0, greenwood));

      pts.push({
        hour: task.discoveryHours,
        stillCleanPct: survival * 100,
        ciLowPct: Math.max(0, (survival - 1.96 * se) * 100),
        ciHighPct: Math.min(100, (survival + 1.96 * se) * 100),
        cumulativeMonthlyBleed: monthlyBleed,
        eventTask: task,
      });
      atRisk -= 1;
    }

    const last = pts[pts.length - 1];
    if (last.hour < MAX_HORIZON_HOURS) {
      pts.push({ ...last, hour: MAX_HORIZON_HOURS, eventTask: undefined });
    }

    return {
      curve: pts,
      maxMonthlyBleed: Math.max(1, last.cumulativeMonthlyBleed),
    };
  }, [tasks]);

  // Day 1 vs Day 14 Cohort Breakdown & Fast vs Slow Categorization
  const cohortAnalysis = useMemo(() => {
    const n = Math.max(1, tasks.length);
    const failedTasks = tasks
      .filter((t) => t.failed)
      .sort((a, b) => a.discoveryHours - b.discoveryHours);

    const caught24h = failedTasks.filter((t) => t.discoveryHours <= 24);
    const slippedPast24h = failedTasks.filter((t) => t.discoveryHours > 24);

    const totalCleanupDollars = failedTasks.reduce(
      (s, t) => s + t.humanCleanupCostUsd,
      0
    );
    const earlyDollars = caught24h.reduce((s, t) => s + t.humanCleanupCostUsd, 0);
    const lateDollars = slippedPast24h.reduce(
      (s, t) => s + t.humanCleanupCostUsd,
      0
    );

    // Split failed tasks into Fast Catastrophic (<48h) vs Slow Latent Bleed (>=48h)
    const fastCatastrophic = failedTasks.filter((t) => t.discoveryHours < 48);
    const slowLatent = failedTasks.filter((t) => t.discoveryHours >= 48);

    const unobservedAtCutoffMonthly =
      metrics.avgHiddenIbnrUsd * PORTFOLIO_MONTHLY_VOLUME;
    const slippedPast24hMonthly =
      (lateDollars / n) * PORTFOLIO_MONTHLY_VOLUME;

    return {
      day1CleanPct: ((n - caught24h.length) / n) * 100,
      day14DefectPct: (failedTasks.length / n) * 100,
      caught24hCount: caught24h.length,
      slippedPast24hCount: slippedPast24h.length,
      earlyDollarSharePct:
        totalCleanupDollars > 0 ? (earlyDollars / totalCleanupDollars) * 100 : 0,
      lateDollarSharePct:
        totalCleanupDollars > 0 ? (lateDollars / totalCleanupDollars) * 100 : 0,
      fastCatastrophic,
      slowLatent,
      unobservedAtCutoffMonthly,
      slippedPast24hMonthly,
    };
  }, [tasks, metrics.avgHiddenIbnrUsd]);

  // Dual-Panel Full-Width SVG Geometry
  const W = 780;
  const H = 390;
  const padL = 52;
  const padR = 24;
  const topPlotT = 24;
  const topPlotH = 205;
  const botPlotT = 264;
  const botPlotH = 92;
  const plotW = W - padL - padR;

  const xOf = (hr: number) =>
    padL + (Math.min(MAX_HORIZON_HOURS, Math.max(0, hr)) / MAX_HORIZON_HOURS) * plotW;
  const yTop = (pct: number) => topPlotT + (1 - pct / 100) * topPlotH;
  const yBot = (bleed: number) =>
    botPlotT + (1 - Math.min(1, bleed / maxMonthlyBleed)) * botPlotH;

  const stepLinePath = useMemo(() => {
    let d = `M ${xOf(curve[0].hour).toFixed(1)} ${yTop(curve[0].stillCleanPct).toFixed(1)}`;
    for (let i = 1; i < curve.length; i++) {
      d += ` H ${xOf(curve[i].hour).toFixed(1)} V ${yTop(curve[i].stillCleanPct).toFixed(1)}`;
    }
    return d;
  }, [curve]);

  const ciBandPath = useMemo(() => {
    const hi: string[] = [];
    const lo: string[] = [];
    for (let i = 0; i < curve.length; i++) {
      const x = xOf(curve[i].hour);
      if (i > 0) {
        hi.push(`L ${x.toFixed(1)} ${yTop(curve[i - 1].ciHighPct).toFixed(1)}`);
        lo.unshift(`L ${x.toFixed(1)} ${yTop(curve[i - 1].ciLowPct).toFixed(1)}`);
      }
      hi.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yTop(curve[i].ciHighPct).toFixed(1)}`);
      lo.unshift(`L ${x.toFixed(1)} ${yTop(curve[i].ciLowPct).toFixed(1)}`);
    }
    return `${hi.join(' ')} ${lo.join(' ')} Z`;
  }, [curve]);

  const blindSpotShadePath = useMemo(() => {
    const x24 = xOf(24);
    let d = `M ${x24.toFixed(1)} ${yTop(cohortAnalysis.day1CleanPct).toFixed(1)}`;
    for (const pt of curve) {
      if (pt.hour > 24) {
        d += ` H ${xOf(pt.hour).toFixed(1)} V ${yTop(pt.stillCleanPct).toFixed(1)}`;
      }
    }
    d += ` V ${yTop(0).toFixed(1)} H ${x24.toFixed(1)} Z`;
    return d;
  }, [curve, cohortAnalysis.day1CleanPct]);

  const cumulativeBleedArea = useMemo(() => {
    let d = `M ${xOf(0).toFixed(1)} ${yBot(0).toFixed(1)}`;
    for (let i = 0; i < curve.length; i++) {
      const x = xOf(curve[i].hour);
      if (i > 0) {
        d += ` H ${x.toFixed(1)}`;
      }
      d += ` V ${yBot(curve[i].cumulativeMonthlyBleed).toFixed(1)}`;
    }
    d += ` V ${yBot(0).toFixed(1)} Z`;
    return d;
  }, [curve, maxMonthlyBleed]);

  const hoveredTask = tasks.find((t) => t.id === hoveredTaskId) ?? null;
  const currentDay = Math.round(cutoffHours / 24);

  return (
    <section className="flex-1 w-full h-full overflow-hidden bg-paper px-6 md:px-10 py-5 flex flex-col gap-4">
      {/* Top Authoritative Command Header */}
      <div className="shrink-0 flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-3 border-b border-ink/10">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tag text-amberdepth mb-1">
            <Clock className="w-3.5 h-3.5" />
            Chapter 2 · The 24-Hour Blind Spot
          </div>
          <h1 className="font-serif text-[34px] sm:text-[42px] leading-none text-ink">
            Why Day 1 looks 93% fine—while 14 days reveal a 64% defect rate.
          </h1>
        </div>

        {/* High-Contrast Live Metric Strip */}
        <div className="flex flex-wrap items-baseline gap-6">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-tag text-botanical">
              Day 1 Illusion
            </div>
            <div className="monument-numeral text-[42px] text-botanical">
              {cohortAnalysis.day1CleanPct.toFixed(0)}%{' '}
              <span className="font-sans text-[12px] font-medium text-ink-muted">
                look clean
              </span>
            </div>
          </div>

          <div className="h-9 w-px bg-ink/12 self-center" />

          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-tag text-crimson">
              Day 14 Reality
            </div>
            <div className="monument-numeral text-[42px] text-crimson">
              {cohortAnalysis.day14DefectPct.toFixed(0)}%{' '}
              <span className="font-sans text-[12px] font-medium text-ink-muted">
                needed fixes
              </span>
            </div>
          </div>

          <div className="h-9 w-px bg-ink/12 self-center hidden sm:block" />

          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-tag text-amberdepth">
              Slipped Past 24h Window
            </div>
            <div className="monument-numeral text-[42px] text-amberdepth">
              ${Math.round(cohortAnalysis.slippedPast24hMonthly / 1000)}k
              <span className="font-mono text-[13px] text-amberdepth/75">/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Command Canvas */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 7 COLUMNS: Dual-Layer Survival + Cumulative Bleed Visualizer */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-paper-warm/55 rounded-2xl border border-ink/[0.08] p-5 justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <div className="text-[12.5px] font-semibold text-ink">
                14-Day Survival Curve &amp; Cumulative Hidden Cost Bleed
              </div>
              <div className="text-[11.5px] text-ink-muted">
                {hoveredTask
                  ? `${hoveredTask.shortLabel} (Day ${Math.max(1, Math.round(hoveredTask.discoveryHours / 24))}): ${hoveredTask.humanVignette}`
                  : 'Hover or click any crimson failure node to inspect its receipt.'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGreenwoodBands((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
                showGreenwoodBands
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink-muted border border-ink/12 hover:text-ink'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showGreenwoodBands ? '95% Greenwood CI On' : 'Show 95% CI'}
            </button>
          </div>

          {/* Full-Height Dual SVG Visualization */}
          <div className="flex-1 min-h-0 flex items-center">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-full max-h-[420px] overflow-visible"
            >
              <defs>
                <linearGradient id="tdBlindSpot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C27018" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#C27018" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="tdBleedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C42B3E" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#C42B3E" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Top Panel Grid: Tasks Still Clean (%) */}
              {[100, 75, 50, 25, 0].map((pct) => (
                <g key={pct}>
                  <line
                    x1={padL}
                    x2={W - padR}
                    y1={yTop(pct)}
                    y2={yTop(pct)}
                    stroke="rgba(23,22,20,0.08)"
                    strokeDasharray={pct === 0 ? undefined : '2 6'}
                  />
                  <text
                    x={padL - 10}
                    y={yTop(pct) + 3.5}
                    textAnchor="end"
                    className="fill-ink-soft font-mono text-[10px]"
                  >
                    {pct}%
                  </text>
                </g>
              ))}

              {/* Vertical Day Lines spanning both panels */}
              {[0, 1, 3, 5, 7, 10, 14].map((day) => {
                const x = xOf(day * 24);
                return (
                  <g key={day}>
                    <line
                      x1={x}
                      x2={x}
                      y1={topPlotT}
                      y2={botPlotT + botPlotH}
                      stroke="rgba(23,22,20,0.055)"
                    />
                    <text
                      x={x}
                      y={H - 8}
                      textAnchor="middle"
                      className="fill-ink-muted font-mono text-[10.5px]"
                    >
                      Day {day}
                    </text>
                  </g>
                );
              })}

              {/* 24-Hour Blind Spot Shaded Region */}
              <path d={blindSpotShadePath} fill="url(#tdBlindSpot)" />

              {/* Optional 95% Greenwood Confidence Envelope */}
              {showGreenwoodBands && (
                <path d={ciBandPath} fill="rgba(29, 78, 216, 0.14)" />
              )}

              {/* Day 1 Benchmark Pin */}
              <line
                x1={xOf(24)}
                x2={xOf(24)}
                y1={topPlotT - 6}
                y2={botPlotT + botPlotH}
                stroke="#C27018"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={xOf(24) + 8}
                y={topPlotT + 10}
                className="fill-amberdepth font-sans text-[10.5px] font-semibold"
              >
                24h Blind Spot → {cohortAnalysis.slippedPast24hCount} more failures emerge after Day 1
              </text>

              {/* Survival Step Line */}
              <path
                d={stepLinePath}
                fill="none"
                stroke="#C42B3E"
                strokeWidth="2.6"
              />

              {/* Interactive Task Discovery Nodes */}
              {curve
                .filter((pt) => pt.eventTask)
                .map((pt) => {
                  const t = pt.eventTask!;
                  const cx = xOf(pt.hour);
                  const cy = yTop(pt.stillCleanPct);
                  const isHov = hoveredTaskId === t.id;
                  const surfaced = pt.hour <= cutoffHours;
                  return (
                    <g
                      key={t.id}
                      onMouseEnter={() => setHoveredTaskId(t.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      onClick={() => onInspectTask(t)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHov ? 8.5 : surfaced ? 6 : 4.5}
                        fill={surfaced ? '#C42B3E' : '#C27018'}
                        stroke="#FAF8F4"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}

              {/* Lower Panel: Cumulative Unobserved Monthly Cost Bleed */}
              <text
                x={padL}
                y={botPlotT - 8}
                className="fill-ink-muted font-sans text-[10px] font-semibold uppercase tracking-[0.08em]"
              >
                Cumulative Monthly Rework Cost Surfaced ($/mo)
              </text>
              <line
                x1={padL}
                x2={W - padR}
                y1={botPlotT + botPlotH}
                y2={botPlotT + botPlotH}
                stroke="rgba(23,22,20,0.14)"
              />
              <path d={cumulativeBleedArea} fill="url(#tdBleedFill)" />
              <text
                x={padL - 8}
                y={botPlotT + 10}
                textAnchor="end"
                className="fill-crimson font-mono text-[9.5px]"
              >
                ${Math.round(maxMonthlyBleed / 1000)}k
              </text>
              <text
                x={padL - 8}
                y={botPlotT + botPlotH}
                textAnchor="end"
                className="fill-ink-soft font-mono text-[9.5px]"
              >
                $0
              </text>

              {/* Global Synced Horizon Scrubber Line */}
              <line
                x1={xOf(cutoffHours)}
                x2={xOf(cutoffHours)}
                y1={topPlotT - 4}
                y2={botPlotT + botPlotH}
                stroke="#1D4ED8"
                strokeWidth="2"
              />
              <circle cx={xOf(cutoffHours)} cy={topPlotT - 4} r="4.5" fill="#1D4ED8" />
            </svg>
          </div>

          {/* Synchronized Scrubber & Live Unobserved Cost Ticker */}
          <div className="pt-3 mt-2 border-t border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11.5px] mb-1">
                <span className="font-semibold text-ink">
                  Scrub inspection day (synced with Waterline)
                </span>
                <span className="font-mono font-semibold text-cobalt tabular-nums-strict">
                  Day {currentDay} · {metrics.apparentCleanPct.toFixed(0)}% look clean
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={MAX_HORIZON_HOURS}
                value={Math.round(cutoffHours)}
                onChange={(e) => onChangeCutoffHours(Number(e.target.value))}
                className="waterline-slider w-full"
              />
            </div>

            <div className="shrink-0 sm:text-right font-mono tabular-nums-strict">
              <div className="text-[10px] uppercase tracking-tag text-amberdepth font-sans font-semibold">
                Still Hidden Past Day {currentDay}
              </div>
              <div className="text-[18px] font-semibold text-ink">
                ${Math.round(cohortAnalysis.unobservedAtCutoffMonthly).toLocaleString()}
                <span className="text-[11px] font-normal text-ink-muted">/mo</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLUMNS: Cohort Breakdown + Fast vs. Slow Task Discovery Feed */}
        <div className="lg:col-span-5 flex flex-col min-h-0 gap-4">
          {/* Day 1 vs Day 14 Dollar Share Comparison */}
          <div className="shrink-0 bg-paper-warm/70 rounded-2xl border border-ink/[0.08] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-tag text-ink-muted">
                Where the hidden dollars actually hide
              </span>
              <span className="font-mono text-[11px] font-semibold text-crimson tabular-nums-strict">
                {cohortAnalysis.lateDollarSharePct.toFixed(0)}% after 24h
              </span>
            </div>

            {/* Proportional Split Bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-ink/10">
              <div
                style={{ width: `${cohortAnalysis.earlyDollarSharePct}%` }}
                className="bg-ink/70 h-full transition-all"
                title="Caught within 24 hours"
              />
              <div
                style={{ width: `${cohortAnalysis.lateDollarSharePct}%` }}
                className="bg-crimson h-full transition-all"
                title="Slipped past 24-hour window"
              />
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <div className="text-ink-soft text-[11px]">Caught in Day 1</div>
                <div className="font-mono font-semibold text-ink tabular-nums-strict">
                  {cohortAnalysis.caught24hCount} task ·{' '}
                  {cohortAnalysis.earlyDollarSharePct.toFixed(1)}% of cost
                </div>
              </div>
              <div className="text-right">
                <div className="text-crimson text-[11px] font-medium">
                  Slipped Past 24h
                </div>
                <div className="font-mono font-semibold text-crimson tabular-nums-strict">
                  {cohortAnalysis.slippedPast24hCount} tasks ·{' '}
                  {cohortAnalysis.lateDollarSharePct.toFixed(1)}% of cost
                </div>
              </div>
            </div>
          </div>

          {/* Categorized Real Task Discovery Speed List */}
          <div className="flex-1 min-h-0 overflow-y-auto clean-scroll pr-1 space-y-4">
            {/* Fast Catastrophic (<48h) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-tag text-crimson">
                  <Flame className="w-3.5 h-3.5" />
                  Fast Catastrophic (&lt; 48 hours)
                </span>
                <span className="font-mono text-[10.5px] text-ink-soft">
                  {cohortAnalysis.fastCatastrophic.length} tasks
                </span>
              </div>
              <div className="space-y-2">
                {cohortAnalysis.fastCatastrophic.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseEnter={() => setHoveredTaskId(t.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => onInspectTask(t)}
                    className={`w-full text-left rounded-xl p-3 border transition-all flex items-start justify-between gap-3 ${
                      hoveredTaskId === t.id
                        ? 'bg-crimson-wash/60 border-crimson/35'
                        : 'bg-paper border-ink/[0.08] hover:border-crimson/30'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-crimson text-paper font-mono text-[9.5px] font-semibold">
                          {t.discoveryHours}h
                        </span>
                        <span className="text-[12.5px] font-semibold text-ink truncate">
                          {t.humanTitle}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-ink-muted line-clamp-1">
                        {t.failureRootCause}
                      </p>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div className="text-[12.5px] font-semibold text-crimson">
                        +${t.humanCleanupCostUsd.toFixed(2)}
                      </div>
                      <span className="inline-flex items-center text-[10px] text-cobalt font-sans">
                        Receipt <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Slow Latent Bleed (Day 3 - Day 8) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-tag text-amberdepth">
                  <Hourglass className="w-3.5 h-3.5" />
                  Slow Latent Bleed (Day 3 – Day 8)
                </span>
                <span className="font-mono text-[10.5px] text-ink-soft">
                  {cohortAnalysis.slowLatent.length} tasks
                </span>
              </div>
              <div className="space-y-2">
                {cohortAnalysis.slowLatent.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseEnter={() => setHoveredTaskId(t.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => onInspectTask(t)}
                    className={`w-full text-left rounded-xl p-3 border transition-all flex items-start justify-between gap-3 ${
                      hoveredTaskId === t.id
                        ? 'bg-amberdepth-wash/75 border-amberdepth/40'
                        : 'bg-paper border-ink/[0.08] hover:border-amberdepth/35'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amberdepth text-paper font-mono text-[9.5px] font-semibold">
                          Day {Math.round(t.discoveryHours / 24)}
                        </span>
                        <span className="text-[12.5px] font-semibold text-ink truncate">
                          {t.humanTitle}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-ink-muted line-clamp-1">
                        {t.failureRootCause}
                      </p>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div className="text-[12.5px] font-semibold text-crimson">
                        +${t.humanCleanupCostUsd.toFixed(2)}
                      </div>
                      <span className="inline-flex items-center text-[10px] text-cobalt font-sans">
                        Receipt <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Next Chapter Action */}
          <div className="shrink-0 pt-2 border-t border-ink/10 flex justify-end">
            <button
              type="button"
              onClick={onGoToSmartFix}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-ink text-paper hover:bg-obsidian text-[12.5px] font-semibold transition-colors"
            >
              How do we stop this bleed?
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
