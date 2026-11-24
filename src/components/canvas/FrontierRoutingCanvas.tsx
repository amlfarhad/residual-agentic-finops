import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EnrichedTrace } from '../../App';

export interface FrontierControlNodes {
  /** 0..1 failure risk threshold at low stakes ($0) */
  lowStakesRisk: number;
  /** 0..1 failure risk threshold at mid stakes ($500) */
  midStakesRisk: number;
  /** 0..1 failure risk threshold at high stakes ($1000) */
  highStakesRisk: number;
}

interface FrontierRoutingCanvasProps {
  traces: EnrichedTrace[];
  nodes: FrontierControlNodes;
  onChangeNodes: (next: FrontierControlNodes) => void;
  reallocationRatio: number; // 0..1 shift along Pareto ridge
  selectedModelId: string;
  onSelectTrace: (trace: EnrichedTrace) => void;
}

const MAX_STAKES = 1000;

export function evaluateBoundaryRisk(stakes: number, nodes: FrontierControlNodes): number {
  const t = Math.min(1, Math.max(0, stakes / MAX_STAKES));
  // Quadratic Bezier interpolation across the 3 Prussian Cobalt control nodes
  const u = 1 - t;
  return (
    u * u * nodes.lowStakesRisk +
    2 * u * t * nodes.midStakesRisk +
    t * t * nodes.highStakesRisk
  );
}

export const FrontierRoutingCanvas: React.FC<FrontierRoutingCanvasProps> = ({
  traces,
  nodes,
  onChangeNodes,
  reallocationRatio,
  onSelectTrace,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 1100, height: 520 });
  const [draggingNode, setDraggingNode] = useState<keyof FrontierControlNodes | null>(null);
  const [hoveredTrace, setHoveredTrace] = useState<{
    trace: EnrichedTrace;
    x: number;
    y: number;
  } | null>(null);

  const padL = 68;
  const padR = 44;
  const padT = 32;
  const padB = 54;

  const plotW = Math.max(100, size.width - padL - padR);
  const plotH = Math.max(100, size.height - padT - padB);

  // X = Failure Risk (0..1), Y = Dollar Stakes ($0..$1000 bottom to top)
  const riskToX = useCallback(
    (risk: number) => padL + Math.min(1, Math.max(0, risk)) * plotW,
    [plotW]
  );
  const stakesToY = useCallback(
    (stakes: number) =>
      padT + (1 - Math.min(1, Math.max(0, stakes / MAX_STAKES))) * plotH,
    [plotH]
  );

  // Resize observer for crisp HiDPI rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(260, rect.height),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Paint Topographic Iso-Cost Elevation Contours + 3 Atmospheric Territories + Mineral Trace Specimens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, size.width, size.height);

    // 1. Atmospheric Territory Washes
    // Left of curve = Viridian Autonomous Zone
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    for (let i = 0; i <= 60; i++) {
      const s = (i / 60) * MAX_STAKES;
      const r = evaluateBoundaryRisk(s, nodes);
      ctx.lineTo(riskToX(r), stakesToY(s));
    }
    ctx.lineTo(padL, padT);
    ctx.closePath();
    const virGrad = ctx.createLinearGradient(padL, padT + plotH, padL + plotW * 0.65, padT);
    virGrad.addColorStop(0, 'rgba(13, 122, 95, 0.085)');
    virGrad.addColorStop(1, 'rgba(13, 122, 95, 0.015)');
    ctx.fillStyle = virGrad;
    ctx.fill();

    // Middle Escalation / Review Ribbon (Cobalt Band shifted by reallocationRatio)
    const bandWidthRisk = 0.14 + reallocationRatio * 0.08;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const s = (i / 60) * MAX_STAKES;
      const r = evaluateBoundaryRisk(s, nodes);
      const x = riskToX(r);
      const y = stakesToY(s);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = 60; i >= 0; i--) {
      const s = (i / 60) * MAX_STAKES;
      const r = Math.min(1, evaluateBoundaryRisk(s, nodes) + bandWidthRisk);
      ctx.lineTo(riskToX(r), stakesToY(s));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(26, 77, 143, 0.095)';
    ctx.fill();

    // Right of Escalation Ribbon = Human-First Carmine Territory
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const s = (i / 60) * MAX_STAKES;
      const r = Math.min(1, evaluateBoundaryRisk(s, nodes) + bandWidthRisk);
      const x = riskToX(r);
      const y = stakesToY(s);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(padL + plotW, padT);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.closePath();
    const carmGrad = ctx.createLinearGradient(padL + plotW * 0.45, padT + plotH, padL + plotW, padT);
    carmGrad.addColorStop(0, 'rgba(201, 42, 62, 0.03)');
    carmGrad.addColorStop(1, 'rgba(201, 42, 62, 0.12)');
    ctx.fillStyle = carmGrad;
    ctx.fill();
    ctx.restore();

    // 2. Topographic Iso-Cost Elevation Contour Rings (Expected Loss = risk * stakes)
    const contourLevels = [20, 50, 100, 175, 275, 420, 620];
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    for (const lossLevel of contourLevels) {
      ctx.beginPath();
      let started = false;
      for (let i = 1; i <= 90; i++) {
        const risk = i / 90;
        const stakes = lossLevel / risk;
        if (stakes <= MAX_STAKES * 1.05) {
          const x = riskToX(risk);
          const y = stakesToY(stakes);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.085)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Contour elevation label along upper-right ridge
      const labelRisk = Math.min(0.94, Math.max(0.12, Math.sqrt(lossLevel / MAX_STAKES)));
      const labelStakes = lossLevel / labelRisk;
      if (labelStakes > 35 && labelStakes < MAX_STAKES - 28) {
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(20, 20, 19, 0.36)';
        ctx.fillText(`$${lossLevel}`, riskToX(labelRisk) + 4, stakesToY(labelStakes) - 3);
      }
    }
    ctx.restore();

    // 3. Axes & Precision Museum Hairlines
    ctx.strokeStyle = 'rgba(20, 20, 19, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(20, 20, 19, 0.48)';
    ctx.textAlign = 'center';
    [0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((r) => {
      const x = riskToX(r);
      ctx.beginPath();
      ctx.moveTo(x, padT + plotH);
      ctx.lineTo(x, padT + plotH + 5);
      ctx.stroke();
      ctx.fillText(`${Math.round(r * 100)}%`, x, padT + plotH + 18);
    });

    ctx.textAlign = 'right';
    [0, 250, 500, 750, 1000].forEach((s) => {
      const y = stakesToY(s);
      ctx.beginPath();
      ctx.moveTo(padL - 5, y);
      ctx.lineTo(padL, y);
      ctx.stroke();
      ctx.fillText(`$${s}`, padL - 10, y + 3.5);
    });

    // Territory Labels Engraved Directly on Topographic Field
    ctx.save();
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(13, 122, 95, 0.8)';
    ctx.fillText('TERRITORY I · AUTONOMOUS AGENT', padL + 14, padT + plotH - 16);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(201, 42, 62, 0.82)';
    ctx.fillText('TERRITORY III · DIRECT HUMAN ROUTE', padL + plotW - 14, padT + 20);
    ctx.restore();

    // 4. Plot Real Production Traces as Mineral Specimens
    for (const t of traces) {
      const x = riskToX(t.predictedFailureRisk);
      const y = stakesToY(t.dollarStakes);
      const boundary = evaluateBoundaryRisk(t.dollarStakes, nodes);
      const inAuto = t.predictedFailureRisk <= boundary;
      const inEscalate =
        t.predictedFailureRisk > boundary &&
        t.predictedFailureRisk <= boundary + bandWidthRisk;

      const radius = t.hasFailure ? 4.2 : 3.0;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);

      if (t.hasFailure && inAuto) {
        // Missed fracture inside autonomous zone: Carmine specimen with halo
        ctx.fillStyle = 'rgba(201, 42, 62, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(201, 42, 62, 0.32)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (inEscalate) {
        ctx.fillStyle = t.hasFailure
          ? 'rgba(26, 77, 143, 0.92)'
          : 'rgba(26, 77, 143, 0.5)';
        ctx.fill();
      } else if (!inAuto) {
        ctx.fillStyle = t.hasFailure
          ? 'rgba(184, 107, 17, 0.82)'
          : 'rgba(82, 80, 75, 0.34)';
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(13, 122, 95, 0.72)';
        ctx.fill();
      }
    }

    // 5. Primary Prussian Cobalt Pareto Routing Boundary Ridge
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const s = (i / 80) * MAX_STAKES;
      const r = evaluateBoundaryRisk(s, nodes);
      const x = riskToX(r);
      const y = stakesToY(s);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#1A4D8F';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = 'rgba(26, 77, 143, 0.28)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Secondary Escalation Boundary Dashed Hairline
    ctx.shadowBlur = 0;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const s = (i / 80) * MAX_STAKES;
      const r = Math.min(1, evaluateBoundaryRisk(s, nodes) + bandWidthRisk);
      const x = riskToX(r);
      const y = stakesToY(s);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(26, 77, 143, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }, [size, traces, nodes, reallocationRatio, plotW, plotH, riskToX, stakesToY]);

  // Drag Prussian Cobalt boundary control nodes directly on the topographic curve
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggingNode) {
      const nextRisk = Math.min(0.92, Math.max(0.06, (mx - padL) / plotW));
      onChangeNodes({
        ...nodes,
        [draggingNode]: Number(nextRisk.toFixed(3)),
      });
      return;
    }

    // Specimen hover hit-test
    let nearest: EnrichedTrace | null = null;
    let bestDist = 14;
    for (const t of traces) {
      const dx = riskToX(t.predictedFailureRisk) - mx;
      const dy = stakesToY(t.dollarStakes) - my;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        nearest = t;
      }
    }
    if (nearest) {
      setHoveredTrace({
        trace: nearest,
        x: riskToX(nearest.predictedFailureRisk),
        y: stakesToY(nearest.dollarStakes),
      });
    } else {
      setHoveredTrace(null);
    }
  };

  const handlePointerUp = () => {
    setDraggingNode(null);
  };

  const controlHandles: Array<{
    key: keyof FrontierControlNodes;
    stakes: number;
    risk: number;
    label: string;
  }> = [
    { key: 'lowStakesRisk', stakes: 80, risk: evaluateBoundaryRisk(80, nodes), label: 'LOW STAKES' },
    { key: 'midStakesRisk', stakes: 500, risk: evaluateBoundaryRisk(500, nodes), label: 'PARETO KNEE' },
    { key: 'highStakesRisk', stakes: 920, risk: evaluateBoundaryRisk(920, nodes), label: 'HIGH STAKES' },
  ];

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => {
        if (!draggingNode && hoveredTrace) {
          onSelectTrace(hoveredTrace.trace);
        }
      }}
      className="relative w-full h-full select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Axis Plate Captions */}
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 plate-caption">
        PREDICTED FAILURE PROBABILITY P(FRACTURE | TRACE FEATURES)
      </div>
      <div
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center plate-caption whitespace-nowrap"
      >
        ECONOMIC STAKES ($ / TASK)
      </div>

      {/* Directly Draggable Prussian Cobalt Boundary Control Nodes */}
      {controlHandles.map((h) => {
        const cx = riskToX(h.risk);
        const cy = stakesToY(h.stakes);
        const active = draggingNode === h.key;
        return (
          <div
            key={h.key}
            role="slider"
            tabIndex={0}
            aria-label={`Drag ${h.label} routing boundary`}
            aria-valuemin={6}
            aria-valuemax={92}
            aria-valuenow={Math.round(h.risk * 100)}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setDraggingNode(h.key);
            }}
            onPointerUp={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              setDraggingNode(null);
            }}
            style={{ left: `${cx}px`, top: `${cy}px` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-ew-resize group flex items-center gap-2 focus:outline-none`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-cobalt border-2 border-alabaster-vellum shadow-md flex items-center justify-center transition-transform duration-150 ${
                active ? 'scale-125 ring-4 ring-cobalt/25' : 'group-hover:scale-115'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-alabaster-vellum" />
            </div>
            <span className="pointer-events-none px-1.5 py-0.5 rounded optical-glass font-mono text-[9.5px] font-semibold text-cobalt tabular-nums-strict whitespace-nowrap">
              {Math.round(h.risk * 100)}%
            </span>
          </div>
        );
      })}

      {/* Floating Mineral Specimen Hover Tooltip */}
      {hoveredTrace && !draggingNode && (
        <div
          style={{
            left: `${Math.min(size.width - 230, hoveredTrace.x + 14)}px`,
            top: `${Math.max(12, hoveredTrace.y - 62)}px`,
          }}
          className="pointer-events-none absolute z-30 optical-glass rounded-xl px-3.5 py-2.5 text-[11px] font-mono tabular-nums-strict w-56"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sumi">{hoveredTrace.trace.id}</span>
            <span
              className={
                hoveredTrace.trace.hasFailure ? 'text-carmine font-semibold' : 'text-viridian'
              }
            >
              {hoveredTrace.trace.hasFailure ? hoveredTrace.trace.failureTaxonomy : 'CLEAN'}
            </span>
          </div>
          <div className="mt-1 text-sumi/65 flex justify-between">
            <span>Risk: {(hoveredTrace.trace.predictedFailureRisk * 100).toFixed(1)}%</span>
            <span>Stakes: ${hoveredTrace.trace.dollarStakes.toFixed(0)}</span>
          </div>
          <div className="mt-0.5 text-sumi/65 flex justify-between">
            <span>True Cost: ${hoveredTrace.trace.trueUnitCost.toFixed(2)}</span>
            <span className="text-cobalt">Click to Autopsy</span>
          </div>
        </div>
      )}
    </div>
  );
};
