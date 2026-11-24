import React, { useRef, useEffect } from 'react';
import {
  T_MAX_HOURS,
  cutoffHoursToU,
  type SettlementTimelineIndex,
} from '../../engine/settlementTimeline';
import {
  PRISM_MIN_X,
  PRISM_MAX_X,
  cutoffHoursToViewportX,
} from '../shell/OpticalCurtainOverlay';
import type { EnrichedTrace } from '../../App';

interface FractureFlowCanvasProps {
  cutoffHours: number;
  traces: EnrichedTrace[];
  timeline: SettlementTimelineIndex;
  onSelectStream?: (stream: 'clean' | 'fracture') => void;
}

interface KineticSpecimen {
  x: number; // 0..1 normalized across viewport
  speed: number;
  offsetY: number;
  phase: number;
  radius: number;
  alpha: number;
  isFractured: boolean;
  discoveryHours: number; // Infinity for clean traces, [0.5, 335.5] for fractured
  discoveryXRatio: number; // exact viewport X where this trace fractures when horizon passes
  trail: Array<{ x: number; y: number }>;
}

interface FractureRipple {
  xRatio: number;
  yRatio: number;
  bornAt: number;
  durationMs: number;
  intensity: number;
}

export const FractureFlowCanvas: React.FC<FractureFlowCanvasProps> = ({
  cutoffHours,
  traces,
  timeline,
  onSelectStream,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cutoffHoursRef = useRef<number>(cutoffHours);
  const prevCutoffHoursRef = useRef<number>(cutoffHours);
  const ripplesRef = useRef<FractureRipple[]>([]);
  const timelineRef = useRef<SettlementTimelineIndex>(timeline);
  const tracesRef = useRef<EnrichedTrace[]>(traces);

  // Detect trace batches crossing the actuarial horizon to spawn 240ms radial fracture ripples
  useEffect(() => {
    const prevT = prevCutoffHoursRef.current;
    const nextT = cutoffHours;
    cutoffHoursRef.current = nextT;
    prevCutoffHoursRef.current = nextT;

    if (nextT > prevT) {
      const now = performance.now();
      const fractures = timeline.sortedFractures;
      let spawned = 0;
      for (let i = 0; i < fractures.length; i++) {
        const f = fractures[i];
        if (f.discoveryHours > prevT && f.discoveryHours <= nextT) {
          const xRatio =
            PRISM_MIN_X + f.discoveryU * (PRISM_MAX_X - PRISM_MIN_X);
          ripplesRef.current.push({
            xRatio,
            yRatio: 0.49 + (((i * 37) % 11) - 5) * 0.004,
            bornAt: now,
            durationMs: 240,
            intensity: Math.min(1.4, 0.7 + f.hiddenReworkCost * 0.08),
          });
          spawned++;
          if (spawned >= 14) break;
        }
      }
      if (ripplesRef.current.length > 48) {
        ripplesRef.current.splice(0, ripplesRef.current.length - 48);
      }
    }
  }, [cutoffHours, timeline]);

  timelineRef.current = timeline;
  tracesRef.current = traces;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Seed 168 deterministic kinetic specimens bound 1:1 to real production traces
    const PARTICLE_COUNT = 168;
    const specimens: KineticSpecimen[] = [];

    const createSpecimen = (idx: number, initialX?: number): KineticSpecimen => {
      const currentTraces = tracesRef.current;
      const currentTimeline = timelineRef.current;
      const source =
        currentTraces.length > 0
          ? currentTraces[idx % currentTraces.length]
          : null;

      const discHours = source
        ? currentTimeline.discoveryByTraceId.get(source.id) ??
          Number.POSITIVE_INFINITY
        : Number.POSITIVE_INFINITY;
      const isFractured = Number.isFinite(discHours);
      const discU = isFractured ? cutoffHoursToU(discHours) : 1.05;
      const discoveryXRatio =
        PRISM_MIN_X + discU * (PRISM_MAX_X - PRISM_MIN_X);

      return {
        x: initialX !== undefined ? initialX : -Math.random() * 0.14,
        speed: 0.00145 + (idx % 17) * 0.00009,
        offsetY: (((idx * 29) % 100) / 100 - 0.5) * 34,
        phase: (idx * 0.6180339) * Math.PI * 2,
        radius: isFractured ? 2.1 + (idx % 4) * 0.42 : 1.55 + (idx % 3) * 0.35,
        alpha: 0.42 + ((idx * 13) % 50) / 100,
        isFractured,
        discoveryHours: discHours,
        discoveryXRatio,
        trail: [],
      };
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      specimens.push(createSpecimen(i, i / PARTICLE_COUNT));
    }

    const upperStreamY = () => height * 0.49;
    const cleanStreamY = () => height * 0.38;
    const fractureStreamY = () => height * 0.74;

    const computeSpecimenY = (
      s: KineticSpecimen,
      time: number,
      currentCutoff: number
    ): { y: number; state: 'clean' | 'surfaced-fracture' | 'ibnr-ghost' } => {
      const uY = upperStreamY();
      const wave = Math.sin(s.x * 7.2 + s.phase + time * 0.0014) * 4.5;

      // Clean traces glide upward gently into the Viridian resolution corridor
      if (!s.isFractured) {
        const cleanEase = Math.max(0, Math.min(1, (s.x - 0.1) / 0.65));
        const smooth = cleanEase * cleanEase * (3 - 2 * cleanEase);
        const y = uY + (cleanStreamY() - uY) * smooth + s.offsetY * 0.55 + wave * 0.55;
        return { y, state: 'clean' };
      }

      // Fractured trace with t_i <= T_cutoff: fractures downward into Carmine rework stream at x(t_i)
      if (s.discoveryHours <= currentCutoff) {
        if (s.x <= s.discoveryXRatio) {
          return {
            y: uY + s.offsetY * 0.45 + wave * 0.5,
            state: 'surfaced-fracture',
          };
        }
        const dist = Math.min(
          1,
          (s.x - s.discoveryXRatio) / Math.max(0.18, 0.96 - s.discoveryXRatio)
        );
        const ease = dist * dist * (3 - 2 * dist);
        const tremor = Math.sin(dist * 15 + s.phase + time * 0.004) * 6.5 * ease;
        const y =
          uY +
          (fractureStreamY() - uY) * ease +
          s.offsetY * (0.45 + 0.65 * ease) +
          tremor;
        return { y, state: 'surfaced-fracture' };
      }

      // Fractured trace with t_i > T_cutoff: continues along upper stream as dashed Amber IBNR ghost preview
      const ghostDrift = Math.sin(s.x * 11 + s.phase + time * 0.0022) * 3.8;
      return {
        y: uY + s.offsetY * 0.48 + ghostDrift,
        state: 'ibnr-ghost',
      };
    };

    const drawAtmosphericRibbons = (
      currentCutoff: number,
      bladeX: number,
      time: number
    ) => {
      const uY = upperStreamY();
      const cY = cleanStreamY();
      const fY = fractureStreamY();
      const surfacedRatio = Math.min(1, currentCutoff / T_MAX_HOURS);

      // Upper Clean Viridian Stream Band
      const virGrad = ctx.createLinearGradient(0, uY, width, cY);
      virGrad.addColorStop(0, 'rgba(13, 122, 95, 0.025)');
      virGrad.addColorStop(0.55, 'rgba(13, 122, 95, 0.065)');
      virGrad.addColorStop(1, 'rgba(13, 122, 95, 0.025)');
      ctx.beginPath();
      ctx.moveTo(0, uY - 22);
      ctx.bezierCurveTo(width * 0.35, uY - 24, width * 0.6, cY - 22, width, cY - 20);
      ctx.lineTo(width, cY + 22);
      ctx.bezierCurveTo(width * 0.6, cY + 20, width * 0.35, uY + 12, 0, uY + 18);
      ctx.closePath();
      ctx.fillStyle = virGrad;
      ctx.fill();

      // Dashed Amber IBNR Ghost Corridor Right of Blade (Unobserved Latent Bleed)
      if (currentCutoff < T_MAX_HOURS - 0.5) {
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -(time * 0.02);
        ctx.strokeStyle = 'rgba(184, 107, 17, 0.34)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bladeX, uY);
        ctx.lineTo(width, uY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(184, 107, 17, 0.055)';
        ctx.fillRect(bladeX, uY - 14, width - bladeX, 28);
        ctx.restore();
      }

      // Dynamic Carmine Fracture Ribbon (Grows smoothly as T_cutoff sweeps right)
      if (currentCutoff > 0.5) {
        const startX = width * PRISM_MIN_X;
        const activeSpan = Math.max(24, bladeX - startX);
        const carmGrad = ctx.createLinearGradient(startX, uY, width, fY);
        carmGrad.addColorStop(0, 'rgba(201, 42, 62, 0.04)');
        carmGrad.addColorStop(0.45, `rgba(201, 42, 62, ${0.09 + surfacedRatio * 0.1})`);
        carmGrad.addColorStop(1, `rgba(184, 107, 17, ${0.07 + surfacedRatio * 0.08})`);

        const breathe = Math.sin(time * 0.0014) * 3;
        ctx.beginPath();
        ctx.moveTo(startX, uY + 4);
        ctx.bezierCurveTo(
          startX + activeSpan * 0.5,
          uY + 14,
          bladeX + (width - bladeX) * 0.25,
          fY - 28 + breathe,
          width,
          fY - 30 + breathe
        );
        ctx.lineTo(width, fY + 28 - breathe);
        ctx.bezierCurveTo(
          bladeX + (width - bladeX) * 0.2,
          fY + 24 - breathe,
          startX + activeSpan * 0.4,
          uY + 28,
          startX,
          uY + 18
        );
        ctx.closePath();
        ctx.fillStyle = carmGrad;
        ctx.fill();
      }
    };

    const drawFractureRipples = (now: number) => {
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        const age = now - rip.bornAt;
        if (age >= rip.durationMs) {
          ripples.splice(i, 1);
          continue;
        }
        const progress = age / rip.durationMs;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const cx = rip.xRatio * width;
        const cy = rip.yRatio * height;
        const radius = (6 + easeOut * 34) * rip.intensity;
        const alpha = (1 - progress) * 0.72;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201, 42, 62, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 2 * (1 - progress * 0.5);
        ctx.stroke();

        // Inner hot core flash
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 42, 62, ${(alpha * 0.45).toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }
    };

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      const currentCutoff = cutoffHoursRef.current;
      const bladeXRatio = cutoffHoursToViewportX(currentCutoff);
      const bladeX = bladeXRatio * width;

      drawAtmosphericRibbons(currentCutoff, bladeX, time);

      // Update and render kinetic specimens
      for (let i = 0; i < specimens.length; i++) {
        const s = specimens[i];
        s.x += s.speed;
        if (s.x > 1.04) {
          specimens[i] = createSpecimen(i, -0.02);
          continue;
        }

        const { y, state } = computeSpecimenY(s, time, currentCutoff);
        const px = s.x * width;

        s.trail.push({ x: px, y });
        if (s.trail.length > 13) s.trail.shift();

        if (state === 'clean') {
          if (s.trail.length > 2) {
            ctx.beginPath();
            ctx.moveTo(s.trail[0].x, s.trail[0].y);
            for (let j = 1; j < s.trail.length; j++) {
              ctx.lineTo(s.trail[j].x, s.trail[j].y);
            }
            ctx.strokeStyle = `rgba(13, 122, 95, ${(s.alpha * 0.44).toFixed(3)})`;
            ctx.lineWidth = s.radius * 0.68;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(px, y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(13, 122, 95, ${(s.alpha * 0.85).toFixed(3)})`;
          ctx.fill();
        } else if (state === 'ibnr-ghost') {
          // Dashed Amber IBNR Ghost Preview continuing along upper stream until prism blade hits t_i
          if (s.trail.length > 2) {
            ctx.save();
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(s.trail[0].x, s.trail[0].y);
            for (let j = 1; j < s.trail.length; j++) {
              ctx.lineTo(s.trail[j].x, s.trail[j].y);
            }
            ctx.strokeStyle = `rgba(184, 107, 17, ${(s.alpha * 0.62).toFixed(3)})`;
            ctx.lineWidth = 1.25;
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(px, y, s.radius + 1.4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(184, 107, 17, ${(s.alpha * 0.85).toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
          ctx.restore();

          ctx.beginPath();
          ctx.arc(px, y, s.radius * 0.65, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(184, 107, 17, ${(s.alpha * 0.55).toFixed(3)})`;
          ctx.fill();
        } else {
          // Realized Carmine Fracture Specimen (t_i <= T_cutoff)
          const hasFracturedSpatially = s.x >= s.discoveryXRatio;
          if (s.trail.length > 2) {
            ctx.beginPath();
            ctx.moveTo(s.trail[0].x, s.trail[0].y);
            for (let j = 1; j < s.trail.length; j++) {
              ctx.lineTo(s.trail[j].x, s.trail[j].y);
            }
            ctx.strokeStyle = hasFracturedSpatially
              ? `rgba(201, 42, 62, ${(s.alpha * 0.66).toFixed(3)})`
              : `rgba(82, 80, 75, ${(s.alpha * 0.42).toFixed(3)})`;
            ctx.lineWidth = s.radius * 0.78;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(px, y, s.radius, 0, Math.PI * 2);
          ctx.fillStyle = hasFracturedSpatially
            ? `rgba(201, 42, 62, ${Math.min(1, s.alpha * 0.98).toFixed(3)})`
            : `rgba(82, 80, 75, ${(s.alpha * 0.65).toFixed(3)})`;
          ctx.fill();
        }
      }

      // Draw 240ms radial fracture ripples at horizon crossing points
      drawFractureRipples(time);

      // Right-margin painted stream labels
      ctx.save();
      ctx.font = '600 9.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      const rightPad = width - 28;

      ctx.fillStyle = 'rgba(13, 122, 95, 0.82)';
      ctx.fillText('VIRIDIAN CLEAN STREAM', rightPad, cleanStreamY() - 26);

      if (currentCutoff < T_MAX_HOURS - 1) {
        ctx.fillStyle = 'rgba(184, 107, 17, 0.85)';
        ctx.fillText(
          'DASHED AMBER · LATENT IBNR GHOSTS',
          rightPad,
          upperStreamY() - 18
        );
      }

      if (currentCutoff > 1) {
        ctx.fillStyle = 'rgba(201, 42, 62, 0.88)';
        ctx.fillText(
          `REALIZED CARMINE REWORK (T ≤ ${Math.round(currentCutoff)}h)`,
          rightPad,
          fractureStreamY() - 34
        );
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [timeline]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectStream || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    onSelectStream(relY < 0.52 ? 'clean' : 'fracture');
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
    />
  );
};
