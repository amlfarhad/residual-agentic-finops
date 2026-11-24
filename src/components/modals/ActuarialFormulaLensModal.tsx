import React from 'react';
import { X, Sigma } from 'lucide-react';
import { PortfolioViewModel } from '../../App';

interface ActuarialFormulaLensModalProps {
  open: boolean;
  portfolio: PortfolioViewModel;
  laborHourlyRate: number;
  onClose: () => void;
}

export const ActuarialFormulaLensModal: React.FC<ActuarialFormulaLensModalProps> = ({
  open,
  portfolio,
  laborHourlyRate,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-sumi/24 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[820px] max-h-[86vh] optical-glass rounded-[28px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-6 pb-5 hairline-b flex items-start justify-between">
          <div>
            <div className="plate-caption text-cobalt flex items-center gap-1.5">
              <Sigma className="w-3.5 h-3.5" />
              ORACLE ACTUARIAL FORMULA &amp; PROVENANCE LENS
            </div>
            <h2 className="font-serif text-[38px] leading-none text-sumi mt-1.5">
              Mathematical Clearing Proofs
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-sumi/[0.06] text-sumi/60 hover:text-sumi transition-colors"
            aria-label="Close formula lens"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Proofs */}
        <div className="flex-1 overflow-y-auto optical-scroll px-8 py-6 space-y-6">
          {/* Proof 01: True Loaded Unit Cost */}
          <div className="pb-6 hairline-b">
            <div className="flex items-baseline justify-between">
              <span className="plate-caption text-carmine">
                01 · TRUE REWORK-ADJUSTED UNIT ECONOMICS
              </span>
              <span className="font-mono text-[12px] text-carmine tabular-nums-strict">
                LIVE: ${portfolio.trueUnitCost.toFixed(2)} / TASK
              </span>
            </div>
            <div className="mt-3 font-mono text-[13px] text-sumi bg-sumi/[0.04] rounded-xl px-4 py-3 leading-relaxed">
              C_true = C_api + C_retry + (M_rework / 60) · W_BLS + R_IBNR(t_obs)
            </div>
            <p className="mt-2.5 text-[13px] text-sumi/70 leading-relaxed">
              Where <span className="font-mono text-sumi">C_api</span> = ${portfolio.nominalUnitCost.toFixed(2)} nominal token inference,{' '}
              <span className="font-mono text-sumi">C_retry</span> = ${portfolio.retryBurnUnitCost.toFixed(2)} wasted tool retry loops,{' '}
              <span className="font-mono text-sumi">W_BLS</span> = ${laborHourlyRate.toFixed(2)}/hr fully burdened labor rate yielding{' '}
              <span className="font-mono text-carmine">${portfolio.humanReworkUnitCost.toFixed(2)}</span> realized rework, plus{' '}
              <span className="font-mono text-amberink">${portfolio.ibnrReserveUnitCost.toFixed(2)}</span> incurred-but-not-reported tail liability.
            </p>
          </div>

          {/* Proof 02: Kaplan-Meier Survival Estimator */}
          <div className="pb-6 hairline-b">
            <div className="plate-caption text-sumi">
              02 · KAPLAN-MEIER PRODUCT-LIMIT SURVIVAL ESTIMATOR S(t)
            </div>
            <div className="mt-3 font-mono text-[13px] text-sumi bg-sumi/[0.04] rounded-xl px-4 py-3 leading-relaxed">
              Ŝ(t) = ∏_(t_i ≤ t) [ 1 − d_i / n_i ]
            </div>
            <p className="mt-2.5 text-[13px] text-sumi/70 leading-relaxed">
              Measures the exact probability that an autonomous agent resolution remains free of latent human rework past hour{' '}
              <span className="font-mono text-sumi">t</span>, accounting for right-censored traces that have not yet reached the 14-day (336h) settlement boundary.
            </p>
          </div>

          {/* Proof 03: Greenwood 95% Variance Band */}
          <div className="pb-6 hairline-b">
            <div className="plate-caption text-cobalt">
              03 · GREENWOOD VARIANCE &amp; 95% CONFIDENCE ENVELOPE
            </div>
            <div className="mt-3 font-mono text-[13px] text-sumi bg-sumi/[0.04] rounded-xl px-4 py-3 leading-relaxed">
              Var[Ŝ(t)] = Ŝ(t)² · ∑_(t_i ≤ t) [ d_i / (n_i · (n_i − d_i)) ]   ⇒   CI_95 = Ŝ(t) ± 1.96 · √Var[Ŝ(t)]
            </div>
            <p className="mt-2.5 text-[13px] text-sumi/70 leading-relaxed">
              Quantifies actuarial uncertainty across high-depth and low-depth tool chains as the at-risk cohort <span className="font-mono text-sumi">n_i</span> thins toward T+336h.
            </p>
          </div>

          {/* Proof 04: Chain-Ladder IBNR Reserve & Lagrangian Routing */}
          <div>
            <div className="plate-caption text-amberink">
              04 · CHAIN-LADDER SUBMERGED IBNR &amp; LAGRANGIAN OPTIMUM (λ*)
            </div>
            <div className="mt-3 font-mono text-[13px] text-sumi bg-sumi/[0.04] rounded-xl px-4 py-3 leading-relaxed">
              IBNR(t_obs) = N_mo · [ Ŝ(t_obs) − Ŝ(336h) ] · E[L_rework]
              <br />
              min_π ∑_j E[C_j(π_j)]   s.t.   (1/N) ∑_j 𝟙[π_j ≠ auto] ≤ C_human_ceiling
            </div>
            <p className="mt-2.5 text-[13px] text-sumi/70 leading-relaxed">
              Reserves unemerged liability between observation horizon <span className="font-mono text-sumi">t_obs</span> and terminal settlement, while solving the dual multiplier{' '}
              <span className="font-mono text-cobalt">λ*</span> to route highest expected-loss traces into human triage without violating operations staffing ceilings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
