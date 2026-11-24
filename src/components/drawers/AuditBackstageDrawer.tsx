import React, { useState } from 'react';
import {
  X,
  Database,
  Sigma,
  DollarSign,
  Download,
  Play,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { BLS_WAGE_CARDS, LLM_RATE_CARDS } from '../../data/waterlineTasks';
import type { WaterlineTask, WaterlineMetricsAtCutoff } from '../../types/waterline';

interface AuditBackstageDrawerProps {
  open: boolean;
  tasks: WaterlineTask[];
  metrics: WaterlineMetricsAtCutoff;
  onClose: () => void;
}

type AuditTabId = 'sql' | 'formulas' | 'rates' | 'otel';

const SQL_PRESETS: Array<{ id: string; label: string; sql: string }> = [
  {
    id: 'by-team',
    label: 'Hidden Cost by Team',
    sql: `SELECT team_label,
       COUNT(*) AS tasks,
       ROUND(AVG(token_cost_usd), 2) AS avg_ai_bill,
       ROUND(AVG(human_cleanup_usd), 2) AS avg_human_fix,
       ROUND(AVG(total_settled_usd), 2) AS avg_true_cost
FROM waterline_tasks
GROUP BY team_label
ORDER BY avg_true_cost DESC;`,
  },
  {
    id: 'worst',
    label: 'Top Human Cleanups',
    sql: `SELECT id, human_title, bls_role, cleanup_minutes,
       token_cost_usd, human_cleanup_usd, discovery_hours
FROM waterline_tasks
WHERE failed = true
ORDER BY human_cleanup_usd DESC;`,
  },
  {
    id: 'blindspot',
    label: '24h vs 14d Blind Spot',
    sql: `SELECT
  CASE WHEN discovery_hours <= 24 THEN 'Caught within 24h'
       ELSE 'Hidden past 24h (IBNR)' END AS window_bucket,
  COUNT(*) AS failed_tasks,
  ROUND(SUM(human_cleanup_usd), 2) AS total_cleanup_usd
FROM waterline_tasks
WHERE failed = true
GROUP BY window_bucket;`,
  },
];

function executeLocalDuckSql(
  sql: string,
  tasks: WaterlineTask[]
): Array<Record<string, unknown>> {
  const q = sql.toLowerCase();

  if (q.includes('group by team_label')) {
    const map = new Map<string, WaterlineTask[]>();
    for (const t of tasks) {
      const list = map.get(t.teamLabel) ?? [];
      list.push(t);
      map.set(t.teamLabel, list);
    }
    return Array.from(map.entries())
      .map(([team, arr]) => ({
        team_label: team,
        tasks: arr.length,
        avg_ai_bill: Number(
          (arr.reduce((a, b) => a + b.tokenCostUsd, 0) / arr.length).toFixed(2)
        ),
        avg_human_fix: Number(
          (arr.reduce((a, b) => a + b.humanCleanupCostUsd, 0) / arr.length).toFixed(2)
        ),
        avg_true_cost: Number(
          (arr.reduce((a, b) => a + b.totalSettledCostUsd, 0) / arr.length).toFixed(2)
        ),
      }))
      .sort((a, b) => b.avg_true_cost - a.avg_true_cost);
  }

  if (q.includes('window_bucket')) {
    const early = tasks.filter((t) => t.failed && t.discoveryHours <= 24);
    const late = tasks.filter((t) => t.failed && t.discoveryHours > 24);
    return [
      {
        window_bucket: 'Caught within 24h',
        failed_tasks: early.length,
        total_cleanup_usd: Number(
          early.reduce((a, b) => a + b.humanCleanupCostUsd, 0).toFixed(2)
        ),
      },
      {
        window_bucket: 'Hidden past 24h (IBNR)',
        failed_tasks: late.length,
        total_cleanup_usd: Number(
          late.reduce((a, b) => a + b.humanCleanupCostUsd, 0).toFixed(2)
        ),
      },
    ];
  }

  return tasks
    .filter((t) => (q.includes('failed = true') ? t.failed : true))
    .sort((a, b) => b.humanCleanupCostUsd - a.humanCleanupCostUsd)
    .map((t) => ({
      id: t.id,
      human_title: t.shortLabel,
      bls_role: t.blsRoleTitle,
      cleanup_minutes: t.cleanupMinutes,
      token_cost_usd: t.tokenCostUsd,
      human_cleanup_usd: t.humanCleanupCostUsd,
      discovery_hours: Number.isFinite(t.discoveryHours) ? t.discoveryHours : 'clean',
    }));
}

export const AuditBackstageDrawer: React.FC<AuditBackstageDrawerProps> = ({
  open,
  tasks,
  metrics,
  onClose,
}) => {
  const [tab, setTab] = useState<AuditTabId>('sql');
  const [sqlText, setSqlText] = useState(SQL_PRESETS[0].sql);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>(() =>
    executeLocalDuckSql(SQL_PRESETS[0].sql, tasks)
  );
  const [copiedJson, setCopiedJson] = useState(false);

  if (!open) return null;

  const runSql = (nextSql = sqlText) => {
    setRows(executeLocalDuckSql(nextSql, tasks));
  };

  const downloadTelemetryJson = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'residual-waterline-otel-telemetry.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[820px] h-full obsidian-drawer flex flex-col overflow-hidden"
      >
        {/* Top Backstage Header */}
        <div className="px-7 pt-5 pb-4 border-b border-paper/12 flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-botanical-soft">
              Technical Backstage · Sumi-Obsidian Audit Mode
            </div>
            <h2 className="font-serif text-[30px] leading-tight text-paper mt-0.5">
              DuckDB SQL, Actuarial Proofs &amp; Raw Telemetry
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-paper/10 text-paper/65 hover:text-paper transition-colors"
            aria-label="Close audit drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-7 py-3 border-b border-paper/10 flex flex-wrap items-center gap-2">
          {[
            { id: 'sql' as const, label: 'DuckDB SQL', icon: Database },
            { id: 'formulas' as const, label: 'Actuarial Formulas', icon: Sigma },
            { id: 'rates' as const, label: 'BLS & LLM Rate Cards', icon: DollarSign },
            { id: 'otel' as const, label: 'Raw OTel Export', icon: Download },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-[11px] transition-colors ${
                  active
                    ? 'bg-paper text-obsidian font-semibold'
                    : 'bg-paper/[0.07] text-paper/70 hover:text-paper hover:bg-paper/[0.14]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto dark-scroll px-7 py-6">
          {tab === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {SQL_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSqlText(p.sql);
                        runSql(p.sql);
                      }}
                      className={`px-3 py-1 rounded-full font-mono text-[10.5px] transition-colors ${
                        sqlText === p.sql
                          ? 'bg-botanical text-paper'
                          : 'bg-paper/[0.08] text-paper/75 hover:bg-paper/[0.15]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => runSql()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-paper text-obsidian font-mono text-[11px] font-semibold hover:bg-paper/90"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run SQL
                </button>
              </div>

              <textarea
                value={sqlText}
                onChange={(e) => setSqlText(e.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full rounded-xl bg-black/45 border border-paper/15 p-4 font-mono text-[12px] text-paper/90 leading-relaxed focus:outline-none focus:border-botanical-soft resize-none"
              />

              <div className="overflow-x-auto dark-scroll">
                <table className="w-full text-left border-collapse font-mono text-[12px] tabular-nums-strict">
                  <thead>
                    <tr className="border-b border-paper/15 text-[10px] uppercase tracking-[0.12em] text-paper/50">
                      {cols.map((c) => (
                        <th key={c} className="py-2 pr-4">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper/[0.07]">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-paper/[0.04]">
                        {cols.map((c) => (
                          <td
                            key={c}
                            className={`py-2 pr-4 ${
                              c.includes('cleanup') || c.includes('true')
                                ? 'text-crimson-glow font-medium'
                                : typeof r[c] === 'number'
                                ? 'text-botanical-soft'
                                : 'text-paper/85'
                            }`}
                          >
                            {String(r[c] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'formulas' && (
            <div className="space-y-6 font-mono text-[12.5px]">
              <div className="pb-5 border-b border-paper/10">
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-crimson-glow mb-2">
                  01 · Actuarial Unit-Economics Conservation Law
                </div>
                <div className="bg-black/40 rounded-xl p-4 text-paper">
                  C_settled(T) + L_IBNR(T) ≡ C_ultimate = ${metrics.avgUltimateTotalUsd.toFixed(2)} / task
                </div>
                <p className="mt-2 font-sans text-[13px] text-paper/70 leading-relaxed">
                  At horizon T = {Math.round(metrics.cutoffHours)}h: realized cost is ${metrics.avgRealizedTotalUsd.toFixed(2)}/task (${metrics.avgTokenCostUsd.toFixed(2)} tokens + ${metrics.avgSurfacedCleanupUsd.toFixed(2)} surfaced BLS rework), and submerged IBNR reserve is ${metrics.avgHiddenIbnrUsd.toFixed(2)}/task.
                </p>
              </div>

              <div className="pb-5 border-b border-paper/10">
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-amberdepth-bright mb-2">
                  02 · Weibull Discovery-Lag Failure Hazard
                </div>
                <div className="bg-black/40 rounded-xl p-4 text-paper">
                  F(t) = 1 − exp(−(t / λ)^k)   ⇒   t_i = λ · (−ln(1 − U_i))^(1/k)
                </div>
                <p className="mt-2 font-sans text-[13px] text-paper/70 leading-relaxed">
                  Models delayed customer discovery and staging regressions across the 14-day settlement window (0h → 336h).
                </p>
              </div>

              <div>
                <div className="text-[10.5px] uppercase tracking-[0.12em] text-botanical-soft mb-2">
                  03 · Kaplan-Meier Survival &amp; Greenwood 95% CI
                </div>
                <div className="bg-black/40 rounded-xl p-4 text-paper">
                  Ŝ(t) = ∏_(t_i ≤ t) (1 − d_i / n_i)
                  <br />
                  Var[Ŝ(t)] = Ŝ(t)² · ∑_(t_i ≤ t) [ d_i / (n_i · (n_i − d_i)) ]
                </div>
                <p className="mt-2 font-sans text-[13px] text-paper/70 leading-relaxed">
                  Powers the Chapter 2 survival horizon and quantifies the 24-Hour Blind Spot without survivorship bias.
                </p>
              </div>
            </div>
          )}

          {tab === 'rates' && (
            <div className="space-y-7">
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-crimson-glow mb-3">
                  US Bureau of Labor Statistics (OEWS) Fully-Loaded Wages
                </div>
                <div className="space-y-2.5">
                  {BLS_WAGE_CARDS.map((b) => (
                    <div
                      key={b.socCode}
                      className="rounded-xl bg-paper/[0.05] border border-paper/10 p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-paper">
                          {b.occupation}{' '}
                          <span className="font-mono text-[11px] text-paper/50">
                            (SOC {b.socCode})
                          </span>
                        </div>
                        <div className="text-[11.5px] text-paper/55 mt-0.5">
                          {b.sourceNote}
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className="text-[16px] font-semibold text-crimson-glow">
                          ${b.fullyLoadedHourlyUsd.toFixed(2)}/hr
                        </div>
                        <div className="text-[10.5px] text-paper/50">
                          ${b.baseHourlyUsd.toFixed(2)} × {b.benefitsMultiplier}×
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-botanical-soft mb-3">
                  LLM Inference Token Rate Cards ($ / 1M Tokens)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {LLM_RATE_CARDS.map((m) => (
                    <div
                      key={m.model}
                      className="rounded-xl bg-paper/[0.05] border border-paper/10 p-4 font-mono"
                    >
                      <div className="text-[13px] font-semibold text-paper">
                        {m.model}
                      </div>
                      <div className="text-[10.5px] text-paper/50">{m.provider}</div>
                      <div className="mt-3 text-[11.5px] text-paper/80 space-y-1">
                        <div>Input: ${m.inputPer1MUsd.toFixed(2)}</div>
                        <div>Output: ${m.outputPer1MUsd.toFixed(2)}</div>
                        <div className="text-botanical-soft">
                          Cache: -{m.cachedInputDiscountPct}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'otel' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-paper/60">
                  14 VERIFIED BENCHMARK TRACES · OPENTELEMETRY JSON
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(tasks, null, 2));
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 1400);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper/10 hover:bg-paper/20 font-mono text-[11px] text-paper"
                  >
                    {copiedJson ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-botanical-soft" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedJson ? 'Copied' : 'Copy JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={downloadTelemetryJson}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-botanical hover:bg-botanical-soft font-mono text-[11px] font-semibold text-paper"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .json
                  </button>
                </div>
              </div>

              <pre className="rounded-xl bg-black/45 border border-paper/12 p-4 font-mono text-[11px] leading-relaxed text-paper/80 max-h-[60vh] overflow-auto dark-scroll">
                {JSON.stringify(tasks, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
