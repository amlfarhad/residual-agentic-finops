import React, { useRef, useEffect, useState } from 'react';
import type { WaterlineTask, PlumbHoverState } from '../../types/waterline';

interface WaterlineTankCanvasProps {
  tasks: WaterlineTask[];
  cutoffHours: number;
  hoveredTaskId: string | null;
  onHoverTask: (hover: PlumbHoverState | null) => void;
  onSelectTask: (task: WaterlineTask) => void;
}

interface AnimatedPlumb {
  currentDepthRatio: number;
  wasSubmerged: boolean;
  rippleAgeMs: number | null;
}

// Meniscus rests at 35% height: generous room above for header + draggable pill,
// and generous room below for plumb-lines to stop cleanly 65px+ above bottom typography.
export const WATERLINE_Y_RATIO = 0.35;

// Strict safe floor preserving bottom monument numeral, subtext, AND >=64px clear whitespace
const BOTTOM_TYPOGRAPHY_SAFE_RESERVE = 224;
const BOB_CLEARANCE_BELOW_CENTER = 36; // max bob radius (19px) + "+$38" label (17px)

export const WaterlineTankCanvas: React.FC<WaterlineTankCanvasProps> = ({
  tasks,
  cutoffHours,
  hoveredTaskId,
  onHoverTask,
  onSelectTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tasksRef = useRef(tasks);
  const cutoffRef = useRef(cutoffHours);
  const hoveredIdRef = useRef(hoveredTaskId);
  const animStateRef = useRef<Map<string, AnimatedPlumb>>(new Map());
  const [size, setSize] = useState({ width: 1280, height: 680 });

  tasksRef.current = tasks;
  cutoffRef.current = cutoffHours;
  hoveredIdRef.current = hoveredTaskId;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(420, rect.height),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getTaskSlotX = (idx: number, count: number, width: number) => {
    const padX = count <= 6 ? Math.max(96, width * 0.14) : Math.max(66, width * 0.068);
    if (count <= 1) return width * 0.5;
    return padX + (idx / (count - 1)) * (width - padX * 2);
  };

  // Clamped maximum vertical drop so even the $38 plumb bob + label NEVER collides with bottom text
  const getSafeDepthSpan = (height: number) => {
    const waterlineY = height * WATERLINE_Y_RATIO;
    const maxSafeBobCenterY =
      height - BOTTOM_TYPOGRAPHY_SAFE_RESERVE - BOB_CLEARANCE_BELOW_CENTER;
    return Math.max(64, maxSafeBobCenterY - waterlineY);
  };

  const getMaxPlumbLength = (costUsd: number, height: number) => {
    const safeSpan = getSafeDepthSpan(height);
    const normalized = Math.min(1, Math.max(0.22, costUsd / 38));
    return Math.max(42, safeSpan * normalized);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const render = (now: number) => {
      const dt = Math.min(40, now - lastTime);
      lastTime = now;

      const W = size.width;
      const H = size.height;
      const waterY = H * WATERLINE_Y_RATIO;
      const safeDepthSpan = getSafeDepthSpan(H);
      const currentTasks = tasksRef.current;
      const currentCutoff = cutoffRef.current;
      const activeHover = hoveredIdRef.current;

      ctx.clearRect(0, 0, W, H);

      // 1. ABOVE THE WATERLINE: Sunlit Airy Paper (#FAF8F4)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, waterY);
      skyGrad.addColorStop(0, '#FAF8F4');
      skyGrad.addColorStop(1, '#F4F0E8');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, waterY);

      // 2. BELOW THE WATERLINE: Submerged Atmospheric Bathymetry
      const depthGrad = ctx.createLinearGradient(0, waterY, 0, H);
      depthGrad.addColorStop(0, '#E9E5DC');
      depthGrad.addColorStop(0.2, '#CFC6BC');
      depthGrad.addColorStop(0.52, '#5F4C47');
      depthGrad.addColorStop(0.76, '#28201E');
      depthGrad.addColorStop(1, '#171311');
      ctx.fillStyle = depthGrad;
      ctx.fillRect(0, waterY, W, H - waterY);

      // Calibrated Depth Scale Hairlines strictly within the safe plumb-line corridor
      ctx.save();
      ctx.setLineDash([2, 7]);
      ctx.lineWidth = 1;
      [10, 20, 30, 38].forEach((dollars) => {
        const y = waterY + safeDepthSpan * (dollars / 38);
        ctx.strokeStyle =
          dollars >= 25
            ? 'rgba(250, 248, 244, 0.1)'
            : 'rgba(23, 22, 20, 0.09)';
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(W - 28, y);
        ctx.stroke();

        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle =
          dollars >= 20
            ? 'rgba(250, 248, 244, 0.36)'
            : 'rgba(23, 22, 20, 0.38)';
        ctx.textAlign = 'right';
        ctx.fillText(`+$${dollars} fix`, W - 28, y - 4);
      });
      ctx.restore();

      // Subtle Caustic Light Shimmer directly beneath meniscus
      ctx.save();
      const causticGrad = ctx.createLinearGradient(0, waterY, 0, waterY + 58);
      causticGrad.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
      causticGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = causticGrad;
      ctx.fillRect(0, waterY, W, 58);
      ctx.restore();

      // 3. LIVING WATERLINE MENISCUS
      ctx.save();
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const ripple =
          Math.sin(x * 0.011 + now * 0.0014) * 1.7 +
          Math.cos(x * 0.023 - now * 0.001) * 0.8;
        if (x === 0) ctx.moveTo(x, waterY + ripple);
        else ctx.lineTo(x, waterY + ripple);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(23, 22, 20, 0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 4. RENDER TASKS (Floating Surface Capsules + Clamped Submerged Plumb-Lines)
      const animMap = animStateRef.current;

      for (let i = 0; i < currentTasks.length; i++) {
        const task = currentTasks[i];
        const x = getTaskSlotX(i, currentTasks.length, W);
        const bobOffset = Math.sin(now * 0.0019 + i * 0.85) * 2.2;
        const surfaceY = waterY + bobOffset;

        let state = animMap.get(task.id);
        if (!state) {
          state = {
            currentDepthRatio: 0,
            wasSubmerged: false,
            rippleAgeMs: null,
          };
          animMap.set(task.id, state);
        }

        const isSurfacedFailure = task.failed && task.discoveryHours <= currentCutoff;
        const targetRatio = isSurfacedFailure ? 1 : 0;

        if (isSurfacedFailure && !state.wasSubmerged) {
          state.rippleAgeMs = 0;
        }
        state.wasSubmerged = isSurfacedFailure;

        const speed = targetRatio > state.currentDepthRatio ? 0.0095 : 0.014;
        state.currentDepthRatio +=
          (targetRatio - state.currentDepthRatio) * Math.min(1, dt * speed);
        if (Math.abs(targetRatio - state.currentDepthRatio) < 0.002) {
          state.currentDepthRatio = targetRatio;
        }

        if (state.rippleAgeMs !== null) {
          state.rippleAgeMs += dt;
          if (state.rippleAgeMs > 520) state.rippleAgeMs = null;
        }

        const isHovered = activeHover === task.id;
        const dimOthers = activeHover !== null && !isHovered;
        const opacity = dimOthers ? 0.34 : 1;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Meniscus breakthrough ripple
        if (state.rippleAgeMs !== null) {
          const p = state.rippleAgeMs / 520;
          ctx.beginPath();
          ctx.ellipse(x, waterY, 10 + p * 42, 3 + p * 8, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(196, 43, 62, ${(1 - p) * 0.65})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Weighted Submerged Plumb-Line (Strictly Clamped Above Bottom Typography)
        if (state.currentDepthRatio > 0.01) {
          const maxLen = getMaxPlumbLength(task.humanCleanupCostUsd, H);
          const len = maxLen * state.currentDepthRatio;
          const bobX =
            x + Math.sin(now * 0.0014 + i * 1.1) * (1.6 * state.currentDepthRatio);
          const bobY = surfaceY + len;

          const cordGrad = ctx.createLinearGradient(x, surfaceY, bobX, bobY);
          cordGrad.addColorStop(0, 'rgba(196, 43, 62, 0.35)');
          cordGrad.addColorStop(0.55, 'rgba(196, 43, 62, 0.78)');
          cordGrad.addColorStop(1, 'rgba(242, 100, 118, 0.96)');

          ctx.beginPath();
          ctx.moveTo(x, surfaceY + 6);
          ctx.quadraticCurveTo(x, surfaceY + len * 0.5, bobX, bobY - 10);
          ctx.strokeStyle = cordGrad;
          ctx.lineWidth = isHovered ? 2.8 : 1.75;
          ctx.stroke();

          const bobRadius = 10 + Math.min(8, (task.humanCleanupCostUsd / 38) * 8);
          const glow = ctx.createRadialGradient(
            bobX,
            bobY,
            2,
            bobX,
            bobY,
            bobRadius * 2.1
          );
          glow.addColorStop(
            0,
            isHovered ? 'rgba(242, 100, 118, 0.48)' : 'rgba(196, 43, 62, 0.28)'
          );
          glow.addColorStop(1, 'rgba(196, 43, 62, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(bobX, bobY, bobRadius * 2.1, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
          const bobGrad = ctx.createRadialGradient(
            bobX - bobRadius * 0.3,
            bobY - bobRadius * 0.35,
            2,
            bobX,
            bobY,
            bobRadius
          );
          bobGrad.addColorStop(0, '#F6808F');
          bobGrad.addColorStop(0.55, '#C42B3E');
          bobGrad.addColorStop(1, '#7A1624');
          ctx.fillStyle = bobGrad;
          ctx.fill();

          ctx.strokeStyle = isHovered
            ? 'rgba(250, 248, 244, 0.96)'
            : 'rgba(250, 248, 244, 0.48)';
          ctx.lineWidth = isHovered ? 2 : 1.2;
          ctx.stroke();

          if (state.currentDepthRatio > 0.45) {
            ctx.font = isHovered
              ? '600 11.5px "JetBrains Mono", monospace'
              : '600 10.5px "JetBrains Mono", monospace';
            ctx.fillStyle = '#FAF8F4';
            ctx.textAlign = 'center';
            ctx.fillText(
              `+$${task.humanCleanupCostUsd.toFixed(0)}`,
              bobX,
              bobY + bobRadius + 15
            );
          }
        }

        // SURFACE FLOATING CAPSULE
        const capsuleW = Math.min(
          84,
          Math.max(54, (W - 150) / Math.max(1, currentTasks.length) - 8)
        );
        const capsuleH = 22;
        const capX = x - capsuleW / 2;
        const capY = surfaceY - capsuleH - 8;

        ctx.beginPath();
        ctx.moveTo(x, surfaceY - 8);
        ctx.lineTo(x, surfaceY + 2);
        ctx.strokeStyle = isSurfacedFailure
          ? 'rgba(196, 43, 62, 0.45)'
          : 'rgba(14, 124, 97, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, surfaceY, isHovered ? 5 : 3.8, 0, Math.PI * 2);
        ctx.fillStyle = isSurfacedFailure ? '#C42B3E' : '#0E7C61';
        ctx.fill();
        ctx.strokeStyle = '#FAF8F4';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(capX, capY, capsuleW, capsuleH, 11);
        ctx.fillStyle = isHovered
          ? '#171614'
          : isSurfacedFailure
          ? 'rgba(250, 248, 244, 0.96)'
          : 'rgba(250, 248, 244, 0.92)';
        ctx.fill();
        ctx.strokeStyle = isHovered
          ? '#171614'
          : isSurfacedFailure
          ? 'rgba(196, 43, 62, 0.45)'
          : 'rgba(14, 124, 97, 0.38)';
        ctx.lineWidth = isHovered ? 1.5 : 1;
        ctx.stroke();

        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = isHovered
          ? '#FAF8F4'
          : isSurfacedFailure
          ? '#9A1D2D'
          : '#0E7C61';
        ctx.textAlign = 'center';
        ctx.fillText(`$${task.tokenCostUsd.toFixed(2)}`, x, capY + 14.5);

        if (W >= 760 || isHovered) {
          ctx.font = isHovered
            ? '600 10.5px "Plus Jakarta Sans", sans-serif'
            : '500 9.5px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = isHovered ? '#171614' : 'rgba(23, 22, 20, 0.62)';
          ctx.textAlign = 'center';
          const labelY = capY - (i % 2 === 0 ? 7 : 20);
          ctx.fillText(task.shortLabel, x, labelY);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [size]);

  const hitTestTask = (clientX: number, clientY: number): PlumbHoverState | null => {
    const el = containerRef.current;
    if (!el || tasks.length === 0) return null;
    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const W = rect.width;
    const H = rect.height;
    const waterY = H * WATERLINE_Y_RATIO;

    let best: { task: WaterlineTask; dist: number; isSubmerged: boolean } | null = null;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const x = getTaskSlotX(i, tasks.length, W);
      const isSubmerged = task.failed && task.discoveryHours <= cutoffHours;
      const maxLen = isSubmerged ? getMaxPlumbLength(task.humanCleanupCostUsd, H) : 0;

      const segTop = waterY - 48;
      const segBottom = waterY + maxLen + 28;

      if (my >= segTop && my <= segBottom) {
        const dx = Math.abs(mx - x);
        if (dx <= 34 && (!best || dx < best.dist)) {
          best = { task, dist: dx, isSubmerged };
        }
      }
    }

    if (!best) return null;
    return {
      task: best.task,
      clientX,
      clientY,
      isSubmerged: best.isSubmerged,
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => onHoverTask(hitTestTask(e.clientX, e.clientY))}
      onMouseLeave={() => onHoverTask(null)}
      onClick={(e) => {
        const hit = hitTestTask(e.clientX, e.clientY);
        if (hit) onSelectTask(hit.task);
      }}
      className="relative w-full h-full cursor-pointer select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
