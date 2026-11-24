import React, { useMemo, useState } from 'react';

export interface SurvivalPoint {
  hour: number;
  survival: number; // 0..1
  ciLow: number; // 95% Greenwood lower
  ciHigh: number; // 95% Greenwood upper
  atRisk: number;
  events: number;
}

export interface SurvivalCohort {
  id: string;
  label: string;
  color: string;
  fillRgba: string;
  points: SurvivalPoint[];
  medianSurvivalHours: number | null;
}

interface UndertowSurvivalSvgProps {
  cohorts: SurvivalCohort[];
  horizonHours: number; // 24..336
  maxHours?: number;
  submergedLiabilityDollars: number;
}

export const UndertowSurvivalSvg: React.FC<UndertowSurvivalSvgProps> = ({
  cohorts,
  horizonHours,
  maxHours = 336,
  submergedLiabilityDollars,
}) => {
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const width = 1280;
  const height = 430;
  const padL = 74;
  const padR = 52;
  const padT = 30;
  const padB = 46;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xScale = (h: number) => padL + (Math.min(maxHours, Math.max(0, h)) / maxHours) * plotW;
  const yScale = (s: number) => padT + (1 - Math.min(1, Math.max(0, s))) * plotH;

  const buildStepPath = (pts: SurvivalPoint[], accessor: (p: SurvivalPoint) => number) => {
    if (!pts.length) return '';
    let d = `M ${xScale(pts[0].hour).toFixed(1)} ${yScale(accessor(pts[0])).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prevY = yScale(accessor(pts[i - 1])).toFixed(1);
      const currX = xScale(pts[i].hour).toFixed(1);
      const currY = yScale(accessor(pts[i])).toFixed(1);
      d += ` H ${currX} V ${currY}`;
      if (i === pts.length - 1 && pts[i].hour < maxHours) {
        d += ` H ${xScale(maxHours).toFixed(1)}`;
      }
      void prevY;
    }
    return d;
  };

  const buildConfidenceBand = (pts: SurvivalPoint[]) => {
    if (!pts.length) return '';
    const upper: string[] = [];
    const lower: string[] = [];
    for (let i = 0; i < pts.length; i++) {
      const x = xScale(pts[i].hour);
      const yHi = yScale(pts[i].ciHigh);
      const yLo = yScale(pts[i].ciLow);
      if (i > 0) {
        const prevHi = yScale(pts[i - 1].ciHigh);
        const prevLo = yScale(pts[i - 1].ciLow);
        upper.push(`L ${x.toFixed(1)} ${prevHi.toFixed(1)}`);
        lower.unshift(`L ${x.toFixed(1)} ${prevLo.toFixed(1)}`);
      }
      upper.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yHi.toFixed(1)}`);
      lower.unshift(`L ${x.toFixed(1)} ${yLo.toFixed(1)}`);
    }
    const endX = xScale(maxHours).toFixed(1);
    const last = pts[pts.length - 1];
    upper.push(`L ${endX} ${yScale(last.ciHigh).toFixed(1)}`);
    lower.unshift(`L ${endX} ${yScale(last.ciLow).toFixed(1)}`);
    return `${upper.join(' ')} ${lower.join(' ')} Z`;
  };

  // Build Submerged IBNR Veil Path (region right of horizonHours beneath primary curve)
  const submergedVeilPath = useMemo(() => {
    const primary = cohorts[0];
    if (!primary || !primary.points.length) return '';
    const xH = xScale(horizonHours);
    const pts = primary.points;

    const getSAt = (h: number) => {
      let s = 1;
      for (const p of pts) {
        if (p.hour <= h) s = p.survival;
        else break;
      }
      return s;
    };

    const startS = getSAt(horizonHours);
    let d = `M ${xH.toFixed(1)} ${yScale(startS).toFixed(1)}`;
    for (const p of pts) {
      if (p.hour > horizonHours) {
        d += ` H ${xScale(p.hour).toFixed(1)} V ${yScale(p.survival).toFixed(1)}`;
      }
    }
    d += ` H ${xScale(maxHours).toFixed(1)} V ${yScale(0).toFixed(1)} H ${xH.toFixed(1)} Z`;
    return d;
  }, [cohorts, horizonHours, maxHours]);

  const interpolateAt = (pts: SurvivalPoint[], hour: number) => {
    let curr = pts[0];
    for (const p of pts) {
      if (p.hour <= hour) curr = p;
      else break;
    }
    return curr;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const h = ((relX - padL) / plotW) * maxHours;
    if (h >= 0 && h <= maxHours) {
      setHoverHour(Math.round(h));
    } else {
      setHoverHour(null);
    }
  };

  const yTicks = [1.0, 0.75, 0.5, 0.25, 0.0];
  const xTicks = [0, 24, 72, 120, 168, 240, 336];
  const horizonX = xScale(horizonHours);

  return (
    <div className="relative w-full h-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverHour(null)}
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Submerged IBNR Amber Depth Gradient */}
          <linearGradient id="ibnrAmberDepth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B86B11" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#B86B11" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#B86B11" stopOpacity="0.02" />
          </linearGradient>

          {/* Subtle Diagonal Hatch for Unobserved Latent Zone */}
          <pattern
            id="latentHatch"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="rgba(184, 107, 17, 0.14)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Subtle Horizontal Hairline Elevation Grid */}
        {yTicks.map((t) => {
          const y = yScale(t);
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="rgba(20, 20, 19, 0.075)"
                strokeDasharray={t === 0 ? undefined : '2 6'}
              />
              <text
                x={padL - 14}
                y={y + 3.5}
                textAnchor="end"
                className="fill-sumi/45 font-mono text-[10.5px] tabular-nums-strict"
              >
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Vertical Time Tick Hairlines */}
        {xTicks.map((hr) => {
          const x = xScale(hr);
          return (
            <g key={hr}>
              <line
                x1={x}
                x2={x}
                y1={padT}
                y2={height - padB}
                stroke="rgba(20, 20, 19, 0.055)"
              />
              <text
                x={x}
                y={height - padB + 20}
                textAnchor="middle"
                className="fill-sumi/45 font-mono text-[10.5px] tabular-nums-strict"
              >
                {hr === 0 ? 'T+0h' : hr === 168 ? '7d (168h)' : hr === 336 ? '14d (336h)' : `${hr}h`}
              </text>
            </g>
          );
        })}

        {/* Submerged IBNR Liability Amber Depth Veil */}
        {submergedVeilPath && (
          <g>
            <path d={submergedVeilPath} fill="url(#ibnrAmberDepth)" />
            <path d={submergedVeilPath} fill="url(#latentHatch)" />
          </g>
        )}

        {/* Layered 95% Greenwood Confidence Washes + Kaplan-Meier Step Curves */}
        {cohorts.map((cohort) => (
          <g key={cohort.id}>
            <path
              d={buildConfidenceBand(cohort.points)}
              fill={cohort.fillRgba}
            />
            <path
              d={buildStepPath(cohort.points, (p) => p.survival)}
              fill="none"
              stroke={cohort.color}
              strokeWidth={cohort.id === 'all' ? 2.4 : 1.9}
              strokeLinejoin="miter"
            />
          </g>
        ))}

        {/* Observation Horizon Vertical Optical Plane */}
        <g>
          <line
            x1={horizonX}
            x2={horizonX}
            y1={padT - 12}
            y2={height - padB}
            stroke="#B86B11"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle
            cx={horizonX}
            cy={padT - 12}
            r="3.5"
            fill="#B86B11"
          />
          {/* Horizon Label */}
          <text
            x={Math.min(width - padR - 140, horizonX + 10)}
            y={padT + 8}
            className="fill-amberink font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em]"
          >
            IBNR HORIZON · T+{horizonHours}h
          </text>
          <text
            x={Math.min(width - padR - 140, horizonX + 10)}
            y={padT + 24}
            className="fill-amberink/80 font-mono text-[10.5px] tabular-nums-strict"
          >
            SUBMERGED RESERVE: ${Math.round(submergedLiabilityDollars).toLocaleString()}
          </text>
        </g>

        {/* Interactive Optical Crosshair on Hover */}
        {hoverHour !== null && (
          <g>
            <line
              x1={xScale(hoverHour)}
              x2={xScale(hoverHour)}
              y1={padT}
              y2={height - padB}
              stroke="rgba(20, 20, 19, 0.35)"
              strokeWidth="1"
            />
            {cohorts.map((c) => {
              const pt = interpolateAt(c.points, hoverHour);
              if (!pt) return null;
              return (
                <circle
                  key={c.id}
                  cx={xScale(hoverHour)}
                  cy={yScale(pt.survival)}
                  r="4.5"
                  fill={c.color}
                  stroke="#FCFAF5"
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}

        {/* Y-Axis Plate Caption */}
        <text
          x={padL}
          y={14}
          className="fill-sumi/50 font-sans text-[10px] font-semibold uppercase tracking-[0.14em]"
        >
          S(t) REWORK-FREE SURVIVAL PROBABILITY · 95% GREENWOOD CI
        </text>
      </svg>

      {/* Floating Frosted Glass Hover Readout */}
      {hoverHour !== null && (
        <div
          className="pointer-events-none absolute top-4 right-14 optical-glass rounded-2xl px-4 py-3 text-[11px] font-mono tabular-nums-strict"
        >
          <div className="plate-caption mb-1.5">
            TIME ELAPSED · T+{hoverHour} HOURS
          </div>
          <div className="space-y-1">
            {cohorts.map((c) => {
              const pt = interpolateAt(c.points, hoverHour);
              if (!pt) return null;
              return (
                <div key={c.id} className="flex items-center justify-between gap-5">
                  <span className="flex items-center gap-1.5 text-sumi/80">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </span>
                  <span className="font-semibold text-sumi">
                    {(pt.survival * 100).toFixed(1)}%{' '}
                    <span className="text-sumi/45 font-normal">
                      [{(pt.ciLow * 100).toFixed(0)}–{(pt.ciHigh * 100).toFixed(0)}%]
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
