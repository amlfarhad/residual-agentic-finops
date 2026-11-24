import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { TopNavigationBar } from './components/shell/TopNavigationBar';
import { HiddenBillStage } from './components/stages/HiddenBillStage';
import { TimeDelayStage } from './components/stages/TimeDelayStage';
import { SmartFixStage } from './components/stages/SmartFixStage';
import { RealMistakeStage } from './components/stages/RealMistakeStage';
import { AuditBackstageDrawer } from './components/drawers/AuditBackstageDrawer';
import {
  WATERLINE_TASKS,
  MAX_HORIZON_HOURS,
  computeWaterlineMetrics,
} from './data/waterlineTasks';
import type {
  WaterlineChapterId,
  DatasetScope,
  PlumbHoverState,
  WaterlineTask,
} from './types/waterline';

export function App() {
  const [activeChapter, setActiveChapter] =
    useState<WaterlineChapterId>('hidden-bill');
  const [datasetScope, setDatasetScope] = useState<DatasetScope>('all');
  const [cutoffHours, setCutoffHours] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [hoveredPlumb, setHoveredPlumb] = useState<PlumbHoverState | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    WATERLINE_TASKS[0].id
  );
  const [auditOpen, setAuditOpen] = useState<boolean>(false);

  const sweepRafRef = useRef<number | null>(null);

  const visibleTasks = useMemo(() => {
    if (datasetScope === 'all') return WATERLINE_TASKS;
    return WATERLINE_TASKS.filter((t) => t.category === datasetScope);
  }, [datasetScope]);

  const selectedTask = useMemo(
    () =>
      visibleTasks.find((t) => t.id === selectedTaskId) ??
      visibleTasks[0] ??
      WATERLINE_TASKS[0],
    [visibleTasks, selectedTaskId]
  );

  const metrics = useMemo(
    () => computeWaterlineMetrics(visibleTasks, cutoffHours),
    [visibleTasks, cutoffHours]
  );

  const cancelSweep = useCallback(() => {
    if (sweepRafRef.current !== null) {
      cancelAnimationFrame(sweepRafRef.current);
      sweepRafRef.current = null;
    }
    setIsReplaying(false);
  }, []);

  // Smooth 2.2-second 60fps 14-day bleed sweep (0h -> 336h)
  const runBleedSweep = useCallback(
    (durationMs = 2200) => {
      cancelSweep();
      setIsReplaying(true);
      setCutoffHours(0);

      const started = performance.now();
      const tick = (now: number) => {
        const raw = Math.min(1, (now - started) / durationMs);
        // Gentle ease-in-out so weights drop organically across Day 1 -> Day 8 -> Day 14
        const eased =
          raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
        setCutoffHours(eased * MAX_HORIZON_HOURS);

        if (raw < 1) {
          sweepRafRef.current = requestAnimationFrame(tick);
        } else {
          sweepRafRef.current = null;
          setCutoffHours(MAX_HORIZON_HOURS);
          setIsReplaying(false);
        }
      };

      sweepRafRef.current = requestAnimationFrame(tick);
    },
    [cancelSweep]
  );

  // Automatic gentle entrance animation on first load so the hidden iceberg reveals itself naturally
  useEffect(() => {
    const timer = setTimeout(() => {
      runBleedSweep(2200);
    }, 320);
    return () => {
      clearTimeout(timer);
      cancelSweep();
    };
  }, [runBleedSweep, cancelSweep]);

  // Global ⌘K / Ctrl+K shortcut for Technical Audit & SQL Backstage
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAuditOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleManualCutoff = useCallback(
    (nextHours: number) => {
      cancelSweep();
      setCutoffHours(Math.min(MAX_HORIZON_HOURS, Math.max(0, nextHours)));
    },
    [cancelSweep]
  );

  const handleToggleReplay = useCallback(() => {
    if (isReplaying) {
      cancelSweep();
    } else {
      runBleedSweep(2200);
    }
  }, [isReplaying, cancelSweep, runBleedSweep]);

  const handleInspectTask = useCallback((task: WaterlineTask) => {
    setSelectedTaskId(task.id);
    setHoveredPlumb(null);
    setActiveChapter('real-mistake');
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-paper text-ink selection:bg-cobalt/15">
      <TopNavigationBar
        activeChapter={activeChapter}
        onSelectChapter={(ch) => {
          setHoveredPlumb(null);
          setActiveChapter(ch);
        }}
        datasetScope={datasetScope}
        onChangeDatasetScope={setDatasetScope}
        onOpenAudit={() => setAuditOpen(true)}
      />

      <main className="relative flex-1 w-full min-h-0 flex flex-col overflow-hidden">
        {activeChapter === 'hidden-bill' && (
          <HiddenBillStage
            tasks={visibleTasks}
            metrics={metrics}
            cutoffHours={cutoffHours}
            onChangeCutoffHours={handleManualCutoff}
            isReplaying={isReplaying}
            onToggleReplay={handleToggleReplay}
            hovered={hoveredPlumb}
            onHoverTask={setHoveredPlumb}
            onInspectTask={handleInspectTask}
            onGoToTimeDelay={() => setActiveChapter('time-delay')}
          />
        )}

        {activeChapter === 'time-delay' && (
          <TimeDelayStage
            tasks={visibleTasks}
            metrics={metrics}
            cutoffHours={cutoffHours}
            onChangeCutoffHours={handleManualCutoff}
            onInspectTask={handleInspectTask}
            onGoToSmartFix={() => setActiveChapter('smart-fix')}
          />
        )}

        {activeChapter === 'smart-fix' && (
          <SmartFixStage
            tasks={visibleTasks}
            onInspectTask={handleInspectTask}
            onGoToRealMistake={() => setActiveChapter('real-mistake')}
          />
        )}

        {activeChapter === 'real-mistake' && (
          <RealMistakeStage
            tasks={visibleTasks}
            selectedTask={selectedTask}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
          />
        )}
      </main>

      <AuditBackstageDrawer
        open={auditOpen}
        tasks={visibleTasks}
        metrics={metrics}
        onClose={() => setAuditOpen(false)}
      />
    </div>
  );
}

export default App;
