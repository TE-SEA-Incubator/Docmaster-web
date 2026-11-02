/**
 * Single source of truth for every delay shared between the server and the
 * clients (matching, payment polling, recovery code lifetime, email codes).
 *
 * Anything a screen displays or waits for must come from here so the two
 * clocks cannot drift apart again. Values can be overridden by env vars.
 */
function envNumber(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const TIMING = {
  matchingIntervalMs: 8 * 60 * 60 * 1000,
  matchingCron: '0 */8 * * *',

  paymentPollIntervalMs: 5_000,
  paymentPollTimeoutMs: 300_000,
  paymentPhaseOperatorMs: 60_000,
  paymentPhaseProcessingMs: 120_000,

  claimCodeTtlHours: envNumber('CLAIM_CODE_TTL_HOURS', 72),
  emailVerificationTtlMinutes: envNumber('EMAIL_VERIFICATION_TTL_MINUTES', 10),
  payoutMaxAgeHours: envNumber('PAYOUT_MAX_AGE_HOURS', 24),
} as const;

export type PublicTiming = Pick<
  typeof TIMING,
  | 'matchingIntervalMs'
  | 'paymentPollIntervalMs'
  | 'paymentPollTimeoutMs'
  | 'paymentPhaseOperatorMs'
  | 'paymentPhaseProcessingMs'
  | 'claimCodeTtlHours'
  | 'emailVerificationTtlMinutes'
>;

export function getPublicTiming(): PublicTiming {
  return {
    matchingIntervalMs: TIMING.matchingIntervalMs,
    paymentPollIntervalMs: TIMING.paymentPollIntervalMs,
    paymentPollTimeoutMs: TIMING.paymentPollTimeoutMs,
    paymentPhaseOperatorMs: TIMING.paymentPhaseOperatorMs,
    paymentPhaseProcessingMs: TIMING.paymentPhaseProcessingMs,
    claimCodeTtlHours: TIMING.claimCodeTtlHours,
    emailVerificationTtlMinutes: TIMING.emailVerificationTtlMinutes,
  };
}
