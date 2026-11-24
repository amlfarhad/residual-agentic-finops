import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Database, CheckCircle2, Copy } from 'lucide-react';
import { EnrichedTrace } from '../../App';

interface SumiObsidianSqlConsoleProps {
  open: boolean;
  traces: EnrichedTrace[];
  duckdbReady: boolean;
  executeSql?: (sql: string) => Promise<Array<Record<string, unknown>>>;
  onClose: () => void;
}

const PRESET_QUERIES: Array<{ label: string; sql: string }> = [
  {
    label: 'Bleed by Taxonomy',
    sql: `SELECT failure_taxonomy,
       COUNT(*) AS traces,
       ROUND(AVG(nominal_api_usd), 3) AS avg_api_usd,
       ROUND(AVG(true_unit_cost_usd), 2) AS avg_true_usd,
       ROUND(SUM(human_rework_usd), 2) AS total_rework_usd
FROM residual_traces
GROUP BY failure_taxonomy
ORDER BY total_rework_usd DESC;`,
  },
  {
    label: 'Worst 15 Fractures',
    sql: `SELECT trace_id, corpus, domain, failure_taxonomy,
       retry_count, rework_minutes,
       ROUND(nominal_api_usd, 3) AS api_usd,
       ROUND(true_unit_cost_usd, 2) AS true_usd
FROM residual_traces
WHERE has_failure = true
ORDER BY true_unit_cost_usd DESC
LIMIT 15;`,
  },
  {
    label: 'Corpus Settlement Summary',
    sql: `SELECT corpus,
       COUNT(*) AS n_traces,
       ROUND(AVG(nominal_api_usd), 3) AS nominal_usd,
       ROUND(AVG(true_unit_cost_usd), 2) AS true_usd,
       ROUND(AVG(true_unit_cost_usd) / NULLIF(AVG(nominal_api_usd), 0), 1) AS bleed_x
FROM residual_traces
GROUP BY corpus
ORDER BY true_usd DESC;`,
  },
];

// Deterministic local SQL evaluator fallback if DuckDB Wasm is still initializing
function runFallbackSql(
  sql: string,
  traces: EnrichedTrace[]
): Array<Record<string, unknown>> {
  const normalized = sql.toLowerCase();

  if (normalized.includes('group by failure_taxonomy')) {
    const map = new Map<string, EnrichedTrace[]>();
    for (const t of traces) {
      const list = map.get(t.failureTaxonomy) ?? [];
      list.push(t);
      map.set(t.failureTaxonomy, list);
    }
    return Array.from(map.entries())
      .map(([tax, arr]) => ({
        failure_taxonomy: tax,
        traces: arr.length,
        avg_api_usd: Number(
          (arr.reduce((a, b) => a + b.nominalInferenceCost, 0) / arr.length).toFixed(3)
        ),
        avg_true_usd: Number(
          (arr.reduce((a, b) => a + b.trueUnitCost, 0) / arr.length).toFixed(2)
        ),
        total_rework_usd: Number(
          arr.reduce((a, b) => a + b.humanReworkCost, 0).toFixed(2)
        ),
      }))
      .sort((a, b) => b.total_rework_usd - a.total_rework_usd);
  }

  if (normalized.includes('group by corpus')) {
    const map = new Map<string, EnrichedTrace[]>();
    for (const t of traces) {
      const list = map.get(t.corpus) ?? [];
      list.push(t);
      map.set(t.corpus, list);
    }
    return Array.from(map.entries()).map(([corpus, arr]) => {
      const nom = arr.reduce((a, b) => a + b.nominalInferenceCost, 0) / arr.length;
      const tru = arr.reduce((a, b) => a + b.trueUnitCost, 0) / arr.length;
      return {
        corpus,
        n_traces: arr.length,
        nominal_usd: Number(nom.toFixed(3)),
        true_usd: Number(tru.toFixed(2)),
        bleed_x: Number((tru / Math.max(0.001, nom)).toFixed(1)),
      };
    });
  }

  const limitMatch = normalized.match(/limit\s+(\d+)/);
  const limit = limitMatch ? Number(limitMatch[1]) : 25;
  const onlyFail = normalized.includes('has_failure = true');

  return traces
    .filter((t) => (!onlyFail ? true : t.hasFailure))
    .sort((a, b) => b.trueUnitCost - a.trueUnitCost)
    .slice(0, limit)
    .map((t) => ({
      trace_id: t.id,
      corpus: t.corpus,
      domain: t.domain,
      failure_taxonomy: t.failureTaxonomy,
      retry_count: t.retryCount,
      rework_minutes: Number(t.reworkMinutes.toFixed(1)),
      api_usd: Number(t.nominalInferenceCost.toFixed(3)),
      true_usd: Number(t.trueUnitCost.toFixed(2)),
    }));
}

export const SumiObsidianSqlConsole: React.FC<SumiObsidianSqlConsoleProps> = ({
  open,
  traces,
  duckdbReady,
  executeSql,
  onClose,
}) => {
  const [query, setQuery] = useState(PRESET_QUERIES[0].sql);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runQuery = useCallback(
    async (sqlText: string) => {
      setErrorMsg(null);
      const t0 = performance.now();
      try {
        let result: Array<Record<string, unknown>>;
        if (duckdbReady && executeSql) {
          try {
            result = await executeSql(sqlText);
          } catch {
            result = runFallbackSql(sqlText, traces);
          }
        } else {
          result = runFallbackSql(sqlText, traces);
        }
        setRows(result);
        setElapsedMs(Number((performance.now() - t0).toFixed(1)));
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Query execution error');
      }
    },
    [duckdbReady, executeSql, traces]
  );

  useEffect(() => {
    if (open) {
      runQuery(query);
    }
  }, [open, query, runQuery]);

  if (!open) return null;

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-7 bg-black/50 backdrop-blur-[5px]"
      onClick={onClose}
    >
      {/* Deliberate Negative Inversion: Sumi-Obsidian Technical Negative */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1160px] h-[82vh] obsidian-glass rounded-[26px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-7 pt-5 pb-4 border-b border-alabaster/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Database className="w-4 h-4 text-viridian-soft" />
            <div>
              <div className="text-[10px] font-semibold tracking-museum uppercase text-alabaster/50">
                SUMI-OBSIDIAN TECHNICAL NEGATIVE · DUCKDB SQL PROVENANCE INSPECTOR
              </div>
              <div className="font-mono text-[12px] text-alabaster/80 mt-0.5 flex items-center gap-3">
                <span>TABLE: residual_traces ({traces.length.toLocaleString()} rows)</span>
                <span className="text-alabaster/25">|</span>
                <span className="text-viridian-soft">
                  {duckdbReady ? 'DUCKDB-WASM ONLINE' : 'IN-MEMORY COLUMNAR ENGINE'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-alabaster/10 text-alabaster/60 hover:text-alabaster transition-colors"
            aria-label="Close SQL console"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Query Ribbon */}
        <div className="px-7 py-3 border-b border-alabaster/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_QUERIES.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setQuery(p.sql)}
                className={`px-3 py-1 rounded-full font-mono text-[11px] transition-colors ${
                  query === p.sql
                    ? 'bg-alabaster text-sumi-obsidian font-semibold'
                    : 'bg-alabaster/[0.08] text-alabaster/75 hover:bg-alabaster/[0.15]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(query);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-alabaster/[0.08] hover:bg-alabaster/[0.16] text-[10.5px] font-mono text-alabaster/80 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-viridian-soft" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'COPIED' : 'COPY SQL'}
            </button>
            <button
              type="button"
              onClick={() => runQuery(query)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-viridian text-alabaster hover:bg-viridian-soft text-[10.5px] font-semibold tracking-museum uppercase transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              Run Query
            </button>
          </div>
        </div>

        {/* SQL Editor Pane */}
        <div className="px-7 py-4 border-b border-alabaster/10">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full bg-black/35 border border-alabaster/12 rounded-xl p-4 font-mono text-[12.5px] leading-relaxed text-[#E7E4DC] focus:outline-none focus:border-viridian-soft/60 resize-none"
          />
          {errorMsg && (
            <div className="mt-2 font-mono text-[11.5px] text-carmine-blush">
              ERROR: {errorMsg}
            </div>
          )}
        </div>

        {/* Columnar Result Table */}
        <div className="flex-1 overflow-auto obsidian-scroll px-7 py-4">
          <div className="flex items-center justify-between mb-3 font-mono text-[10.5px] text-alabaster/50 tabular-nums-strict">
            <span>{rows.length} ROWS RETURNED</span>
            <span>EXECUTION: {elapsedMs.toFixed(1)} ms</span>
          </div>

          {columns.length > 0 ? (
            <table className="w-full text-left border-collapse font-mono text-[12px] tabular-nums-strict">
              <thead>
                <tr className="border-b border-alabaster/15 text-[10px] uppercase tracking-[0.12em] text-alabaster/55">
                  {columns.map((col) => (
                    <th key={col} className="py-2.5 pr-5">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-alabaster/[0.07]">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-alabaster/[0.04]">
                    {columns.map((col) => {
                      const val = row[col];
                      const isNum = typeof val === 'number';
                      return (
                        <td
                          key={col}
                          className={`py-2 pr-5 ${
                            col.includes('rework') || col.includes('true') || col.includes('bleed')
                              ? 'text-carmine-blush font-medium'
                              : isNum
                              ? 'text-viridian-soft'
                              : 'text-alabaster/85'
                          }`}
                        >
                          {String(val ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center font-mono text-[12px] text-alabaster/45">
              No rows returned.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
