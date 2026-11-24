import React, { useMemo, useState } from 'react';
import { Sigma, ArrowUpRight } from 'lucide-react';
import {
  UndertowSurvivalSvg,
  SurvivalCohort,
  SurvivalPoint,
} from '../canvas/UndertowSurvivalSvg';
import { VernierScrubber } from '../controls/VernierScrubber';
import {
  T_MAX_HOURS,
  type SettlementTimelineIndex,
} from '../../engine/settlementTimeline';
import type { EnrichedTrace, PortfolioViewModel } from '../../App';

interface UndertowViewProps {
  traces: EnrichedTrace[];
  portfolio: PortfolioViewModel;
  timeline: SettlementTimelineIndex;
  cutoffHours: number;
  onChangeCutoffHours: (nextHours: number) => void;
  onOpenFormulaLens: () => void;
  onJumpToAutopsy: (filter: 'clean' | 'fracture') => void;
}

interface CovariateForce {
  id: string;
  label: string;
  hazardRatio: number;
  meanLatencyHrs: number;
  affectedShare: number;
  tone: string;
}

function computeKaplanMeier(
  cohortTraces: EnrichedTrace[],
  discoveryMap: Map<string, number>,
  maxHours = T_MAX_HOURS
): { points: SurvivalPoint[]; medianHours: number | null } {
  const n = cohortTraces.length;
  if (n === 0) {
    return {
      points: [{ hour: 0, survival: 1, ciLow: 1, ciHigh: 1, atRisk: 0, events: 0 }],
      medianHours: null,
    };
  }

  const observations = cohortTraces.map((t) => {
    const disc = discoveryMap.get(t.id);
    const isEvent = t.hasFailure && disc !== undefined && Number.isFinite(disc);
    return {
      time: isEvent ? Math.max(1, Math.min(maxHours, Math.round(disc))) : maxHours,
      event: isEvent ? 1 : 0,
    };
  });

  const uniqueEventTimes = Array.from(
    new Set(observations.filter((o) => o.event === 1).map((o) => o.time))
  ).sort((a, b) => a - b);

  const points: SurvivalPoint[] = [
    { hour: 0, survival: 1, ciLow: 1, ciHigh: 1, atRisk: n, events: 0 },
  ];

  let survival = 1.0;
  let greenwoodSum = 0.0;
  let medianHours: number | null = null;

  for (const t of uniqueEventTimes) {
    let atRisk = 0;
    let events = 0;
    for (const o of observations) {
      if (o.time >= t) atRisk++;
      if (o.time === t && o.event === 1) events++;
    }
    if (atRisk <= 0) continue;

    survival *= 1 - events / atRisk;
    if (atRisk > events) {
      greenwoodSum += events / (atRisk * (atRisk - events));
    }

    const se = survival * Math.sqrt(Math.max(0, greenwoodSum));
    const ciLow = Math.max(0, survival - 1.96 * se);
    const ciHigh = Math.min(1, survival + 1.96 * se);

    if (medianHours === null && survival <= 0.5) {
      medianHours = t;
    }

    points.push({
      hour: t,
      survival,
      ciLow,
      ciHigh,
      atRisk,
      events,
    });
  }

  if (points[points.length - 1].hour < maxHours) {
    const last = points[points.length - 1];
    points.push({
      ...last,
      hour: maxHours,
      events: 0,
    });
  }

  return { points, medianHours };
}

export const UndertowView: React.FC<UndertowViewProps> = ({
  traces,
  portfolio,
  timeline,
  cutoffHours,
  onChangeCutoffHours,
  onOpenFormulaLens,
  onJumpToAutopsy,
}) => {
  const [selectedCovariate, setSelectedCovariate] = useState<string | null>(null);
  const roundedHorizon = Math.round(cutoffHours);

  const cohorts: SurvivalCohort[] = useMemo(() => {
    const allKm = computeKaplanMeier(traces, timeline.discoveryByTraceId);
    const multiTool = traces.filter((t) => t.toolCalls >= 4);
    const singleTool = traces.filter((t) => t.toolCalls < 4);

    const multiKm = computeKaplanMeier(
      multiTool.length ? multiTool : traces,
      timeline.discoveryByTraceId
    );
    const singleKm = computeKaplanMeier(
      singleTool.length ? singleTool : traces,
      timeline.discoveryByTraceId
    );

    return [
      {
        id: 'all',
        label: 'All Portfolio Traces',
        color: '#141413',
        fillRgba: 'rgba(20, 20, 19, 0.065)',
        points: allKm.points,
        medianSurvivalHours: allKm.medianHours,
      },
      {
        id: 'single-tool',
        label: 'Low-Depth (<4 tools)',
        color: '#0D7A5F',
        fillRgba: 'rgba(13, 122, 95, 0.085)',
        points: singleKm.points,
        medianSurvivalHours: singleKm.medianHours,
      },
      {
        id: 'multi-tool',
        label: 'High-Depth (≥4 tools)',
        color: '#C92A3E',
        fillRgba: 'rgba(201, 42, 62, 0.095)',
        points: multiKm.points,
        medianSurvivalHours: multiKm.medianHours,
      },
    ];
  }, [traces, timeline.discoveryByTraceId]);

  const ibnrTelemetry = useMemo(() => {
    const primary = cohorts[0]?.points ?? [];
    const getS = (hr: number) => {
      let s = 1;
      for (const p of primary) {
        if (p.hour <= hr) s = p.survival;
        else break;
      }
      return s;
    };

    const sHorizon = getS(cutoffHours);
    const sTerminal = getS(T_MAX_HOURS);
    const latentDrop = Math.max(0, sHorizon - sTerminal);

    const avgHiddenPerFailure =
      timeline.fracturedTraceCount > 0
        ? timeline.prefixHiddenCostArr[timeline.fracturedTraceCount] /
          timeline.fracturedTraceCount
        : 0;

    const unitIbnrAtHorizon = latentDrop * avgHiddenPerFailure;
    const monthlySubmergedDollars =
      portfolio.monthlyTaskVolume * unitIbnrAtHorizon;

    return {
      sHorizon,
      sTerminal,
      latentDrop,
      monthlySubmergedDollars,
      unitIbnrAtHorizon,
    };
  }, [cohorts, cutoffHours, timeline, portfolio.monthlyTaskVolume]);

  const covariates: CovariateForce[] = useMemo(() => {
    const baseFailRate = Math.max(
      0.01,
      traces.filter((t) => t.hasFailure).length / Math.max(1, traces.length)
    );

    const buildForce = (
      id: string,
      label: string,
      pred: (t: EnrichedTrace) => boolean,
      tone: string
    ): CovariateForce => {
      const subset = traces.filter(pred);
      const failures = subset.filter((t) => t.hasFailure);
      const failRate = failures.length / Math.max(1, subset.length);
      const meanLat =
        failures.reduce((acc, t) => {
          const d = timeline.discoveryByTraceId.get(t.id);
          return acc + (d !== undefined && Number.isFinite(d) ? d : 48);
        }, 0) / Math.max(1, failures.length);
      return {
        id,
        label,
        hazardRatio: Math.max(0.4, failRate / baseFailRate),
        meanLatencyHrs: meanLat || 48,
        affectedShare: subset.length / Math.max(1, traces.length),
        tone,
      };
    };

    return [
      buildForce('retries', 'Retry Cascades (≥2)', (t) => t.retryCount >= 2, '#C92A3E'),
      buildForce('tools', 'Deep Tool Chain (≥4)', (t) => t.toolCalls >= 4, '#B86B11'),
      buildForce('context', 'Long Context (>18k tok)', (t) => t.inputTokens > 18000, '#1A4D8F'),
      buildForce('stakes', 'High Stakes (>$250)', (t) => t.dollarStakes > 250, '#991B2C'),
      buildForce('cache', 'Prompt Cache Hit', (t) => t.cacheHitRate > 0.35, '#0D7A5F'),
    ];
  }, [traces, timeline.discoveryByTraceId]);

  return (
    <section className="relative flex-1 w-full h-full overflow-hidden px-6 md:px-12 pt-5 pb-24 flex flex-col justify-between">
      {/* Top Floating Monumental Telemetry Strip — Synchronized with Global cutoffHours */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="plate-caption mb-1.5 flex items-center gap-3">
            <span>VIEW 02 · TOPOGRAPHIC SURVIVAL FIELD &amp; SUBMERGED IBNR HORIZON</span>
            <span className="text-sumi/25">|</span>
            <span className="font-mono text-amberink">
              SYNCED WITH OPTICAL CURTAIN · T+{roundedHorizon}h
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <span className="monument-figure text-[60px] sm:text-[76px] xl:text-[90px] text-amberink">
                ${Math.round(ibnrTelemetry.monthlySubmergedDollars).toLocaleString()}
              </span>
              <span className="ml-2 font-mono text-[13px] text-amberink/75">/mo</span>
              <div className="plate-caption text-amberink/85 mt-0.5">
                SUBMERGED IBNR LIABILITY PAST T+{roundedHorizon}h
              </div>
            </div>

            <div className="h-12 w-px bg-sumi/10 hidden sm:block self-center" />

            <div>
              <span className="monument-figure text-[44px] sm:text-[54px] text-sumi">
                {(ibnrTelemetry.sHorizon * 100).toFixed(1)}%
              </span>
              <div className="plate-caption mt-0.5">
                SURVIVAL AT T+{roundedHorizon}h
              </div>
            </div>

            <div>
              <span className="monument-figure text-[44px] sm:text-[54px] text-carmine">
                +{(ibnrTelemetry.latentDrop * 100).toFixed(1)}pp
              </span>
              <div className="plate-caption text-carmine/80 mt-0.5">
                UNREPORTED TAIL FRACTURES
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cohort Legend + Actuarial Formula Trigger */}
        <div className="flex flex-col lg:items-end gap-2.5">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
            {cohorts.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 text-sumi/75">
                <span
                  className="w-3 h-[2.5px] rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                {c.label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onOpenFormulaLens}
              className="inline-flex items-center gap-1.5 pb-0.5 border-b border-cobalt/40 hover:border-cobalt text-[10.5px] font-semibold tracking-museum uppercase text-cobalt transition-colors"
            >
              <Sigma className="w-3.5 h-3.5" />
              Greenwood &amp; IBNR Proofs
            </button>
            <button
              type="button"
              onClick={() => onJumpToAutopsy('fracture')}
              className="inline-flex items-center gap-1 pb-0.5 border-b border-sumi/25 hover:border-sumi text-[10.5px] font-semibold tracking-museum uppercase text-sumi/70 hover:text-sumi transition-colors"
            >
              Inspect Delayed Fractures
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Edge-to-Edge Frameless Survival Field */}
      <div className="relative flex-1 min-h-[210px] my-2">
        <UndertowSurvivalSvg
          cohorts={cohorts}
          horizonHours={roundedHorizon}
          maxHours={T_MAX_HOURS}
          submergedLiabilityDollars={ibnrTelemetry.monthlySubmergedDollars}
        />
      </div>

      {/* Open-Air Horizontal Covariate Force Spine with Proportional Glass Orbs */}
      <div className="relative py-2.5 hairline-t">
        <div className="flex items-center justify-between mb-2">
          <span className="plate-caption">
            COX PROPORTIONAL HAZARD COVARIATE FORCE SPINE · ORB RADIUS ∝ CORPUS EXPOSURE
          </span>
          <span className="font-mono text-[10.5px] text-sumi/55 tabular-nums-strict">
            UNIT IBNR RESERVE AT T+{roundedHorizon}h: ${ibnrTelemetry.unitIbnrAtHorizon.toFixed(2)} / TASK
          </span>
        </div>

        <div className="relative flex items-center justify-between gap-2 py-2">
          <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 h-px bg-sumi/14" />

          {covariates.map((cov) => {
            const diameter = Math.round(28 + Math.min(1, cov.affectedShare * 1.4) * 24);
            const active = selectedCovariate === cov.id;
            return (
              <button
                key={cov.id}
                type="button"
                onClick={() => setSelectedCovariate(active ? null : cov.id)}
                className="relative z-10 flex items-center gap-3 group focus:outline-none"
              >
                <div
                  style={{
                    width: `${diameter}px`,
                    height: `${diameter}px`,
                    borderColor: cov.tone,
                    background: `radial-gradient(circle at 32% 32%, rgba(255,255,255,0.88), ${cov.tone}22 65%, ${cov.tone}44 100%)`,
                  }}
                  className={`rounded-full border backdrop-blur-md flex items-center justify-center font-mono text-[10.5px] font-semibold tabular-nums-strict transition-transform duration-300 ${
                    active ? 'scale-115 ring-2 ring-sumi/20' : 'group-hover:scale-110'
                  }`}
                >
                  <span style={{ color: cov.tone }}>
                    {cov.hazardRatio.toFixed(1)}×
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[11px] font-semibold text-sumi/85 leading-tight">
                    {cov.label}
                  </div>
                  <div className="font-mono text-[10px] text-sumi/50 tabular-nums-strict">
                    {(cov.affectedShare * 100).toFixed(0)}% vol · μ {Math.round(cov.meanLatencyHrs)}h
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Machined Vernier Scrubber Ruler Globally Synced (0h -> 336h) */}
      <div className="pt-1">
        <VernierScrubber
          value={roundedHorizon}
          min={0}
          max={T_MAX_HOURS}
          onChange={onChangeCutoffHours}
        />
      </div>
    </section>
  );
};
