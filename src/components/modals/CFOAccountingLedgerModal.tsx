import React, { useMemo, useState } from 'react';
import { X, Download, Search, ArrowUpRight } from 'lucide-react';
import { EnrichedTrace, PortfolioViewModel } from '../../App';

interface CFOAccountingLedgerModalProps {
  open: boolean;
  traces: EnrichedTrace[];
  portfolio: PortfolioViewModel;
  onClose: () => void;
  onSelectTrace: (trace: EnrichedTrace) => void;
}

export const CFOAccountingLedgerModal: React.FC<CFOAccountingLedgerModalProps> = ({
  open,
  traces,
  portfolio,
  onClose,
  onSelectTrace,
}) => {
  const [search, setSearch] = useState('');
  const [taxonomy, setTaxonomy] = useState<string>('ALL');

  const taxonomies = useMemo(() => {
    return ['ALL', ...Array.from(new Set(traces.map((t) => t.failureTaxonomy)))];
  }, [traces]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return traces.filter((t) => {
      if (taxonomy !== 'ALL' && t.failureTaxonomy !== taxonomy) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.failureTaxonomy.toLowerCase().includes(q) ||
        t.corpus.toLowerCase().includes(q)
      );
    });
  }, [traces, search, taxonomy]);

  const exportCsv = () => {
    const headers = [
      'trace_id',
      'corpus',
      'domain',
      'taxonomy',
      'nominal_api_usd',
      'retry_burn_usd',
      'human_rework_usd',
      'ibnr_reserve_usd',
      'true_settled_usd',
      'bleed_multiplier',
      'discovery_hours',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.corpus,
          `"${r.domain}"`,
          `"${r.failureTaxonomy}"`,
          r.nominalInferenceCost.toFixed(4),
          r.retryBurnCost.toFixed(4),
          r.humanReworkCost.toFixed(2),
          r.ibnrReserveCost.toFixed(2),
          r.trueUnitCost.toFixed(2),
          (r.trueUnitCost / Math.max(0.01, r.nominalInferenceCost)).toFixed(2),
          r.reworkDiscoveryHours.toFixed(1),
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `residual-cfo-settlement-ledger-${rows.length}-traces.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-sumi/22 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1320px] h-[84vh] optical-glass rounded-t-[28px] border-b-0 flex flex-col overflow-hidden"
      >
        {/* Top Bone-Vellum Sheet Header */}
        <div className="px-8 pt-6 pb-5 hairline-b flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="plate-caption">
              CFO SETTLEMENT ACCOUNTING LEDGER · BONE-VELLUM AUDIT SHEET
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-6">
              <h2 className="font-serif text-[40px] leading-none text-sumi">
                True Unit-Economics Clearing Ledger
              </h2>
              <span className="font-mono text-[12px] text-carmine tabular-nums-strict">
                ${portfolio.nominalUnitCost.toFixed(2)} nominal ➔ ${portfolio.trueUnitCost.toFixed(2)} settled ({portfolio.bleedMultiplier.toFixed(1)}×)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sumi text-alabaster text-[10.5px] font-semibold tracking-museum uppercase hover:bg-sumi-obsidian transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV ({rows.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-sumi/[0.06] text-sumi/60 hover:text-sumi transition-colors"
              aria-label="Close ledger"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Filter & Search Whisper Bar */}
        <div className="px-8 py-3.5 hairline-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {taxonomies.map((tax) => {
              const active = taxonomy === tax;
              return (
                <button
                  key={tax}
                  type="button"
                  onClick={() => setTaxonomy(tax)}
                  className={`px-3 py-1 rounded-full font-mono text-[10.5px] transition-colors ${
                    active
                      ? 'bg-sumi text-alabaster'
                      : 'text-sumi/60 hover:text-sumi hover:bg-sumi/[0.05]'
                  }`}
                >
                  {tax}
                </button>
              );
            })}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-sumi/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trace ID, domain..."
              className="w-full pl-8 pr-3 py-1.5 rounded-full bg-sumi/[0.045] text-[12px] font-mono text-sumi placeholder:text-sumi/40 focus:outline-none focus:ring-1 focus:ring-sumi/25"
            />
          </div>
        </div>

        {/* Crisp Hairline Accounting Table */}
        <div className="flex-1 overflow-auto optical-scroll px-8 pb-6">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-alabaster-vellum/95 backdrop-blur-md z-10">
              <tr className="hairline-b plate-caption">
                <th className="py-3 pr-4">Trace Specimen</th>
                <th className="py-3 pr-4">Corpus / Domain</th>
                <th className="py-3 pr-4">Taxonomy</th>
                <th className="py-3 pr-4 text-right">Nominal API</th>
                <th className="py-3 pr-4 text-right">Retry Burn</th>
                <th className="py-3 pr-4 text-right">Human Rework</th>
                <th className="py-3 pr-4 text-right">IBNR Reserve</th>
                <th className="py-3 pr-4 text-right">True Settled</th>
                <th className="py-3 text-right">Autopsy</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px] tabular-nums-strict divide-y divide-sumi/[0.06]">
              {rows.slice(0, 140).map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    onSelectTrace(row);
                    onClose();
                  }}
                  className="hover:bg-sumi/[0.03] cursor-pointer transition-colors"
                >
                  <td className="py-2.5 pr-4 font-semibold text-sumi">{row.id}</td>
                  <td className="py-2.5 pr-4 text-sumi/65">
                    {row.corpus} · {row.domain}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={
                        row.hasFailure ? 'text-carmine font-medium' : 'text-viridian'
                      }
                    >
                      {row.failureTaxonomy}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-sumi/65">
                    ${row.nominalInferenceCost.toFixed(3)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-amberink">
                    ${row.retryBurnCost.toFixed(3)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-carmine">
                    ${row.humanReworkCost.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-amberink/85">
                    ${row.ibnrReserveCost.toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-sumi">
                    ${row.trueUnitCost.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-cobalt">
                      Inspect
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
