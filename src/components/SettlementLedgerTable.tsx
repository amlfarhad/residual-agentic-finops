import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Download, Eye, Filter, Search } from 'lucide-react';
import { formatMoney, useFinOpsStore } from '../store/useFinOpsStore';
import { TraceSettlementLedger } from '../types/settlement';
import { TaskResolutionStatus } from '../types/telemetry';

interface SettlementLedgerTableProps {
  ledgers: TraceSettlementLedger[];
}

type SortKey =
  | 'taskId'
  | 'nominalApiCostUsd'
  | 'hiddenReworkTaxUsd'
  | 'trueUnitCostUsd'
  | 'humanBaselineCostUsd'
  | 'netEconomicSurplusUsd';

export const SettlementLedgerTable: React.FC<SettlementLedgerTableProps> = ({ ledgers }) => {
  const {
    simulation,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    modelFilter,
    setModelFilter,
    setInspectedTraceId,
  } = useFinOpsStore();

  const [sortKey, setSortKey] = useState<SortKey>('hiddenReworkTaxUsd');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const c = simulation.currency;

  const uniqueModels = useMemo(() => {
    return Array.from(new Set(ledgers.map((l) => l.trace.primaryModelId))).sort();
  }, [ledgers]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...ledgers]
      .filter((l) => {
        if (statusFilter !== 'all' && l.trace.resolutionStatus !== statusFilter) return false;
        if (modelFilter !== 'all' && l.trace.primaryModelId !== modelFilter) return false;
        if (q) {
          const hay = `${l.trace.taskId} ${l.trace.title} ${l.trace.primaryModelId} ${l.trace.domain}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortKey === 'taskId') {
          diff = a.trace.taskId.localeCompare(b.trace.taskId);
        } else {
          diff = a[sortKey] - b[sortKey];
        }
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [ledgers, searchQuery, statusFilter, modelFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Task_ID',
      'Domain',
      'Model',
      'Status',
      'Total_Tokens',
      'Cache_Hit_Pct',
      'First_Pass_Token_USD',
      'Rework_Token_USD',
      'Human_Oversight_USD',
      'Human_Escalation_USD',
      'SLA_Penalty_USD',
      'True_Unit_Cost_USD',
      'BLS_Human_Baseline_USD',
      'Net_Surplus_USD',
      'Hidden_Rework_Tax_Pct',
    ];
    const rows = filteredAndSorted.map((l) => [
      l.trace.taskId,
      l.trace.domain,
      l.trace.primaryModelId,
      l.trace.resolutionStatus,
      l.totalTokens,
      l.effectiveCacheHitPct.toFixed(1),
      l.firstPassTokenCostUsd.toFixed(4),
      l.reworkTokenCostUsd.toFixed(4),
      l.humanOversightCostUsd.toFixed(2),
      l.humanEscalationCostUsd.toFixed(2),
      l.slaAudit.accruedPenaltyUsd.toFixed(2),
      l.trueUnitCostUsd.toFixed(2),
      l.humanBaselineCostUsd.toFixed(2),
      l.netEconomicSurplusUsd.toFixed(2),
      l.hiddenReworkTaxPct.toFixed(1),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `residual-finops-settlement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: TaskResolutionStatus) => {
    switch (status) {
      case 'resolved_first_pass':
        return (
          <span className="inline-flex items-center rounded-sm border border-finops-emerald/30 bg-finops-emeraldSoft px-2 py-0.5 font-mono text-[10px] font-semibold text-finops-emerald">
            FIRST-PASS
          </span>
        );
      case 'resolved_with_rework':
        return (
          <span className="inline-flex items-center rounded-sm border border-finops-amber/30 bg-finops-amberSoft px-2 py-0.5 font-mono text-[10px] font-semibold text-finops-amber">
            REWORKED
          </span>
        );
      case 'escalated_to_human':
        return (
          <span className="inline-flex items-center rounded-sm border border-finops-crimson/30 bg-finops-crimsonSoft px-2 py-0.5 font-mono text-[10px] font-semibold text-finops-crimson">
            ESCALATED
          </span>
        );
      case 'failed_unresolved':
        return (
          <span className="inline-flex items-center rounded-sm border border-finops-crimson/40 bg-finops-crimsonSoft px-2 py-0.5 font-mono text-[10px] font-semibold text-finops-crimson">
            FAILED
          </span>
        );
    }
  };

  return (
    <section className="rounded-sm border border-vellum-border bg-vellum-sheet shadow-editorial">
      {/* Table Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vellum-border px-5 py-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink-primary">
            Audit-Grade Trace Settlement Ledger
          </h2>
          <p className="mt-0.5 font-sans text-xs text-ink-muted">
            Full P&amp;L reconciliation per autonomous task: First-Pass Tokens, Rework Tax, Loaded BLS Labor &amp; Contractual SLA Accruals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter task ID, title..."
              className="w-44 rounded-sm border border-vellum-rule bg-vellum-panel pl-8 pr-2.5 py-1.5 font-sans text-xs text-ink-primary placeholder:text-ink-muted focus:border-ink-primary focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="inline-flex items-center gap-1 rounded-sm border border-vellum-rule bg-vellum-panel px-2 py-1">
            <Filter className="h-3 w-3 text-ink-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskResolutionStatus | 'all')}
              className="bg-transparent font-mono text-[11px] text-ink-primary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="resolved_first_pass">First-Pass Clean</option>
              <option value="resolved_with_rework">Resolved w/ Rework</option>
              <option value="escalated_to_human">Escalated to Human</option>
              <option value="failed_unresolved">Failed / Unresolved</option>
            </select>
          </div>

          {/* Model Filter */}
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="rounded-sm border border-vellum-rule bg-vellum-panel px-2.5 py-1.5 font-mono text-[11px] text-ink-primary focus:border-ink-primary focus:outline-none"
          >
            <option value="all">All Models</option>
            {uniqueModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-sm border border-vellum-rule bg-vellum-sheet px-2.5 py-1.5 font-mono text-[11px] font-medium text-ink-primary hover:border-ink-primary"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-vellum-border bg-vellum-panel/70 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              <th className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort('taskId')}
                  className="inline-flex items-center gap-1 hover:text-ink-primary"
                >
                  Task &amp; Model
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3">Outcome</th>
              <th className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('nominalApiCostUsd')}
                  className="inline-flex items-center gap-1 hover:text-ink-primary"
                >
                  First-Pass / API
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('hiddenReworkTaxUsd')}
                  className="inline-flex items-center gap-1 hover:text-ink-primary"
                >
                  Hidden Rework Tax
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('trueUnitCostUsd')}
                  className="inline-flex items-center gap-1 hover:text-ink-primary"
                >
                  True Unit Cost
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('humanBaselineCostUsd')}
                  className="inline-flex items-center gap-1 hover:text-ink-primary"
                >
                  BLS Baseline
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('netEconomicSurplusUsd')}
                  className="inline-flex items-center gap-1 hover:text-ink-primary"
                >
                  Net Surplus / ROI
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Forensic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vellum-border text-xs">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center font-mono text-xs text-ink-muted">
                  No traces match current filters.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((ledger) => {
                const isSurplus = ledger.netEconomicSurplusUsd >= 0;
                return (
                  <tr
                    key={ledger.trace.traceId}
                    className="group transition-colors hover:bg-vellum-panel/60"
                  >
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-ink-primary">
                          {ledger.trace.taskId}
                        </span>
                        <span className="rounded-sm border border-vellum-border bg-vellum-panel px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                          {ledger.trace.slaTier}
                        </span>
                        {ledger.slaAudit.breached && (
                          <span className="rounded-sm bg-finops-crimsonSoft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-finops-crimson">
                            SLA BREACH
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-sans text-xs text-ink-secondary">
                        {ledger.trace.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                        {ledger.trace.primaryModelId} · {(ledger.totalTokens / 1000).toFixed(1)}k tok ·{' '}
                        {ledger.effectiveCacheHitPct.toFixed(0)}% cache
                      </p>
                    </td>

                    <td className="px-3 py-3 align-middle">
                      {statusBadge(ledger.trace.resolutionStatus)}
                      <p className="mt-1 font-mono text-[10px] text-ink-muted">
                        {ledger.reworkEvents.length} rework flag{ledger.reworkEvents.length === 1 ? '' : 's'}
                      </p>
                    </td>

                    <td className="px-3 py-3 text-right font-mono align-middle">
                      <p className="font-medium text-finops-indigo">
                        {formatMoney(ledger.firstPassTokenCostUsd, c, 3)}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        API: {formatMoney(ledger.nominalApiCostUsd, c, 3)}
                      </p>
                    </td>

                    <td className="px-3 py-3 text-right font-mono align-middle">
                      <p
                        className={`font-semibold ${
                          ledger.hiddenReworkTaxUsd > 0.5 ? 'text-finops-amber' : 'text-ink-secondary'
                        }`}
                      >
                        {formatMoney(ledger.hiddenReworkTaxUsd, c, 2)}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {ledger.hiddenReworkTaxPct.toFixed(0)}% of true cost
                      </p>
                    </td>

                    <td className="px-3 py-3 text-right font-mono align-middle">
                      <p className="font-semibold text-ink-primary">
                        {formatMoney(ledger.trueUnitCostUsd, c, 2)}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        Labor+SLA:{' '}
                        {formatMoney(
                          ledger.humanOversightCostUsd +
                            ledger.humanEscalationCostUsd +
                            ledger.slaAudit.accruedPenaltyUsd,
                          c,
                          2
                        )}
                      </p>
                    </td>

                    <td className="px-3 py-3 text-right font-mono align-middle">
                      <p className="font-medium text-ink-secondary">
                        {formatMoney(ledger.humanBaselineCostUsd, c, 2)}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {ledger.trace.humanBaselineMinutes}m · {ledger.trace.socOccupationCode}
                      </p>
                    </td>

                    <td className="px-3 py-3 text-right font-mono align-middle">
                      <p
                        className={`font-semibold ${ isSurplus ? 'text-finops-emerald' : 'text-finops-crimson' }`}
                      >
                        {isSurplus ? '+' : ''}
                        {formatMoney(ledger.netEconomicSurplusUsd, c, 2)}
                      </p>
                      <p
                        className={`text-[10px] ${ isSurplus ? 'text-finops-emerald/80' : 'text-finops-crimson/80' }`}
                      >
ROI: {ledger.roiPct >= 0 ? '+' : ''}
{ledger.roiPct.toFixed(0)}%
</p>
</td>
<td className="px-4 py-3 text-right align-middle">
                  <button
                    type="button"
                    onClick={() => setInspectedTraceId(ledger.trace.traceId)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-vellum-rule bg-vellum-sheet px-2.5 py-1 font-mono text-[11px] font-medium text-ink-primary transition-colors hover:border-ink-primary hover:bg-ink-primary hover:text-vellum-sheet"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Inspect
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
</section>
);
};
