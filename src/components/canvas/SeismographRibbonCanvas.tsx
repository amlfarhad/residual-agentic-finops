import React, { useRef, useEffect, useState } from 'react';
import { EnrichedTrace } from '../../App';

interface SeismographRibbonCanvasProps {
  traces: EnrichedTrace[];
  selectedTraceId: string | null;
  onSelectTrace: (trace: EnrichedTrace) => void;
}

export const SeismographRibbonCanvas: React.FC<SeismographRibbonCanvasProps> = ({
  traces,
  selectedTraceId,
  onSelectTrace,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 290 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(210, rect.height),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Slice visible forensic ribbon window (up to 72 traces across horizontal seismograph)
  const visibleTraces = traces.slice(0, 72);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padX = 36;
    const baselineY = size.height * 0.56;
    const maxTokens = Math.max(
      12000,
      ...visibleTraces.map((t) => t.inputTokens + t.outputTokens)
    );
    const maxRework = Math.max(
      12,
      ...visibleTraces.map((t) => t.humanReworkCost)
    );

    const render = (time: number) => {
      ctx.clearRect(0, 0, size.width, size.height);

      // Horizontal Acoustic Zero-Line & Subtle Calibrated Guides
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX, baselineY);
      ctx.lineTo(size.width - padX, baselineY);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.065)';
      [0.24, 0.4, 0.74, 0.88].forEach((ratio) => {
        ctx.beginPath();
        ctx.moveTo(padX, size.height * ratio);
        ctx.lineTo(size.width - padX, size.height * ratio);
        ctx.stroke();
      });
      ctx.restore();

      const count = Math.max(1, visibleTraces.length);
      const stepX = (size.width - padX * 2) / Math.max(1, count - 1);

      // Continuous Seismic Carrier Pulse Wave
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const t = visibleTraces[i];
        const x = padX + i * stepX;
        const tokRatio = (t.inputTokens + t.outputTokens) / maxTokens;
        const tremor = Math.sin(time * 0.003 + i * 0.7) * (t.hasFailure ? 2.8 : 0.9);
        const y = baselineY - tokRatio * (size.height * 0.36) + tremor;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.22)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Draw Acoustic Token Skyline (Upward) + Retry Coils + Carmine Fracture Vectors (Downward)
      for (let i = 0; i < count; i++) {
        const t = visibleTraces[i];
        const x = padX + i * stepX;
        const isSelected = t.id === selectedTraceId;
        const isHovered = hoveredIdx === i;

        const tokHeight = Math.max(
          8,
          ((t.inputTokens + t.outputTokens) / maxTokens) * (size.height * 0.38)
        );

        // Upward acoustic token skyline bar
        ctx.beginPath();
        ctx.moveTo(x, baselineY);
        ctx.lineTo(x, baselineY - tokHeight);
        ctx.strokeStyle = isSelected
          ? '#141413'
          : t.hasFailure
          ? 'rgba(201, 42, 62, 0.76)'
          : 'rgba(13, 122, 95, 0.65)';
        ctx.lineWidth = isSelected || isHovered ? 3.2 : 1.8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Tool Execution Node Bead at Peak
        ctx.beginPath();
        ctx.arc(x, baselineY - tokHeight, isSelected ? 4.2 : 2.3, 0, Math.PI * 2);
        ctx.fillStyle = t.hasFailure ? '#C92A3E' : '#0D7A5F';
        ctx.fill();

        // Coiled Amber Retry Loops right on baseline
        if (t.retryCount > 0) {
          const coilRadius = Math.min(9, 3.2 + t.retryCount * 1.4);
          ctx.beginPath();
          ctx.arc(x, baselineY, coilRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(184, 107, 17, 0.72)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Jagged Carmine Fracture Vector stretching downward into Realized Human Rework Block
        if (t.hasFailure && t.humanReworkCost > 0) {
          const depth = Math.max(
            18,
            (t.humanReworkCost / maxRework) * (size.height * 0.34)
          );
          const jag = 3.5;

          ctx.beginPath();
          ctx.moveTo(x, baselineY + 2);
          ctx.lineTo(x - jag, baselineY + depth * 0.32);
          ctx.lineTo(x + jag, baselineY + depth * 0.64);
          ctx.lineTo(x, baselineY + depth);
          ctx.strokeStyle = isSelected
            ? '#991B2C'
            : 'rgba(201, 42, 62, 0.85)';
          ctx.lineWidth = isSelected || isHovered ? 2.4 : 1.4;
          ctx.stroke();

          // Realized Human Rework Anchor Block
          ctx.fillStyle = isSelected ? '#C92A3E' : 'rgba(201, 42, 62, 0.65)';
          ctx.fillRect(x - 3.5, baselineY + depth, 7, 4.5);
        }

        // Optical Selection Reticle
        if (isSelected || isHovered) {
          ctx.save();
          ctx.strokeStyle = isSelected
            ? 'rgba(20, 20, 19, 0.36)'
            : 'rgba(20, 20, 19, 0.18)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, 12);
          ctx.lineTo(x, size.height - 12);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Plate Legend Micro-Labels
      ctx.font = '600 9.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(13, 122, 95, 0.8)';
      ctx.textAlign = 'left';
      ctx.fillText('▲ ACOUSTIC TOKEN SKYLINE & TOOL NODES', padX, 18);

      ctx.fillStyle = 'rgba(201, 42, 62, 0.82)';
      ctx.fillText(
        '▼ JAGGED FRACTURE VECTORS → REALIZED HUMAN REWORK DEPTH',
        padX,
        size.height - 10
      );

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [size, visibleTraces, selectedTraceId, hoveredIdx]);

  const indexFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el || visibleTraces.length === 0) return null;
    const rect = el.getBoundingClientRect();
    const padX = 36;
    const ratio = (clientX - rect.left - padX) / Math.max(1, rect.width - padX * 2);
    const idx = Math.round(ratio * (visibleTraces.length - 1));
    if (idx < 0 || idx >= visibleTraces.length) return null;
    return idx;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => setHoveredIdx(indexFromClientX(e.clientX))}
      onMouseLeave={() => setHoveredIdx(null)}
      onClick={(e) => {
        const idx = indexFromClientX(e.clientX);
        if (idx !== null && visibleTraces[idx]) {
          onSelectTrace(visibleTraces[idx]);
        }
      }}
      className="relative w-full h-full cursor-crosshair select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {hoveredIdx !== null && visibleTraces[hoveredIdx] && (
        <div className="pointer-events-none absolute top-3 right-9 optical-glass rounded-xl px-3.5 py-2 text-[11px] font-mono tabular-nums-strict">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sumi">
              {visibleTraces[hoveredIdx].id}
            </span>
            <span
              className={
                visibleTraces[hoveredIdx].hasFailure
                  ? 'text-carmine font-semibold'
                  : 'text-viridian'
              }
            >
              {visibleTraces[hoveredIdx].failureTaxonomy}
            </span>
          </div>
          <div className="text-sumi/60 mt-0.5">
            {(
              visibleTraces[hoveredIdx].inputTokens +
              visibleTraces[hoveredIdx].outputTokens
            ).toLocaleString()}{' '}
            tok · {visibleTraces[hoveredIdx].retryCount} retries · True $
            {visibleTraces[hoveredIdx].trueUnitCost.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};
