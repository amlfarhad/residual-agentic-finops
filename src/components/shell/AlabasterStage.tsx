import React from 'react';

interface AlabasterStageProps {
  children: React.ReactNode;
  activeView: 'fracture' | 'undertow' | 'frontier' | 'autopsy';
}

export const AlabasterStage: React.FC<AlabasterStageProps> = ({
  children,
  activeView,
}) => {
  const accentShift: Record<AlabasterStageProps['activeView'], string> = {
    fracture: 'opacity-100',
    undertow: 'opacity-90',
    frontier: 'opacity-85',
    autopsy: 'opacity-95',
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-alabaster text-sumi selection:bg-cobalt/15 selection:text-sumi">
      {/* Warm Upper-Left Gallery Sunlight Wash */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed -top-[22vh] -left-[16vw] w-[72vw] h-[72vh] rounded-full animate-ambient-drift transition-opacity duration-700 ${accentShift[activeView]}`}
        style={{
          background:
            'radial-gradient(circle at 38% 38%, rgba(239, 232, 216, 0.96) 0%, rgba(239, 232, 216, 0.42) 48%, rgba(246, 243, 236, 0) 76%)',
          filter: 'blur(36px)',
        }}
      />

      {/* Cool Lower-Right Optical Refraction Wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-[24vh] -right-[14vw] w-[68vw] h-[68vh] rounded-full animate-ambient-drift-reverse"
        style={{
          background:
            'radial-gradient(circle at 60% 60%, rgba(232, 237, 242, 0.95) 0%, rgba(232, 237, 242, 0.45) 46%, rgba(246, 243, 236, 0) 76%)',
          filter: 'blur(42px)',
        }}
      />

      {/* Subtle Atmospheric Chromatic Tint per Instrument View */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 transition-all duration-1000 ease-optical"
        style={{
          background:
            activeView === 'undertow'
              ? 'radial-gradient(ellipse 80% 45% at 50% 96%, rgba(184, 107, 17, 0.055), transparent 70%)'
              : activeView === 'frontier'
              ? 'radial-gradient(ellipse 70% 55% at 72% 28%, rgba(26, 77, 143, 0.045), transparent 72%)'
              : activeView === 'autopsy'
              ? 'radial-gradient(ellipse 75% 40% at 80% 52%, rgba(201, 42, 62, 0.04), transparent 70%)'
              : 'radial-gradient(ellipse 65% 50% at 74% 55%, rgba(201, 42, 62, 0.032), transparent 68%)',
        }}
      />

      {/* Procedural SVG Fine-Cotton Mineral Grain Overlay */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.032] mix-blend-multiply z-[2]"
      >
        <filter id="alabaster-mineral-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 0.98 0 0 0  0 0 0.94 0 0  0 0 0 1 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#alabaster-mineral-grain)" />
      </svg>

      {/* Subtle Perimeter Registration Micro-Ticks (Optical Instrument Framing) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-3 z-[3] opacity-30"
      >
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-sumi/40" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-sumi/40" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-sumi/40" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-sumi/40" />
      </div>

      {/* Main Edge-to-Edge Instrument Layer */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  );
};
