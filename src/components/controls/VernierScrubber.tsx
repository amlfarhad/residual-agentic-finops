import React, { useRef, useState, useCallback } from 'react';

interface VernierScrubberProps {
  value: number; // hours: 24..336
  min?: number;
  max?: number;
  onChange: (nextHours: number) => void;
}

const MAJOR_MARKS = [24, 48, 72, 120, 168, 240, 336];

export const VernierScrubber: React.FC<VernierScrubberProps> = ({
  value,
  min = 24,
  max = 336,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(rect.width, 1)));
      const snapped = Math.round((min + ratio * (max - min)) / 2) * 2;
      onChange(Math.min(max, Math.max(min, snapped)));
    },
    [min, max, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const pct = ((value - min) / (max - min)) * 100;
  const minorTickCount = 52;

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="plate-caption">
          VERNIER OBSERVATION HORIZON SCRUBBER · SCRUB TO REVEAL LATENT IBNR
        </span>
        <div className="flex items-center gap-3 font-mono text-[11.5px] tabular-nums-strict">
          <span className="text-amberink font-semibold">
            T = {value}h ({(value / 24).toFixed(1)}d)
          </span>
          <span className="text-sumi/35">·</span>
          <span className="text-sumi/55">
            REMAINING TAIL: {max - value}h
          </span>
        </div>
      </div>

      {/* Machined Caliper Track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Observation Horizon Hours"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onChange(Math.max(min, value - 6));
          if (e.key === 'ArrowRight') onChange(Math.min(max, value + 6));
        }}
        className="relative h-11 w-full cursor-ew-resize flex items-center focus:outline-none"
      >
        {/* Fine Vernier Rule Baseline */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-sumi/20" />

        {/* Observed Amber Span Fill */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2.5px] bg-amberink/75 transition-[width] duration-75"
          style={{ width: `${pct}%` }}
        />

        {/* 52 Engraved Vernier Micro-Ticks */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between items-center">
          {Array.from({ length: minorTickCount + 1 }).map((_, idx) => {
            const isMajor = idx % 4 === 0;
            const tickPct = (idx / minorTickCount) * 100;
            const passed = tickPct <= pct;
            return (
              <span
                key={idx}
                className="block w-px transition-colors duration-150"
                style={{
                  height: isMajor ? '14px' : '7px',
                  backgroundColor: passed
                    ? 'rgba(184, 107, 17, 0.72)'
                    : 'rgba(20, 20, 19, 0.22)',
                }}
              />
            );
          })}
        </div>

        {/* Machined Brass & Quartz Vernier Needle Handle */}
        <div
          style={{ left: `${pct}%` }}
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform duration-150 ${
            dragging ? 'scale-110' : 'hover:scale-105'
          }`}
        >
          <div className="w-6 h-8 rounded-full optical-glass border border-amberink/45 flex items-center justify-center shadow-sm">
            <div className="w-[2px] h-4 rounded-full bg-amberink" />
          </div>
        </div>
      </div>

      {/* Calibrated Major Horizon Markers */}
      <div className="relative h-5 mt-0.5">
        {MAJOR_MARKS.map((mark) => {
          const markPct = ((mark - min) / (max - min)) * 100;
          const active = Math.abs(value - mark) <= 8;
          return (
            <button
              key={mark}
              type="button"
              onClick={() => onChange(mark)}
              style={{ left: `${markPct}%` }}
              className={`absolute -translate-x-1/2 font-mono text-[10px] tabular-nums-strict transition-colors ${
                active
                  ? 'text-amberink font-semibold'
                  : 'text-sumi/45 hover:text-sumi'
              }`}
            >
              {mark === 168 ? '7d' : mark === 336 ? '14d' : `${mark}h`}
            </button>
          );
        })}
      </div>
    </div>
  );
};
