import React, { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { formatMoney, useFinOpsStore } from '../store/useFinOpsStore';
import { ModelEfficiencyPoint, PortfolioMetricsSummary } from '../types/settlement';

interface AgentTokenEfficiencyMatrixProps {
  metrics: PortfolioMetricsSummary;
}

/**
 * Interactive Editorial Scatter / Bubble Efficiency Matrix:
 *  - X-Axis: End-to-End Autonomous Latency (seconds)
 *  - Y-Axis: True Fully-Loaded Unit Cost ($/task)
 *  - Bubble Radius: Total Token Consumption (prompt + completion + reasoning)
 *  - Color Encoding:
 *      #047857 Emerald  — Resolved First-Pass (Optimal Quadrant)
 *      #B45309 Amber    — Resolved with Hidden Rework
 *      #B91C1C Crimson  — Escalated / Failed (Deficit / Bleed)
 * Clicking any bubble opens the forensic Trace Inspector Drawer for that trace.
 */
export const AgentTokenEfficiencyMatrix: React.FC<AgentTokenEfficiencyMatrixProps> = ({
  metrics,
}) => {
  const { simulation, setInspectedTraceId } = useFinOpsStore();
  const c = simulation.currency;
  const [hovered, setHovered] = useState<ModelEfficiencyPoint | null>(null);

  const points = metrics.efficiencyPoints;
  const svgW = 620;
  const svgH = 310;
  const pad = { top: 24, right: 24, bottom: 44, left: 62 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const maxLatency = Math.max(30, ...points.map((p) => p.latencySeconds)) * 1.12;
  const maxCost = Math.max(5, ...points.map((p) => p.trueUnitCostUsd)) * 1.15;
  const maxTokens = Math.max(10000, ...points.map((p) => p.totalTokens));

  const xScale = (sec: number) => pad.left + (sec / maxLatency) * plotW;
  const yScale = (cost: number) => pad.top + plotH - (cost / maxCost) * plotH;
  const rScale = (tok: number) => 6 + Math.sqrt(tok / maxTokens) * 14;

  const colorForStatus = (status: ModelEfficiencyPoint['resolutionStatus']) => {
    if (status === 'resolved_first_pass') return '#047857';
    if (status === 'resolved_with_rework') return '#B45309';
    return '#B91C1C';
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxCost);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * maxLatency));

  return (
    <section className="flex flex-col justify-between rounded-sm border border-vellum-border bg-vellum-sheet p-5 shadow-editorial">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-vellum-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-finops-indigo" />
            <h2 className="font-serif text-lg font-semibold text-ink-primary">
              Agent Token Efficiency &amp; Latency Frontier
            </h2>
          </div>
          <p className="mt-0.5 font-sans text-xs text-ink-muted">
            True Unit Cost vs. Execution Latency (bubble size = total tokens). Click any trace node for forensic audit.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-ink-secondary">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-finops-emerald" />
            First-Pass
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-finops-amber" />
            Rework
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-finops-crimson" />
            Escalated/Fail
          </span>
        </div>
      </div>

      {/* SVG Scatter Matrix */}
      <div className="relative mt-3 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="h-auto w-full min-w-[480px]"
          role="img"
          aria-label="Scatter plot comparing True Unit Cost against Latency across agent tasks"
        >
          {/* Optimal Low-Cost Low-Latency Quadrant Shading */}
          <rect
            x={pad.left}
            y={pad.top + plotH * 0.55}
            width={plotW * 0.45}
            height={plotH * 0.45}
            fill="#047857"
            fillOpacity={0.045}
          />
          <text
            x={pad.left + 8}
            y={pad.top + plotH - 8}
            className="fill-finops-emerald font-mono text-[9px] uppercase tracking-wider"
            fillOpacity={0.75}
          >
            Optimal Frontier (Low Cost · Fast)
          </text>

          {/* Horizontal Gridlines & Y Axis */}
          {yTicks.map((val, idx) => {
            const y = yScale(val);
            return (
              <g key={`y-${idx}`}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={svgW - pad.right}
                  y2={y}
                  stroke="#EFEADF"
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                />
                <text
                  x={pad.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-ink-muted font-mono text-[10px]"
                >
                  {formatMoney(val, c, 0)}
                </text>
              </g>
            );
          })}

          {/* Vertical Gridlines & X Axis */}
          {xTicks.map((val, idx) => {
            const x = xScale(val);
            return (
              <g key={`x-${idx}`}>
                <line
                  x1={x}
                  y1={pad.top}
                  x2={x}
                  y2={pad.top + plotH}
                  stroke="#EFEADF"
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                />
                <text
                  x={x}
                  y={pad.top + plotH + 16}
                  textAnchor="middle"
                  className="fill-ink-muted font-mono text-[10px]"
                >
                  {val}s
                </text>
              </g>
            );
          })}

          {/* Axis Titles */}
          <text
            x={pad.left + plotW / 2}
            y={svgH - 6}
            textAnchor="middle"
            className="fill-ink-secondary font-mono text-[10px] uppercase tracking-wider"
          >
            Agent Wall-Clock Latency (Seconds)
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
            className="fill-ink-secondary font-mono text-[10px] uppercase tracking-wider"
          >
            True Unit Cost ({c})
          </text>

          {/* Bubbles */}
          {points.map((pt) => {
            const cx = xScale(pt.latencySeconds);
            const cy = yScale(pt.trueUnitCostUsd);
            const r = rScale(pt.totalTokens);
            const color = colorForStatus(pt.resolutionStatus);
            const isHovered = hovered?.traceId === pt.traceId;

            return (
              <g
                key={pt.traceId}
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setInspectedTraceId(pt.traceId)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r + 2.5 : r}
                  fill={color}
                  fillOpacity={isHovered ? 0.45 : 0.25}
                  stroke={color}
                  strokeWidth={isHovered ? 2.2 : 1.5}
                />
                <circle cx={cx} cy={cy} r={2.2} fill={color} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Forensic Hover Strip */}
      <div className="mt-3 flex min-h-[54px] items-center justify-between rounded-sm border border-vellum-border bg-vellum-panel/70 px-3.5 py-2 text-xs">
        {hovered ? (
          <>
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-ink-primary">{hovered.taskId}</span>
                <span className="rounded-sm bg-vellum-sheet px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary border border-vellum-border">
                  {hovered.modelId}
                </span>
              </div>
              <p className="mt-0.5 truncate text-ink-muted">{hovered.title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4 font-mono text-right">
              <div>
                <p className="text-[10px] text-ink-muted">TRUE COST</p>
                <p className="font-semibold text-ink-primary">
                  {formatMoney(hovered.trueUnitCostUsd, c, 2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted">REWORK TAX</p>
                <p className="font-semibold text-finops-amber">
                  {hovered.hiddenReworkTaxPct.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted">TOKENS</p>
                <p className="font-semibold text-ink-secondary">
                  {(hovered.totalTokens / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="font-mono text-[11px] text-ink-muted">
            Hover any bubble to inspect task unit economics, or click to open step-by-step span forensics.
          </p>
        )}
      </div>
    </section>
  );
};
