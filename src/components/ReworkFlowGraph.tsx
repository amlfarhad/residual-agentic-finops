import React, { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { formatMoney, useFinOpsStore } from '../store/useFinOpsStore';
import { PortfolioMetricsSummary } from '../types/settlement';

interface ReworkFlowGraphProps {
  metrics: PortfolioMetricsSummary;
}

interface FlowBand {
  id: string;
  label: string;
  sublabel: string;
  amountUsd: number;
  color: string;
  softBg: string;
  category: 'productive' | 'rework' | 'labor' | 'sla';
}

/**
 * Editorial SVG Sankey / Proportional Economic Flow Diagram.
 * Visually decomposes Total Fully-Loaded Agentic Spend into:
 *  - First-Pass Productive Tokens (#4338CA Indigo)
 *  - Rework Token Loops (#B45309 Amber)
 *  - Human QA Oversight Labor (#78716C Warm Slate)
 *  - Human Escalation Takeover (#B91C1C Crimson)
 *  - Contractual SLA Breach Penalties (#991B1B Deep Crimson)
 * And reconciles against the BLS Human Baseline to expose Net FinOps Surplus (#047857).
 */
export const ReworkFlowGraph: React.FC<ReworkFlowGraphProps> = ({ metrics }) => {
  const { simulation } = useFinOpsStore();
  const c = simulation.currency;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const totalCost = Math.max(0.01, metrics.totalTrueCostUsd);

  const bands: FlowBand[] = [
    {
      id: 'first-pass',
      label: 'First-Pass Intelligence',
      sublabel: 'Productive API inference tokens',
      amountUsd: metrics.totalFirstPassTokenCostUsd,
      color: '#4338CA',
      softBg: '#E0E7FF',
      category: 'productive',
    },
    {
      id: 'rework-tokens',
      label: 'Hidden Rework Loops',
      sublabel: 'Schema retries, test loops & context thrash',
      amountUsd: metrics.totalReworkTokenCostUsd,
      color: '#B45309',
      softBg: '#FEF3C7',
      category: 'rework',
    },
    {
      id: 'human-qa',
      label: 'Human QA & Oversight',
      sublabel: 'Loaded BLS review labor on agent output',
      amountUsd: metrics.totalHumanOversightCostUsd,
      color: '#57534E',
      softBg: '#E7E5E4',
      category: 'labor',
    },
    {
      id: 'human-esc',
      label: 'Human Escalation Takeover',
      sublabel: 'Tier-2 / Dev handoffs when agent exhausts',
      amountUsd: metrics.totalHumanEscalationCostUsd,
      color: '#B91C1C',
      softBg: '#FEE2E2',
      category: 'labor',
    },
    {
      id: 'sla-penalty',
      label: 'SLA Breach Accruals',
      sublabel: 'Contractual P1/P2/P3 credit bleed',
      amountUsd: metrics.totalSlaPenaltyUsd,
      color: '#7F1D1D',
      softBg: '#FECACA',
      category: 'sla',
    },
  ];

  // SVG Layout geometry
  const svgWidth = 680;
  const svgHeight = 290;
  const leftX = 24;
  const leftWidth = 26;
  const rightX = 408;
  const rightWidth = 22;
  const topPad = 24;
  const usableHeight = 242;

  // Compute source vertical positions and target slot heights (with readable minimum thickness)
  const rawShares = bands.map((b) => b.amountUsd / totalCost);
  const minVisualShare = 0.055;
  const adjustedShares = rawShares.map((s) => (s > 0 ? Math.max(minVisualShare, s) : 0.03));
  const adjustedSum = adjustedShares.reduce((a, b) => a + b, 0);
  const normalizedHeights = adjustedShares.map((s) => (s / adjustedSum) * (usableHeight - 24));

  let leftCursor = topPad;
  let rightCursor = topPad;
  const gap = 6;

  const ribbonSpecs = bands.map((band, idx) => {
    const h = normalizedHeights[idx];
    const y0Left = leftCursor;
    const y1Left = leftCursor + h;
    leftCursor += h + 2;

    const y0Right = rightCursor;
    const y1Right = rightCursor + h;
    rightCursor += h + gap;

    const x0 = leftX + leftWidth;
    const x1 = rightX;
    const cx = (x0 + x1) / 2;

    const pathD = [
      `M ${x0} ${y0Left}`,
      `C ${cx} ${y0Left}, ${cx} ${y0Right}, ${x1} ${y0Right}`,
      `L ${x1} ${y1Right}`,
      `C ${cx} ${y1Right}, ${cx} ${y1Left}, ${x0} ${y1Left}`,
      'Z',
    ].join(' ');

    return {
      ...band,
      sharePct: (band.amountUsd / totalCost) * 100,
      y0Left,
      y1Left,
      y0Right,
      y1Right,
      h,
      pathD,
    };
  });

  const activeBand = ribbonSpecs.find((r) => r.id === hoveredId) ?? null;

  return (
    <section className="flex flex-col justify-between rounded-sm border border-vellum-border bg-vellum-sheet p-5 shadow-editorial">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-vellum-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-finops-amber" />
            <h2 className="font-serif text-lg font-semibold text-ink-primary">
              Economic Cost Decomposition Flow
            </h2>
          </div>
          <p className="mt-0.5 font-sans text-xs text-ink-muted">
            Reconciling total fully-loaded expenditure ({formatMoney(metrics.totalTrueCostUsd, c, 2)}) across productive intelligence vs. hidden rework &amp; escalation bleed.
          </p>
        </div>
        <div className="rounded-sm border border-vellum-border bg-vellum-panel px-2.5 py-1 font-mono text-[11px] text-ink-secondary">
          {activeBand ? (
            <span>
              <strong style={{ color: activeBand.color }}>{activeBand.label}:</strong>{' '}
              {formatMoney(activeBand.amountUsd, c, 2)} ({activeBand.sharePct.toFixed(1)}%)
            </span>
          ) : (
            <span>Hover ribbon to inspect share</span>
          )}
        </div>
      </div>

      {/* SVG Flow Diagram */}
      <div className="mt-3 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-auto w-full min-w-[540px]"
          role="img"
          aria-label="Sankey flow diagram showing First-Pass Token Cost versus Hidden Rework, Human Escalation, and SLA Penalties"
        >
          {/* Column Labels */}
          <text x={leftX} y={14} className="fill-ink-muted font-mono text-[10px] uppercase">
            Total True Spend
          </text>
          <text x={rightX} y={14} className="fill-ink-muted font-mono text-[10px] uppercase">
            Cost Attribution Nodes
          </text>

          {/* Left Master Column */}
          <rect
            x={leftX}
            y={topPad}
            width={leftWidth}
            height={Math.max(20, leftCursor - topPad - 2)}
            rx={2}
            fill="#1C1917"
          />

          {/* Flow Ribbons & Right Nodes */}
          {ribbonSpecs.map((r) => {
            const isDimmed = hoveredId !== null && hoveredId !== r.id;
            const midRightY = (r.y0Right + r.y1Right) / 2;

            return (
              <g
                key={r.id}
                onMouseEnter={() => setHoveredId(r.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="cursor-pointer transition-opacity duration-150"
                style={{ opacity: isDimmed ? 0.28 : 1 }}
              >
                {/* Cubic Bezier Flow */}
                <path d={r.pathD} fill={r.color} fillOpacity={hoveredId === r.id ? 0.42 : 0.24} />
                <path
                  d={`M ${leftX + leftWidth} ${(r.y0Left + r.y1Left) / 2} C ${(leftX + leftWidth + rightX) / 2} ${(r.y0Left + r.y1Left) / 2}, ${(leftX + leftWidth + rightX) / 2} ${midRightY}, ${rightX} ${midRightY}`}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={hoveredId === r.id ? 1.5 : 0.75}
                  strokeOpacity={0.65}
                />

                {/* Right Bar Node */}
                <rect
                  x={rightX}
                  y={r.y0Right}
                  width={rightWidth}
                  height={Math.max(4, r.h)}
                  rx={2}
                  fill={r.color}
                />

                {/* Right Text Labels */}
                <text
                  x={rightX + rightWidth + 10}
                  y={midRightY - 2}
                  className="fill-ink-primary font-sans text-[11px] font-semibold"
                >
                  {r.label}
                </text>
                <text
                  x={rightX + rightWidth + 10}
                  y={midRightY + 11}
                  className="fill-ink-muted font-mono text-[10px]"
                >
                  {formatMoney(r.amountUsd, c, 2)} · {r.sharePct.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Rework Taxonomy Strip */}
      <div className="mt-3 border-t border-vellum-border pt-3">
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Detected Rework Root-Cause Breakdown (Token Spend &amp; Event Count)
        </p>
        {metrics.reworkByCategory.length === 0 ? (
          <p className="font-sans text-xs text-finops-emerald">
            Zero rework loops detected in active corpus — 100% first-pass clean execution.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {metrics.reworkByCategory.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between rounded-sm border border-vellum-border bg-vellum-panel/60 px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate font-medium text-ink-primary">{cat.label}</p>
                  <p className="font-mono text-[10px] text-ink-muted">
                    {cat.eventCount} event{cat.eventCount === 1 ? '' : 's'} ·{' '}
                    {(cat.tokens / 1000).toFixed(1)}k wasted tok
                  </p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-semibold text-finops-amber">
                    {formatMoney(cat.costUsd, c, 3)}
                  </p>
                  <p className="text-[10px] text-ink-muted">{cat.shareOfReworkPct.toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
