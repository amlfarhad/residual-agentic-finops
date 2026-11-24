import React, { useMemo, useState } from 'react';
import { Microscope, Terminal, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { SeismographRibbonCanvas } from '../canvas/SeismographRibbonCanvas';
import { EnrichedTrace } from '../../App';

interface AutopsyViewProps {
  traces: EnrichedTrace[];
  initialFilter?: 'all' | 'clean' | 'fracture';
  selectedTrace: EnrichedTrace | null;
  onSelectTrace: (trace: EnrichedTrace) => void;
  onOpenAutopsyDrawer: (trace: EnrichedTrace) => void;
}

export const AutopsyView: React.FC<AutopsyViewProps> = ({
  traces,
  initialFilter = 'all',
  selectedTrace,
  onSelectTrace,
  onOpenAutopsyDrawer,
}) => {
  const [taxonomyFilter, setTaxonomyFilter] = useState<string>(
    initialFilter === 'fracture'
      ? 'FRACTURED'
      : initialFilter === 'clean'
      ? 'CLEAN'
      : 'ALL'
  );

  const taxonomies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of traces) {
      counts.set(t.failureTaxonomy, (counts.get(t.failureTaxonomy) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [traces]);

  const filteredTraces = useMemo(() => {
    if (taxonomyFilter === 'ALL') return traces;
    if (taxonomyFilter === 'FRACTURED') return traces.filter((t) => t.hasFailure);
    if (taxonomyFilter === 'CLEAN') return traces.filter((t) => !t.hasFailure);
    return traces.filter((t) => t.failureTaxonomy === taxonomyFilter);
  }, [traces, taxonomyFilter]);

  const activeTrace =
    selectedTrace && filteredTraces.some((t) => t.id === selectedTrace.id)
      ? selectedTrace
      : filteredTraces[0] ?? traces[0] ?? null;

  const fractureCount = useMemo(
    () => filteredTraces.filter((t) => t.hasFailure).length,
    [filteredTraces]
  );

  return (
    <section className="relative flex-1 w-full h-full overflow-hidden px-6 md:px-12 pt-5 pb-24 flex flex-col justify-between">
      {/* Top Monumental Forensic Header — Zero Boxed Cards */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="plate-caption mb-1.5 flex items-center gap-3">
            <span>VIEW 04 · HORIZONTAL OPTICAL SEISMOGRAPH &amp; TRACE FILMSTRIP</span>
            <span className="text-sumi/25">|</span>
            <span className="font-mono text-carmine">
              {fractureCount} FRACTURES IN ACTIVE WINDOW
            </span>
          </div>

          {activeTrace && (
            <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
              <div>
                <span
                  className={`monument-figure text-[56px] sm:text-[72px] xl:text-[84px] ${
                    activeTrace.hasFailure ? 'text-carmine' : 'text-viridian'
                  }`}
                >
                  ${activeTrace.trueUnitCost.toFixed(2)}
                </span>
                <div className="plate-caption mt-0.5">
                  SPECIMEN {activeTrace.id} · TRUE LOADED COST
                </div>
              </div>

              <div className="h-11 w-px bg-sumi/10 hidden sm:block self-center" />

              <div>
                <span className="monument-figure text-[42px] sm:text-[52px] text-sumi/80">
                  {activeTrace.toolCalls}
                </span>
                <span className="ml-1.5 font-mono text-[12px] text-sumi/45">tools</span>
                <div className="plate-caption mt-0.5">
                  {activeTrace.retryCount} RETRY COILS
                </div>
              </div>

              <div>
                <span className="monument-figure text-[42px] sm:text-[52px] text-amberink">
                  {activeTrace.reworkMinutes.toFixed(0)}m
                </span>
                <div className="plate-caption mt-0.5">
                  REALIZED HUMAN REWORK
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Failure Taxonomy Filter Pills */}
        <div className="flex flex-col lg:items-end gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'FRACTURED', 'CLEAN'].map((pill) => {
              const active = taxonomyFilter === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setTaxonomyFilter(pill)}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-museum uppercase transition-colors ${
                    active
                      ? pill === 'FRACTURED'
                        ? 'bg-carmine text-alabaster'
                        : pill === 'CLEAN'
                        ? 'bg-viridian text-alabaster'
                        : 'bg-sumi text-alabaster'
                      : 'text-sumi/55 hover:text-sumi hover:bg-sumi/[0.06]'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
            {taxonomies
              .filter(([tax]) => tax !== 'CLEAN')
              .slice(0, 4)
              .map(([tax, cnt]) => {
                const active = taxonomyFilter === tax;
                return (
                  <button
                    key={tax}
                    type="button"
                    onClick={() => setTaxonomyFilter(tax)}
                    className={`px-2.5 py-1 rounded-full font-mono text-[10px] transition-colors ${
                      active
                        ? 'bg-amberink text-alabaster'
                        : 'text-sumi/55 hover:text-sumi hover:bg-sumi/[0.06]'
                    }`}
                  >
                    {tax} ({cnt})
                  </button>
                );
              })}
          </div>

          {activeTrace && (
            <button
              type="button"
              onClick={() => onOpenAutopsyDrawer(activeTrace)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sumi text-alabaster text-[10.5px] font-semibold tracking-museum uppercase hover:bg-sumi-obsidian transition-colors"
            >
              <Microscope className="w-3.5 h-3.5 text-carmine-blush" />
              Open Full Forensic Autopsy Drawer
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Optical Seismograph Canvas */}
      <div className="relative flex-1 min-h-[200px] my-2">
        <SeismographRibbonCanvas
          traces={filteredTraces}
          selectedTraceId={activeTrace?.id ?? null}
          onSelectTrace={(trace) => {
            onSelectTrace(trace);
          }}
        />
      </div>

      {/* Bottom Open-Air Forensic Filmstrip + Floating Sumi-Obsidian Payload Loupe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pt-2 hairline-t">
        {/* Horizontal Trace Filmstrip */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-2">
            <span className="plate-caption">
              TRACE FILMSTRIP · CLICK SPECIMEN TO FOCUS · DOUBLE-CLICK FOR AUTOPSY
            </span>
            <span className="font-mono text-[10.5px] text-sumi/50 tabular-nums-strict">
              SHOWING {Math.min(18, filteredTraces.length)} OF {filteredTraces.length}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 optical-scroll">
            {filteredTraces.slice(0, 18).map((t) => {
              const isSelected = activeTrace?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTrace(t)}
                  onDoubleClick={() => onOpenAutopsyDrawer(t)}
                  className={`shrink-0 text-left px-3 py-2 rounded-xl transition-all ${
                    isSelected
                      ? 'optical-glass ring-1 ring-sumi/30'
                      : 'hover:bg-sumi/[0.045]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 font-mono text-[10.5px]">
                    <span className="font-semibold text-sumi">{t.id}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        t.hasFailure ? 'bg-carmine' : 'bg-viridian'
                      }`}
                    />
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] tabular-nums-strict text-sumi/75">
                    ${t.trueUnitCost.toFixed(2)}{' '}
                    <span className="text-sumi/40 text-[9.5px]">
                      ({(t.trueUnitCost / Math.max(0.01, t.nominalInferenceCost)).toFixed(0)}×)
                    </span>
                  </div>
                  <div className="text-[9.5px] font-mono text-sumi/45 truncate max-w-[116px]">
                    {t.domain}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Sumi-Obsidian Forensic Payload Loupe (Deliberate Negative Inversion) */}
        {activeTrace && (
          <div className="lg:col-span-5 obsidian-glass rounded-2xl px-4 py-3 text-[11px] font-mono">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-alabaster/10">
              <span className="flex items-center gap-1.5 text-[10px] tracking-museum uppercase text-alabaster/65">
                <Terminal className="w-3.5 h-3.5 text-viridian-soft" />
                SUMI-OBSIDIAN FORENSIC LOUPE · {activeTrace.id}
              </span>
              <button
                type="button"
                onClick={() => onOpenAutopsyDrawer(activeTrace)}
                className="text-[10px] tracking-museum uppercase text-carmine-blush hover:text-alabaster transition-colors"
              >
                EXPAND SPAN TREE ↗
              </button>
            </div>
            <div className="space-y-1 text-alabaster/80 leading-relaxed max-h-[82px] overflow-y-auto obsidian-scroll">
              <div className="flex items-center gap-2">
                {activeTrace.hasFailure && (
                  <AlertTriangle className="w-3.5 h-3.5 text-carmine shrink-0" />
                )}
                <span className="text-alabaster/55">ROOT_CAUSE:</span>
                <span className={activeTrace.hasFailure ? 'text-carmine-blush' : 'text-viridian-soft'}>
                  {activeTrace.rootCauseNote}
                </span>
              </div>
              <div className="text-alabaster/60">
                {`{"corpus":"${activeTrace.corpus}","model":"${activeTrace.modelId}","tokens":${
                  activeTrace.inputTokens + activeTrace.outputTokens
                },"cache_hit":${(activeTrace.cacheHitRate * 100).toFixed(0)}%,"bls_rework_usd":${activeTrace.humanReworkCost.toFixed(
                  2
                )}}`}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
