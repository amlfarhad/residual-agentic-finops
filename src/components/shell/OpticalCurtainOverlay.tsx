import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GripVertical, Play, Square } from 'lucide-react';
import {
  MAGNETIC_DETENTS,
  T_MAX_HOURS,
  cutoffHoursToU,
  uToCutoffHours,
  type SettlementHorizonSnapshot,
} from '../../engine/settlementTimeline';

interface OpticalCurtainOverlayProps {
  cutoffHours: number;
  onChangeCutoffHours: (nextHours: number) => void;
  snapshot: SettlementHorizonSnapshot;
  isReplaying: boolean;
  onToggleReplay: () => void;
}

// Keep prism strictly inside [8%, 92%] of viewport width so glass handles never clip
export const PRISM_MIN_X = 0.08;
export const PRISM_MAX_X = 0.92;

export function cutoffHoursToViewportX(hours: number): number {
  const u = cutoffHoursToU(hours);
  return PRISM_MIN_X + u * (PRISM_MAX_X - PRISM_MIN_X);
}

export function viewportXToCutoffHours(xRatio: number): number {
  const u = (xRatio - PRISM_MIN_X) / (PRISM_MAX_X - PRISM_MIN_X);
  return uToCutoffHours(Math.min(1, Math.max(0, u)));
}

export const OpticalCurtainOverlay: React.FC<OpticalCurtainOverlayProps> = ({
  cutoffHours,
  onChangeCutoffHours,
  snapshot,
  isReplaying,
  onToggleReplay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [carminePulse, setCarminePulse] = useState(false);
  const prevSurfacedRef = useRef<number>(snapshot.surfacedCount);

  // Flash subtle carmine pulse whenever newly surfaced trace batches cross the horizon blade
  useEffect(() => {
    if (snapshot.surfacedCount > prevSurfacedRef.current) {
      setCarminePulse(true);
      const timer = setTimeout(() => setCarminePulse(false), 240);
      prevSurfacedRef.current = snapshot.surfacedCount;
      return () => clearTimeout(timer);
    }
    prevSurfacedRef.current = snapshot.surfacedCount;
  }, [snapshot.surfacedCount]);

  const updateFromClientX = useCallback(
    (clientX: number, enableSnap: boolean) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rawRatio = (clientX - rect.left) / Math.max(rect.width, 1);
      const clampedRatio = Math.min(PRISM_MAX_X, Math.max(PRISM_MIN_X, rawRatio));
      const u = (clampedRatio - PRISM_MIN_X) / (PRISM_MAX_X - PRISM_MIN_X);

      // Magnetic detent snapping on key actuarial intervals: 0h, 24h, 72h, 168h, 336h
      if (enableSnap) {
        const SNAP_THRESHOLD_U = 0.022;
        for (const detent of MAGNETIC_DETENTS) {
          if (Math.abs(u - detent.u) <= SNAP_THRESHOLD_U) {
            onChangeCutoffHours(detent.hours);
            return;
          }
        }
      }

      onChangeCutoffHours(uToCutoffHours(u));
    },
    [onChangeCutoffHours]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(e.clientX, !e.shiftKey);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChangeCutoffHours(Math.max(0, cutoffHours - 6));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChangeCutoffHours(Math.min(T_MAX_HOURS, cutoffHours + 6));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChangeCutoffHours(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChangeCutoffHours(T_MAX_HOURS);
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'ew-resize';
    return () => {
      document.body.style.cursor = prevCursor;
    };
  }, [dragging]);

  const xRatio = cutoffHoursToViewportX(cutoffHours);
  const pct = xRatio * 100;
  const roundedHours = Math.round(cutoffHours);
  const surfacedPctRounded = Math.round(snapshot.surfacedPct);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {/* Left of Horizon Blade: Realized Settlement Field (Warm Carmine Refraction) */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${pct}%`,
          background:
            cutoffHours > 0.5
              ? 'linear-gradient(90deg, rgba(201,42,62,0.015) 0%, rgba(201,42,62,0.045) 88%, rgba(201,42,62,0.095) 100%)'
              : 'transparent',
        }}
      />

      {/* Right of Horizon Blade: Unobserved Latent IBNR Veil (Amber Mist) */}
      <div
        className="absolute inset-y-0 right-0"
        style={{
          width: `${100 - pct}%`,
          background:
            cutoffHours < T_MAX_HOURS - 0.5
              ? 'linear-gradient(90deg, rgba(184,107,17,0.065) 0%, rgba(232,237,242,0.22) 22%, rgba(232,237,242,0.12) 100%)'
              : 'transparent',
        }}
      />

      {/* Machined Horizontal Detent Rail & Replay Trigger (Strictly Cleared Below Header & Above Bottom Marginalia) */}
      <div className="pointer-events-auto absolute left-6 md:left-12 right-6 md:right-12 bottom-[185px] md:bottom-[175px] z-30 flex items-center justify-between gap-4">
        {/* Replay 14-Day Bleed Transport Control */}
        <button
          type="button"
          onClick={onToggleReplay}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full optical-glass font-mono text-[10px] font-semibold tracking-[0.11em] uppercase transition-all ${
            isReplaying
              ? 'text-carmine border-carmine/40 ring-2 ring-carmine/15'
              : 'text-sumi/80 hover:text-sumi hover:border-sumi/25'
          }`}
        >
          {isReplaying ? (
            <>
              <Square className="w-2.5 h-2.5 fill-current" />
              STOP SWEEP · T+{roundedHours}h
            </>
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-current text-carmine" />
              REPLAY 14-DAY BLEED
            </>
          )}
        </button>

        {/* Magnetic Detent Quick-Snap Pills */}
        <div className="hidden sm:flex items-center gap-1 optical-glass rounded-full px-2 py-1">
          {MAGNETIC_DETENTS.map((d) => {
            const isActive = Math.abs(cutoffHours - d.hours) <= 1.5;
            return (
              <button
                key={d.hours}
                type="button"
                onClick={() => onChangeCutoffHours(d.hours)}
                className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] tabular-nums-strict transition-all ${
                  isActive
                    ? d.hours === 0
                      ? 'bg-sumi text-alabaster'
                      : d.hours === 336
                      ? 'bg-carmine text-alabaster'
                      : 'bg-amberink text-alabaster'
                    : 'text-sumi/55 hover:text-sumi hover:bg-sumi/[0.06]'
                }`}
                title={`Snap settlement horizon to ${d.shortLabel} (${d.caption})`}
              >
                {d.shortLabel}{' '}
                <span className="hidden xl:inline opacity-75">· {d.caption}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vertical Actuarial Settlement Horizon Prism Handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Live Actuarial Settlement Horizon: drag from 0h engineering close to 336h full CFO settlement"
        aria-valuemin={0}
        aria-valuemax={T_MAX_HOURS}
        aria-valuenow={roundedHours}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{ left: `${pct}%` }}
        className="pointer-events-auto absolute top-[210px] sm:top-[225px] bottom-[155px] -translate-x-1/2 w-12 cursor-ew-resize flex flex-col items-center justify-center group focus:outline-none"
      >
        {/* Full-Height Quartz Refraction Blade Spanning Entire Canvas */}
        <div
          className="pointer-events-none fixed inset-y-0 w-[2px] -translate-x-[3px] opacity-45"
          style={{
            background:
              'linear-gradient(180deg, transparent 8%, rgba(201, 42, 62, 0.42) 30%, rgba(201, 42, 62, 0.5) 70%, transparent 92%)',
          }}
        />
        <div
          className={`pointer-events-none fixed inset-y-0 transition-all duration-150 ${
            dragging ? 'w-[6px]' : 'w-[4px] group-hover:w-[5px]'
          }`}
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(252,250,245,0.5) 48%, rgba(20,20,19,0.16) 52%, rgba(255,255,255,0.75) 100%)',
            boxShadow: carminePulse
              ? '0 0 26px rgba(201, 42, 62, 0.52), 0 0 8px rgba(201, 42, 62, 0.35)'
              : dragging
              ? '0 0 22px rgba(201, 42, 62, 0.25), 0 0 10px rgba(255,255,255,0.9)'
              : '0 0 16px rgba(20, 20, 19, 0.12)',
          }}
        />
        <div
          className="pointer-events-none fixed inset-y-0 w-[2px] translate-x-[3px] opacity-55"
          style={{
            background:
              'linear-gradient(180deg, transparent 8%, rgba(184, 107, 17, 0.45) 30%, rgba(26, 77, 143, 0.35) 70%, transparent 92%)',
          }}
        />

        {/* Machined Glass Drag Prism with Live Horizon & Surfaced % Readout */}
        <div
          className={`relative z-10 px-3 py-2.5 rounded-2xl optical-glass flex flex-col items-center justify-center gap-1 transition-all duration-150 whitespace-nowrap ${
            carminePulse
              ? 'ring-2 ring-carmine/60 shadow-[0_0_24px_rgba(201,42,62,0.28)] scale-[1.06]'
              : dragging
              ? 'scale-105 ring-2 ring-sumi/25'
              : 'group-hover:scale-[1.03]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-sumi/55" />
            <span className="font-mono text-[11.5px] font-semibold tabular-nums-strict text-sumi">
              T + {roundedHours}h
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9.5px] tabular-nums-strict">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                roundedHours === 0
                  ? 'bg-sumi/40'
                  : carminePulse
                  ? 'bg-carmine animate-ping'
                  : 'bg-carmine'
              }`}
            />
            <span
              className={
                roundedHours === 0
                  ? 'text-sumi/55'
                  : 'text-carmine font-semibold'
              }
            >
              {surfacedPctRounded}% SURFACED
            </span>
          </div>
          {snapshot.activeDetent && (
            <span className="text-[8.5px] font-sans font-semibold tracking-[0.14em] uppercase text-amberink">
              {snapshot.activeDetent.caption}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
