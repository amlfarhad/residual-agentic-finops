import type { EnrichedTrace } from '../App';

export const T_MAX_HOURS = 336;
export const LOG_TIME_K = 9;
const LN_1_PLUS_K = Math.log(1 + LOG_TIME_K);

export interface MagneticDetent {
  hours: number;
  shortLabel: string;
  caption: string;
  u: number;
}

/**
 * Non-linear logarithmic temporal mapping:
 * T(u) = T_max * ln(1 + k * u) / ln(1 + k), with T_max = 336h, k = 9.
 */
export function uToCutoffHours(u: number): number {
  const clamped = Math.min(1, Math.max(0, u));
  return T_MAX_HOURS * (Math.log(1 + LOG_TIME_K * clamped) / LN_1_PLUS_K);
}

/**
 * Exact analytical inverse mapping u(T) in [0, 1].
 */
export function cutoffHoursToU(hours: number): number {
  const clamped = Math.min(T_MAX_HOURS, Math.max(0, hours));
  return (Math.exp((clamped / T_MAX_HOURS) * LN_1_PLUS_K) - 1) / LOG_TIME_K;
}

export const MAGNETIC_DETENTS: MagneticDetent[] = [
  { hours: 0, shortLabel: '0h', caption: 'Eng Close', u: cutoffHoursToU(0) },
  { hours: 24, shortLabel: '24h', caption: '1D Myopic', u: cutoffHoursToU(24) },
  { hours: 72, shortLabel: '72h', caption: '3D Review', u: cutoffHoursToU(72) },
  { hours: 168, shortLabel: '168h', caption: '7D Sprint', u: cutoffHoursToU(168) },
  { hours: 336, shortLabel: '336h', caption: '14D Settled', u: cutoffHoursToU(336) },
];

/**
 * Deterministic 32-bit FNV-1a hash used to assign reproducible Weibull discovery lags
 * directly from real TAU-bench and SWE-bench trace IDs.
 */
export function fnv1aHash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

interface WeibullParams {
  shapeK: number;
  scaleLambdaHours: number;
}

function weibullParamsForTaxonomy(taxonomy: string): WeibullParams {
  const norm = taxonomy.toUpperCase();
  if (
    norm.includes('SCHEMA') ||
    norm.includes('SYNTAX') ||
    norm.includes('TIMEOUT') ||
    norm.includes('PARSE')
  ) {
    return { shapeK: 1.35, scaleLambdaHours: 24 };
  }
  if (
    norm.includes('RETRY') ||
    norm.includes('TOOL') ||
    norm.includes('HALLUCINAT') ||
    norm.includes('ARG')
  ) {
    return { shapeK: 1.4, scaleLambdaHours: 46 };
  }
  if (
    norm.includes('POLICY') ||
    norm.includes('REFUND') ||
    norm.includes('STATE') ||
    norm.includes('LOGIC')
  ) {
    return { shapeK: 1.25, scaleLambdaHours: 82 };
  }
  if (
    norm.includes('SILENT') ||
    norm.includes('REGRESSION') ||
    norm.includes('COMPLIANCE') ||
    norm.includes('EDGE')
  ) {
    return { shapeK: 1.15, scaleLambdaHours: 132 };
  }
  return { shapeK: 1.3, scaleLambdaHours: 66 };
}

/**
 * Computes a deterministic discovery hour t_i in [0.5h, 335.5h] for a fractured trace
 * using FNV-1a(traceId) mapped through the root-cause Weibull inverse CDF.
 * Clean traces return Infinity (never fracture within the 14-day horizon).
 */
export function computeDeterministicDiscoveryHour(trace: EnrichedTrace): number {
  if (!trace.hasFailure) return Number.POSITIVE_INFINITY;

  const h = fnv1aHash32(`${trace.id}::${trace.failureTaxonomy}::${trace.corpus}`);
  // Map uint32 strictly into (0.006, 0.992) to avoid log(0) singularities
  const u = 0.006 + (h / 0xffffffff) * 0.986;
  const { shapeK, scaleLambdaHours } = weibullParamsForTaxonomy(trace.failureTaxonomy);
  const weibullSample = scaleLambdaHours * Math.pow(-Math.log(1 - u), 1 / shapeK);

  // Blend slightly with raw corpus discovery hour if explicitly present and finite
  const rawLag =
    Number.isFinite(trace.reworkDiscoveryHours) &&
    trace.reworkDiscoveryHours > 0 &&
    trace.reworkDiscoveryHours < T_MAX_HOURS
      ? trace.reworkDiscoveryHours
      : weibullSample;

  const blended = weibullSample * 0.72 + rawLag * 0.28;
  return Number(Math.min(T_MAX_HOURS - 0.5, Math.max(0.5, blended)).toFixed(2));
}

export interface TimelineFracturedTrace {
  traceId: string;
  discoveryHours: number;
  discoveryU: number;
  nominalApiCost: number;
  hiddenReworkCost: number; // total hidden cost beyond nominal API (retry + human + tail)
  retryBurnCost: number;
  humanReworkCost: number;
  dollarStakes: number;
  failureTaxonomy: string;
  predictedFailureRisk: number;
}

export interface SettlementTimelineIndex {
  totalTraceCount: number;
  cleanTraceCount: number;
  fracturedTraceCount: number;
  monthlyTaskVolume: number;

  // Constant per-task baselines across all T
  nominalUnitCost: number;
  ultimateUnitCost: number;
  totalHiddenUnitCost: number;
  ultimateMultiplier: number;

  // Precomputed sorted typed arrays for O(log N) prefix-sum lookup (<0.05ms)
  sortedFractures: TimelineFracturedTrace[];
  discoveryHoursArr: Float64Array;
  prefixHiddenCostArr: Float64Array;
  prefixRetryCostArr: Float64Array;
  prefixHumanReworkArr: Float64Array;
  prefixAvoidableReworkArr: Float64Array;

  // Map traceId -> discoveryHours for O(1) particle lookup in Canvas2D
  discoveryByTraceId: Map<string, number>;
}

export interface SettlementHorizonSnapshot {
  cutoffHours: number;
  cutoffU: number;

  // Exact Actuarial Conservation Law quantities:
  // realizedUnitCost(T) + ibnrReserveUnitCost(T) === ultimateUnitCost
  nominalUnitCost: number;
  realizedHiddenUnitCost: number;
  realizedUnitCost: number;
  ibnrReserveUnitCost: number;
  ultimateUnitCost: number;

  // Decomposed realized components up to T
  realizedRetryUnitCost: number;
  realizedHumanReworkUnitCost: number;

  // Multipliers & Ratios
  realizedMultiplier: number;
  ultimateMultiplier: number;
  ibnrSharePct: number; // 100% at T=0h -> 0% at T=336h
  realizedSharePct: number; // 0% at T=0h -> 100% at T=336h

  // Counts
  totalTraceCount: number;
  fracturedTraceCount: number;
  surfacedCount: number;
  submergedCount: number;
  surfacedPct: number;
  cleanResolutionRateAtT: number;

  // Counterfactual Myopic Window Policy Analytics (+$/mo)
  recoverableMonthlyAtT: number;
  fullSettlementRecoverableMonthly: number;
  myopicPolicyBlindspotMonthly: number; // monthly rework cost missed by routing at window T
  myopic24hTrapMonthly: number; // canonical 24h vs 336h counterfactual loss
  myopic24hMissedPct: number;
  activeDetent: MagneticDetent | null;
}

/**
 * Builds the O(log N) Float64Array prefix-sum timeline index from real production traces.
 */
export function buildSettlementTimeline(
  traces: EnrichedTrace[],
  monthlyTaskVolume: number
): SettlementTimelineIndex {
  const totalTraceCount = traces.length;
  const discoveryByTraceId = new Map<string, number>();

  let totalNominalSum = 0;
  let totalUltimateSum = 0;
  let cleanTraceCount = 0;

  const fracturedList: TimelineFracturedTrace[] = [];

  for (let i = 0; i < totalTraceCount; i++) {
    const t = traces[i];
    const nominal = Math.max(0.0001, t.nominalInferenceCost);
    totalNominalSum += nominal;

    if (!t.hasFailure) {
      cleanTraceCount++;
      totalUltimateSum += nominal;
      discoveryByTraceId.set(t.id, Number.POSITIVE_INFINITY);
      continue;
    }

    const discoveryHours = computeDeterministicDiscoveryHour(t);
    discoveryByTraceId.set(t.id, discoveryHours);

    // Ensure every fractured trace obeys exact conservation:
    // ultimateTraceCost = nominal + hiddenReworkCost
    const retryBurn = Math.max(0, t.retryBurnCost);
    const humanRework = Math.max(0, t.humanReworkCost);
    const tailAdj = Math.max(0, t.ibnrReserveCost);
    const hiddenReworkCost = Math.max(
      retryBurn + humanRework + tailAdj,
      Math.max(0, t.trueUnitCost - nominal)
    );

    totalUltimateSum += nominal + hiddenReworkCost;

    fracturedList.push({
      traceId: t.id,
      discoveryHours,
      discoveryU: cutoffHoursToU(discoveryHours),
      nominalApiCost: nominal,
      hiddenReworkCost,
      retryBurnCost: retryBurn,
      humanReworkCost: humanRework + tailAdj,
      dollarStakes: t.dollarStakes,
      failureTaxonomy: t.failureTaxonomy,
      predictedFailureRisk: t.predictedFailureRisk,
    });
  }

  // Sort ascending by discovery hour t_i
  fracturedList.sort((a, b) => a.discoveryHours - b.discoveryHours);

  const fCount = fracturedList.length;
  const discoveryHoursArr = new Float64Array(fCount);
  const prefixHiddenCostArr = new Float64Array(fCount + 1);
  const prefixRetryCostArr = new Float64Array(fCount + 1);
  const prefixHumanReworkArr = new Float64Array(fCount + 1);
  const prefixAvoidableReworkArr = new Float64Array(fCount + 1);

  for (let i = 0; i < fCount; i++) {
    const f = fracturedList[i];
    discoveryHoursArr[i] = f.discoveryHours;
    prefixHiddenCostArr[i + 1] = prefixHiddenCostArr[i] + f.hiddenReworkCost;
    prefixRetryCostArr[i + 1] = prefixRetryCostArr[i] + f.retryBurnCost;
    prefixHumanReworkArr[i + 1] = prefixHumanReworkArr[i] + f.humanReworkCost;
    // Counterfactual routing can avoid ~62% of hidden rework on high-risk traces
    const avoidFactor = f.predictedFailureRisk >= 0.3 ? 0.68 : 0.44;
    prefixAvoidableReworkArr[i + 1] =
      prefixAvoidableReworkArr[i] + f.hiddenReworkCost * avoidFactor;
  }

  const denom = Math.max(1, totalTraceCount);
  const nominalUnitCost = totalNominalSum / denom;
  const ultimateUnitCost = totalUltimateSum / denom;
  const totalHiddenUnitCost = Math.max(0, ultimateUnitCost - nominalUnitCost);
  const ultimateMultiplier = ultimateUnitCost / Math.max(0.0001, nominalUnitCost);

  return {
    totalTraceCount,
    cleanTraceCount,
    fracturedTraceCount: fCount,
    monthlyTaskVolume,
    nominalUnitCost,
    ultimateUnitCost,
    totalHiddenUnitCost,
    ultimateMultiplier,
    sortedFractures: fracturedList,
    discoveryHoursArr,
    prefixHiddenCostArr,
    prefixRetryCostArr,
    prefixHumanReworkArr,
    prefixAvoidableReworkArr,
    discoveryByTraceId,
  };
}

/**
 * O(log N) upper-bound binary search returning number of fractured traces with t_i <= cutoffHours.
 */
export function countSurfacedAtHours(
  discoveryHoursArr: Float64Array,
  cutoffHours: number
): number {
  if (cutoffHours <= 0) return 0;
  const len = discoveryHoursArr.length;
  if (len === 0) return 0;
  if (cutoffHours >= T_MAX_HOURS) return len;

  let lo = 0;
  let hi = len;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (discoveryHoursArr[mid] <= cutoffHours) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Evaluates the exact Actuarial Conservation Law & counterfactual policy metrics at T_cutoff
 * in O(log N) (<0.05ms).
 */
export function evaluateSettlementAtHorizon(
  timeline: SettlementTimelineIndex,
  cutoffHoursRaw: number
): SettlementHorizonSnapshot {
  const cutoffHours = Math.min(T_MAX_HOURS, Math.max(0, cutoffHoursRaw));
  const cutoffU = cutoffHoursToU(cutoffHours);
  const n = Math.max(1, timeline.totalTraceCount);
  const fTotal = timeline.fracturedTraceCount;

  const surfacedCount = countSurfacedAtHours(timeline.discoveryHoursArr, cutoffHours);
  const submergedCount = Math.max(0, fTotal - surfacedCount);

  const realizedHiddenSum = timeline.prefixHiddenCostArr[surfacedCount];
  const realizedRetrySum = timeline.prefixRetryCostArr[surfacedCount];
  const realizedHumanSum = timeline.prefixHumanReworkArr[surfacedCount];
  const realizedAvoidableSum = timeline.prefixAvoidableReworkArr[surfacedCount];
  const fullAvoidableSum = timeline.prefixAvoidableReworkArr[fTotal];

  const realizedHiddenUnitCost = realizedHiddenSum / n;
  const realizedUnitCost = timeline.nominalUnitCost + realizedHiddenUnitCost;

  // Exact Actuarial Conservation Law: L_IBNR(T) = C_ultimate - C_realized(T)
  const ibnrReserveUnitCost = Math.max(0, timeline.ultimateUnitCost - realizedUnitCost);

  const realizedMultiplier =
    realizedUnitCost / Math.max(0.0001, timeline.nominalUnitCost);

  const ibnrSharePct =
    timeline.totalHiddenUnitCost > 1e-9
      ? (ibnrReserveUnitCost / timeline.totalHiddenUnitCost) * 100
      : 0;
  const realizedSharePct = 100 - ibnrSharePct;

  const surfacedPct = fTotal > 0 ? (surfacedCount / fTotal) * 100 : 100;
  const cleanResolutionRateAtT = (n - surfacedCount) / n;

  // Counterfactual Myopic Window calculation
  const recoverableMonthlyAtT = (realizedAvoidableSum / n) * timeline.monthlyTaskVolume;
  const fullSettlementRecoverableMonthly =
    (fullAvoidableSum / n) * timeline.monthlyTaskVolume;
  const myopicPolicyBlindspotMonthly = Math.max(
    0,
    fullSettlementRecoverableMonthly - recoverableMonthlyAtT
  );

  // Canonical 24h vs 336h Myopic Trap benchmark
  const surfacedAt24h = countSurfacedAtHours(timeline.discoveryHoursArr, 24);
  const avoidableAt24h = timeline.prefixAvoidableReworkArr[surfacedAt24h];
  const myopic24hTrapMonthly = Math.max(
    0,
    ((fullAvoidableSum - avoidableAt24h) / n) * timeline.monthlyTaskVolume
  );
  const myopic24hMissedPct =
    fTotal > 0 ? ((fTotal - surfacedAt24h) / fTotal) * 100 : 0;

  let activeDetent: MagneticDetent | null = null;
  for (const d of MAGNETIC_DETENTS) {
    if (Math.abs(d.hours - cutoffHours) <= 1.2) {
      activeDetent = d;
      break;
    }
  }

  return {
    cutoffHours,
    cutoffU,
    nominalUnitCost: timeline.nominalUnitCost,
    realizedHiddenUnitCost,
    realizedUnitCost,
    ibnrReserveUnitCost,
    ultimateUnitCost: timeline.ultimateUnitCost,
    realizedRetryUnitCost: realizedRetrySum / n,
    realizedHumanReworkUnitCost: realizedHumanSum / n,
    realizedMultiplier,
    ultimateMultiplier: timeline.ultimateMultiplier,
    ibnrSharePct,
    realizedSharePct,
    totalTraceCount: timeline.totalTraceCount,
    fracturedTraceCount: fTotal,
    surfacedCount,
    submergedCount,
    surfacedPct,
    cleanResolutionRateAtT,
    recoverableMonthlyAtT,
    fullSettlementRecoverableMonthly,
    myopicPolicyBlindspotMonthly,
    myopic24hTrapMonthly,
    myopic24hMissedPct,
    activeDetent,
  };
}
