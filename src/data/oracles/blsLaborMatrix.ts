import { BLSOccupationBenchmark } from '../../types/economics';

/**
 * U.S. Bureau of Labor Statistics (BLS) Occupational Employment and Wage Statistics (OEWS)
 * paired with BLS Employer Costs for Employee Compensation (ECEC) 1.34x total employer burden factor
 * (covering payroll taxes, health insurance, retirement benefits, and paid leave).
 */
export const BLS_LABOR_MATRIX: Record<string, BLSOccupationBenchmark> = {
  '43-4051': {
    socCode: '43-4051',
    title: 'Customer Service Representatives',
    shortLabel: 'SOC 43-4051 · CX Rep',
    blsSeriesRef: 'OEUN000000000000043405103',
    surveyPeriod: 'BLS OEWS May 2023 / ECEC 2024',
    meanHourlyWageUsd: 20.45,
    medianHourlyWageUsd: 19.08,
    p75HourlyWageUsd: 23.85,
    loadedBurdenMultiplier: 1.34,
    loadedHourlyRateUsd: Number((20.45 * 1.34).toFixed(2)), // $27.40/hr
    typicalHandleMinutes: 14,
  },
  '15-1232': {
    socCode: '15-1232',
    title: 'Computer User Support Specialists',
    shortLabel: 'SOC 15-1232 · Support Spec',
    blsSeriesRef: 'OEUN000000000000015123203',
    surveyPeriod: 'BLS OEWS May 2023 / ECEC 2024',
    meanHourlyWageUsd: 30.15,
    medianHourlyWageUsd: 28.68,
    p75HourlyWageUsd: 36.2,
    loadedBurdenMultiplier: 1.34,
    loadedHourlyRateUsd: Number((30.15 * 1.34).toFixed(2)), // $40.40/hr
    typicalHandleMinutes: 24,
  },
  '15-1252': {
    socCode: '15-1252',
    title: 'Software Developers',
    shortLabel: 'SOC 15-1252 · Software Dev',
    blsSeriesRef: 'OEUN000000000000015125203',
    surveyPeriod: 'BLS OEWS May 2023 / ECEC 2024',
    meanHourlyWageUsd: 65.8,
    medianHourlyWageUsd: 63.59,
    p75HourlyWageUsd: 80.78,
    loadedBurdenMultiplier: 1.34,
    loadedHourlyRateUsd: Number((65.8 * 1.34).toFixed(2)), // $88.17/hr
    typicalHandleMinutes: 65,
  },
};

export function resolveBLSOccupation(socCode: string): BLSOccupationBenchmark {
  return BLS_LABOR_MATRIX[socCode] ?? BLS_LABOR_MATRIX['43-4051'];
}
