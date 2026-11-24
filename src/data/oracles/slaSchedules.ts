import { SLAPolicySchedule } from '../../types/economics';
import { SLASeverityTier } from '../../types/telemetry';

/**
 * Enterprise B2B Contractual SLA Breach Penalty Curves.
 * Models incident service-credit accruals triggered when autonomous + escalated
 * end-to-end resolution time exceeds contracted severity thresholds.
 */
export const SLA_SCHEDULES: Record<SLASeverityTier, SLAPolicySchedule> = {
  P1: {
    tier: 'P1',
    label: 'P1 · Critical Mission Impact',
    description: 'Immediate financial/travel disruption or production outage (< 15 min target).',
    targetResolutionMinutes: 15,
    graceBufferMinutes: 0,
    penaltyPerHourUsd: 500,
    flatBreachFeeUsd: 45,
    maxCreditCapUsd: 2500,
  },
  P2: {
    tier: 'P2',
    label: 'P2 · High Priority Degradation',
    description: 'Major workflow impairment, complex rebooking, or core PR defect (< 120 min target).',
    targetResolutionMinutes: 120,
    graceBufferMinutes: 10,
    penaltyPerHourUsd: 275,
    flatBreachFeeUsd: 25,
    maxCreditCapUsd: 1200,
  },
  P3: {
    tier: 'P3',
    label: 'P3 · Standard Operational Ticket',
    description: 'Routine retail exchange, policy lookup, or non-blocking issue (< 480 min target).',
    targetResolutionMinutes: 480,
    graceBufferMinutes: 30,
    penaltyPerHourUsd: 150,
    flatBreachFeeUsd: 10,
    maxCreditCapUsd: 600,
  },
};

export function resolveSLAPolicy(tier: SLASeverityTier): SLAPolicySchedule {
  return SLA_SCHEDULES[tier] ?? SLA_SCHEDULES.P2;
}
