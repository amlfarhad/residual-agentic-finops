import React from 'react';

export type InstrumentViewId = 'fracture' | 'undertow' | 'frontier' | 'autopsy';

interface FloatingPillDockProps {
  activeView: InstrumentViewId;
  onSelectView: (view: InstrumentViewId) => void;
}

const VIEWS: {
  id: InstrumentViewId;
  index: string;
  label: string;
  subtitle: string;
}[] = [
  { id: 'fracture', index: '01', label: 'The Fracture', subtitle: 'Unit Clearing' },
  { id: 'undertow', index: '02', label: 'The Undertow', subtitle: 'IBNR Survival' },
  { id: 'frontier', index: '03', label: 'The Frontier', subtitle: 'Routing Map' },
  { id: 'autopsy', index: '04', label: 'The Autopsy', subtitle: 'Seismograph' },
];

export const FloatingPillDock: React.FC<FloatingPillDockProps> = ({
  activeView,
  onSelectView,
}) => {
  return (
    <nav
      aria-label="Residual Optical Views"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 optical-glass rounded-full p-1.5 flex items-center gap-1"
    >
      {VIEWS.map((view) => {
        const isActive = activeView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelectView(view.id)}
            className={`relative px-4 sm:px-5 py-2 rounded-full transition-all duration-500 ease-optical flex items-center gap-2.5 ${
              isActive
                ? 'bg-sumi text-alabaster shadow-sm'
                : 'text-sumi/60 hover:text-sumi hover:bg-sumi/[0.045]'
            }`}
          >
            <span
              className={`font-mono text-[10px] tabular-nums-strict ${
                isActive ? 'text-alabaster/65' : 'text-sumi/38'
              }`}
            >
              {view.index}
            </span>
            <span className="text-[11px] font-semibold tracking-[0.09em] uppercase whitespace-nowrap">
              {view.label}
            </span>
            <span
              className={`hidden lg:inline text-[9.5px] font-medium tracking-[0.04em] ${
                isActive ? 'text-alabaster/55' : 'text-sumi/35'
              }`}
            >
              · {view.subtitle}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
