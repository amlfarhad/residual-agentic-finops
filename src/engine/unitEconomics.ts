import { settleTraceEconomics } from './calculator/blsSettlementEngine';
import { computePortfolioMetrics } from './calculator/portfolioMetrics';

export function calculateTraceUnitEconomics(trace: any, options: any) {
  try {
    return settleTraceEconomics(trace, options?.modelRateCard, options?.hourlyLaborRate);
  } catch {
    return undefined;
  }
}

export function calculatePortfolioSettlement(traces: any[]) {
  try {
    return computePortfolioMetrics(traces as any);
  } catch {
    return undefined;
  }
}
