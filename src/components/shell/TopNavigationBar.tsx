import React from 'react';
import { Terminal } from 'lucide-react';
import type { WaterlineChapterId, DatasetScope } from '../../types/waterline';

interface TopNavigationBarProps {
  activeChapter: WaterlineChapterId;
  onSelectChapter: (chapter: WaterlineChapterId) => void;
  datasetScope: DatasetScope;
  onChangeDatasetScope: (scope: DatasetScope) => void;
  onOpenAudit: () => void;
}

const CHAPTERS: Array<{ id: WaterlineChapterId; label: string }> = [
  { id: 'hidden-bill', label: '1. The Hidden Bill' },
  { id: 'time-delay', label: '2. The Time Delay' },
  { id: 'smart-fix', label: '3. The Smart Fix' },
  { id: 'real-mistake', label: '4. One Real Mistake' },
];

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  activeChapter,
  onSelectChapter,
  datasetScope,
  onChangeDatasetScope,
  onOpenAudit,
}) => {
  return (
    <header className="relative z-30 h-16 shrink-0 w-full px-5 md:px-10 bg-paper border-b border-ink/[0.08] flex items-center justify-between gap-4">
      {/* Left: Calm Editorial Wordmark */}
      <div className="flex items-baseline gap-3">
        <button
          type="button"
          onClick={() => onSelectChapter('hidden-bill')}
          className="font-serif text-[26px] leading-none tracking-[-0.02em] text-ink focus:outline-none"
        >
          Residual
        </button>
        <span className="hidden xl:inline text-[12px] font-medium text-ink-soft">
          The hidden cost of AI rework
        </span>
      </div>

      {/* Center: Plain-English 4-Chapter Story Pills */}
      <nav
        aria-label="Story Chapters"
        className="flex items-center gap-1 overflow-x-auto clean-scroll"
      >
        {CHAPTERS.map((ch) => {
          const active = activeChapter === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onSelectChapter(ch.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-ink/[0.05]'
              }`}
            >
              {ch.label}
            </button>
          );
        })}
      </nav>

      {/* Right: Quiet Dataset Filter + Technical Backstage Trigger */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="hidden md:flex items-center rounded-full bg-ink/[0.045] p-0.5 text-[11px] font-medium">
          {(
            [
              { id: 'all', label: 'All 14' },
              { id: 'support', label: 'Support' },
              { id: 'engineering', label: 'Engineering' },
            ] as Array<{ id: DatasetScope; label: string }>
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeDatasetScope(opt.id)}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                datasetScope === opt.id
                  ? 'bg-paper text-ink font-semibold shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenAudit}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-obsidian text-paper hover:bg-ink text-[11.5px] font-mono font-medium transition-colors"
          title="Open Technical Audit, DuckDB SQL & Formulas (⌘K)"
        >
          <Terminal className="w-3.5 h-3.5 text-botanical-soft" />
          <span>Audit &amp; SQL</span>
          <span className="hidden sm:inline text-paper/45">⌘</span>
        </button>
      </div>
    </header>
  );
};
