import React from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Layers, ShieldAlert, TrendingUp } from 'lucide-react';
import { formatMoney, useFinOpsStore } from '../store/useFinOpsStore';
import { PortfolioMetricsSummary } from '../types/settlement';

interface UnitEconomicsRibbonProps {
  metrics: PortfolioMetricsSummary;
}

export const UnitEconomicsRibbon: React.FC<UnitEconomicsRibbonProps> = ({ metrics }) => {
  const { simulation } = useFinOpsStore();
  const c = simulation.currency;

  const isSurplusPositive = metrics.totalNetSurplusUsd >= 0;

  return (
    <section aria-label="Headline Unit Economics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: True Fully-Loaded Unit Cost */}
      <article className="relative flex flex-col justify-between rounded-sm border border-vellum-border bg-vellum-sheet p-5 shadow-editorial">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              True Fully-Loaded Unit Cost
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink-primary">
              {formatMoney(metrics.meanTrueUnitCostUsd, c, 2)}
            </p>
          </div>
          <div className="rounded-sm border border-vellum-border bg-vellum-panel p-2 text-finops-indigo">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 border-t border-vellum-border pt-3 text-xs">
          <div className="flex items-center justify-between text-ink-secondary">
            <span>Naive API-Only Token Cost:</span>
            <span className="font-mono font-medium text-ink-primary">
              {formatMoney(metrics.meanNominalApiCostUsd, c, 3)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-ink-muted">
            <span>Hidden Cost Multiplier:</span>
            <span className="font-mono font-semibold text-finops-amber">
              {metrics.hiddenCostMultiplier.toFixed(1)}× API bill
            </span>
          </div>
        </div>
      </article>

      {/* Card 2: Hidden Rework Tax % */}
      <article className="relative flex flex-col justify-between rounded-sm border border-vellum-border bg-vellum-sheet p-5 shadow-editorial">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              Hidden Rework Tax
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-finops-amber">
              {metrics.portfolioReworkTaxPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-sm border border-finops-amber/25 bg-finops-amberSoft p-2 text-finops-amber">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 border-t border-vellum-border pt-3 text-xs">
          <div className="flex items-center justify-between text-ink-secondary">
            <span>Total Corpus Rework Bleed:</span>
            <span className="font-mono font-semibold text-finops-crimson">
              {formatMoney(metrics.totalHiddenReworkTaxUsd, c, 2)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-ink-muted">
            <span>First-Pass Yield (Clean):</span>
            <span className="font-mono font-medium text-ink-primary">
              {metrics.firstPassYieldPct.toFixed(0)}% ({metrics.firstPassResolvedTasks}/{metrics.totalTasks})
            </span>
          </div>
        </div>
      </article>

      {/* Card 3: Human Cost Equivalence (BLS Loaded) */}
      <article className="relative flex flex-col justify-between rounded-sm border border-vellum-border bg-vellum-sheet p-5 shadow-editorial">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              BLS Human Equivalence
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink-primary">
              {formatMoney(metrics.meanHumanBaselineCostUsd, c, 2)}
            </p>
          </div>
          <div className="rounded-sm border border-vellum-border bg-vellum-panel p-2 text-ink-secondary">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 border-t border-vellum-border pt-3 text-xs">
          <div className="flex items-center justify-between text-ink-secondary">
            <span>Corpus Human Labor Baseline:</span>
            <span className="font-mono font-medium text-ink-primary">
              {formatMoney(metrics.totalHumanBaselineCostUsd, c, 2)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-ink-muted">
            <span>SLA Breaches / Accruals:</span>
            <span
              className={`font-mono font-semibold ${
                metrics.slaBreachCount > 0 ? 'text-finops-crimson' : 'text-finops-emerald'
              }`}
            >
              {metrics.slaBreachCount} ({formatMoney(metrics.totalSlaPenaltyUsd, c, 0)})
            </span>
          </div>
        </div>
      </article>

      {/* Card 4: Net FinOps Surplus Margin */}
      <article className="relative flex flex-col justify-between rounded-sm border border-vellum-border bg-vellum-panel p-5 shadow-editorial">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              Net FinOps Margin
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p
                className={`font-mono text-3xl font-semibold tracking-tight ${
                  isSurplusPositive ? 'text-finops-emerald' : 'text-finops-crimson'
                }`}
              >
                {metrics.netFinOpsMarginPct >= 0 ? '+' : ''}
                {metrics.netFinOpsMarginPct.toFixed(1)}%
              </p>
              {isSurplusPositive ? (
                <ArrowUpRight className="h-5 w-5 text-finops-emerald" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-finops-crimson" />
              )}
            </div>
          </div>
          <div
            className={`rounded-sm border p-2 ${
              isSurplusPositive
                ? 'border-finops-emerald/25 bg-finops-emeraldSoft text-finops-emerald'
                : 'border-finops-crimson/25 bg-finops-crimsonSoft text-finops-crimson'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 border-t border-vellum-rule pt-3 text-xs">
          <div className="flex items-center justify-between text-ink-secondary">
            <span>Net Economic {isSurplusPositive ? 'Surplus' : 'Deficit'}:</span>
            <span
              className={`font-mono font-semibold ${
                isSurplusPositive ? 'text-finops-emerald' : 'text-finops-crimson'
              }`}
            >
              {formatMoney(metrics.totalNetSurplusUsd, c, 2)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-ink-muted">
            <span>Prompt Cache Savings Captured:</span>
            <span className="font-mono font-medium text-finops-emerald">
              {formatMoney(metrics.totalCacheSavingsUsd, c, 3)}
            </span>
          </div>
        </div>
      </article>
    </section>
  );
};
