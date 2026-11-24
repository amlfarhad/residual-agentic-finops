import React, { useRef, useState } from 'react';
import {
  Play,
  Square,
  ArrowRight,
  MousePointerClick,
  GripHorizontal,
  RotateCcw,
} from 'lucide-react';
import { WaterlineTankCanvas } from '../canvas/WaterlineTankCanvas';
import { MAX_HORIZON_HOURS } from '../../data/waterlineTasks';
import type {
  WaterlineTask,
  WaterlineMetricsAtCutoff,
  PlumbHoverState,
} from '../../types/waterline';

interface HiddenBillStageProps {
  tasks: WaterlineTask[];
  metrics: WaterlineMetricsAtCutoff;
  cutoffHours: number;
  onChangeCutoffHours: (hours: number) => void;
  isReplaying: boolean;
  onToggleReplay: () => void;
  hovered: PlumbHoverState | null;
  onHoverTask: (hover: PlumbHoverState | null) => void;
  onInspectTask: (task: WaterlineTask) => void;
  onGoToTimeDelay: () => void;
}

const DAY_DETENTS: Array<{ label: string; hours: number }> = [
  { label: 'Day 0', hours: 0 },
  { label: 'Day 1', hours: 24 },
  { label: 'Day 3', hours: 72 },
  { label: 'Day 7', hours: 168 },
  { label: 'Day 14', hours: 336 },
];

export const HiddenBillStage: React.FC<HiddenBillStageProps> = ({
  tasks,
  metrics,
  cutoffHours,
  onChangeCutoffHours,
  isReplaying,
  onToggleReplay,
  hovered,
  onHoverTask,
  onInspectTask,
  onGoToTimeDelay,
}) => {
  const stageRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  // Free-floating draggable position (null = cleanly docked in top-center zero-collision sky lane)
  const [freePos, setFreePos] = useState<{ x: number; y: number } | null>(null);
  const [draggingPill, setDraggingPill] = useState(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const currentDay = Math.round(cutoffHours / 24);
  const isDayZero = cutoffHours < 1;
  const roundedMultiplier = Math.round(metrics.realizedMultiplier);

  const handleSliderChange = (rawVal: number) => {
    for (const d of DAY_DETENTS) {
      if (Math.abs(rawVal - d.hours) <= 7) {
        onChangeCutoffHours(d.hours);
        return;
      }
    }
    onChangeCutoffHours(rawVal);
  };

  // Pointer-capture drag handlers so user can freely drag the Day 0–14 timeline controller anywhere
  const handlePillPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Don't hijack drag when user interacts with range slider or buttons inside the pill
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button')
    ) {
      return;
    }

    const stageEl = stageRef.current;
    const pillEl = pillRef.current;
    if (!stageEl || !pillEl) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const stageRect = stageEl.getBoundingClientRect();
    const pillRect = pillEl.getBoundingClientRect();

    dragOffsetRef.current = {
      dx: e.clientX - pillRect.left,
      dy: e.clientY - pillRect.top,
    };

    setFreePos({
      x: pillRect.left - stageRect.left,
      y: pillRect.top - stageRect.top,
    });
    setDraggingPill(true);
  };

  const handlePillPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingPill) return;
    const stageEl = stageRef.current;
    const pillEl = pillRef.current;
    if (!stageEl || !pillEl) return;

    const stageRect = stageEl.getBoundingClientRect();
    const pillW = pillEl.offsetWidth;
    const pillH = pillEl.offsetHeight;

    const nextX = e.clientX - stageRect.left - dragOffsetRef.current.dx;
    const nextY = e.clientY - stageRect.top - dragOffsetRef.current.dy;

    // Clamp cleanly inside stage bounds
    const clampedX = Math.min(Math.max(12, nextX), Math.max(12, stageRect.width - pillW - 12));
    const clampedY = Math.min(Math.max(12, nextY), Math.max(12, stageRect.height - pillH - 12));

    setFreePos({ x: clampedX, y: clampedY });
  };

  const handlePillPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDraggingPill(false);
  };

  return (
    <section
      ref={stageRef}
      className="relative flex-1 w-full h-full overflow-hidden"
    >
      {/* Full-Bleed Architectural Iceberg Tank Canvas */}
      <WaterlineTankCanvas
        tasks={tasks}
        cutoffHours={cutoffHours}
        hoveredTaskId={hovered?.task.id ?? null}
        onHoverTask={onHoverTask}
        onSelectTask={onInspectTask}
      />

      {/* ABOVE THE WATERLINE OVERLAY: Calm AI Invoice Reality */}
      <div className="pointer-events-none absolute top-0 inset-x-0 px-6 md:px-10 pt-4 flex items-start justify-between gap-4 z-20">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tag text-ink-soft mb-0.5">
            <span className="w-2 h-2 rounded-full bg-botanical" />
            Above the surface · What the AI bill shows
          </div>
          <div className="flex items-baseline gap-3.5">
            <span className="monument-numeral text-[58px] sm:text-[74px] text-ink">
              ${metrics.avgTokenCostUsd.toFixed(2)}
            </span>
            <div className="text-[13px] text-ink-muted leading-snug max-w-[220px] hidden sm:block">
              <div className="font-semibold text-ink">Average token bill per task</div>
              <div>Just pennies for LLM API calls.</div>
            </div>
          </div>
        </div>

        {/* Right Top: Replay Button & Live Surface Tally */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onToggleReplay}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all shadow-sm ${
              isReplaying
                ? 'bg-crimson text-paper'
                : 'bg-ink text-paper hover:bg-obsidian'
            }`}
          >
            {isReplaying ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                Watching Bleed · Day {currentDay}
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current text-crimson-glow" />
                Watch the 14-Day Bleed
              </>
            )}
          </button>

          <div className="flex items-center gap-3 text-[12px] font-medium text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-botanical" />
              <span className="font-mono font-semibold text-ink tabular-nums-strict">
                {metrics.totalTasks - metrics.surfacedFailuresCount}
              </span>{' '}
              look clean
            </span>
            <span className="text-ink/20">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-crimson" />
              <span className="font-mono font-semibold text-crimson tabular-nums-strict">
                {metrics.surfacedFailuresCount}
              </span>{' '}
              needed human fixes
            </span>
          </div>
        </div>
      </div>

      {/* FREELY DRAGGABLE DAY 0 -> DAY 14 TIMELINE CONTROLLER (Default Dock: Clean Top-Center Zero-Overlap Sky Lane) */}
      <div
        ref={pillRef}
        onPointerDown={handlePillPointerDown}
        onPointerMove={handlePillPointerMove}
        onPointerUp={handlePillPointerUp}
        style={
          freePos
            ? { left: `${freePos.x}px`, top: `${freePos.y}px` }
            : undefined
        }
        className={`pointer-events-auto absolute z-30 w-[332px] vellum-glass rounded-2xl px-4 py-2.5 select-none transition-shadow ${
          freePos
            ? ''
            : 'top-3.5 left-1/2 -translate-x-1/2'
        } ${
          draggingPill
            ? 'cursor-grabbing ring-2 ring-cobalt/35 shadow-2xl'
            : 'cursor-grab hover:border-ink/20'
        }`}
      >
        {/* Drag Handle Header */}
        <div className="flex items-center justify-between text-[10.5px] font-semibold mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-ink-muted">
            <GripHorizontal className="w-3.5 h-3.5 text-ink-soft" />
            <span>Time Window · Drag to move</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-cobalt tabular-nums-strict">
              Day {currentDay} ({Math.round(cutoffHours)}h)
            </span>
            {freePos && (
              <button
                type="button"
                onClick={() => setFreePos(null)}
                className="p-0.5 rounded hover:bg-ink/10 text-ink-soft hover:text-ink transition-colors"
                title="Re-dock to top center"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={MAX_HORIZON_HOURS}
          step={1}
          value={Math.round(cutoffHours)}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          aria-label="Days after AI finishes task"
          className="waterline-slider w-full"
        />

        <div className="flex items-center justify-between mt-1.5">
          {DAY_DETENTS.map((d) => {
            const active = Math.abs(cutoffHours - d.hours) <= 5;
            return (
              <button
                key={d.hours}
                type="button"
                onClick={() => onChangeCutoffHours(d.hours)}
                className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors ${
                  active
                    ? 'bg-cobalt text-paper font-semibold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* BELOW THE WATERLINE OVERLAY: Protected Safe Typography Zone (Zero Overlap with Plumb-Lines) */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 px-6 md:px-10 pb-6 pt-5 flex flex-col md:flex-row md:items-end justify-between gap-4 z-20 bg-gradient-to-t from-[#171311] via-[#171311]/90 to-transparent">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tag text-paper/65 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isDayZero ? 'bg-paper/45' : 'bg-crimson-glow'
              }`}
            />
            Below the surface · True cost after human fixes (Day {currentDay})
          </div>

          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span
              className={`monument-numeral text-[64px] sm:text-[82px] transition-colors duration-300 ${
                isDayZero ? 'text-paper/85' : 'text-paper'
              }`}
            >
              ${metrics.avgRealizedTotalUsd.toFixed(2)}
            </span>

            <div className="flex flex-col">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[12px] font-semibold w-fit tabular-nums-strict ${
                  isDayZero
                    ? 'bg-paper/12 text-paper/75'
                    : 'bg-crimson text-paper'
                }`}
              >
                {isDayZero
                  ? '1× · No mistakes caught yet'
                  : `${roundedMultiplier}× more than the AI bill`}
              </span>
              <span className="text-[12.5px] text-paper/70 mt-1">
                {metrics.hiddenFailuresCount > 0 ? (
                  <>
                    Still hidden underwater:{' '}
                    <span className="font-mono font-semibold text-amberdepth-bright">
                      +${metrics.avgHiddenIbnrUsd.toFixed(2)}/task
                    </span>{' '}
                    ({metrics.hiddenFailuresCount} uncaught fixes)
                  </>
                ) : (
                  <>
                    Every hidden human fix surfaced: +$
                    {metrics.avgSurfacedCleanupUsd.toFixed(2)}/task in real labor.
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-4">
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11.5px] text-paper/55">
            <MousePointerClick className="w-3.5 h-3.5" />
            Hover any weight · Click to inspect receipt
          </span>
          <button
            type="button"
            onClick={onGoToTimeDelay}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full abyss-glass hover:bg-paper hover:text-ink text-[12px] font-semibold transition-colors"
          >
            Why does it take 14 days?
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* FLOATING 1-LINE HUMAN STORY CARD ON HOVER */}
      {hovered && !draggingPill && (
        <div
          style={{
            left: `${Math.min(
              typeof window !== 'undefined' ? window.innerWidth - 340 : 820,
              Math.max(20, hovered.clientX + 18)
            )}px`,
            top: `${Math.min(
              typeof window !== 'undefined' ? window.innerHeight - 175 : 450,
              Math.max(82, hovered.clientY - 36)
            )}px`,
          }}
          className="pointer-events-none fixed z-40 w-[320px] vellum-glass rounded-2xl p-4"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-tag text-ink-muted">
              {hovered.task.teamLabel} · {hovered.task.id}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[10.5px] font-semibold ${
                hovered.isSubmerged
                  ? 'bg-crimson-wash text-crimson'
                  : 'bg-botanical-wash text-botanical'
              }`}
            >
              {hovered.isSubmerged
                ? `+$${hovered.task.humanCleanupCostUsd.toFixed(2)} fix`
                : `$${hovered.task.tokenCostUsd.toFixed(2)} clean`}
            </span>
          </div>

          <div className="text-[13.5px] font-semibold text-ink leading-snug">
            {hovered.task.humanTitle}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-muted leading-relaxed">
            {hovered.task.humanVignette}
          </p>

          <div className="mt-2.5 pt-2 border-t border-ink/10 flex items-center justify-between font-mono text-[10.5px] text-ink-soft">
            <span>
              AI: ${hovered.task.tokenCostUsd.toFixed(2)} ·{' '}
              {hovered.isSubmerged
                ? `Caught Day ${Math.max(1, Math.round(hovered.task.discoveryHours / 24))}`
                : 'No fix needed'}
            </span>
            <span className="text-cobalt font-sans font-semibold">
              Click for receipt →
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
