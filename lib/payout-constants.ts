/** Client-safe payout / fee constants. */
export const GATEWAY_FEE_PERCENT = 3.5;
export const PLATFORM_FEE_PERCENT = 2;
/** Combined cut taken before organizer (and after affiliate when present). */
export const TOTAL_PLATFORM_AND_GATEWAY_PERCENT = GATEWAY_FEE_PERCENT + PLATFORM_FEE_PERCENT;
export const MIN_PAYOUT_AMOUNT_UGX = 20_000;
/** Minimum days between disbursement requests (pending/processing/success). */
export const PAYOUT_COOLDOWN_DAYS = 5;
export const PAYOUT_CURRENCY = 'UGX';
export const PAYOUT_COUNTRY = 'UG';

export const PAYOUT_STATUSES = [
  'pending',
  'processing',
  'success',
  'error',
  'cancelled',
] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_PAYEE_TYPES = ['organizer', 'affiliate'] as const;
export type PayoutPayeeType = (typeof PAYOUT_PAYEE_TYPES)[number];

/** Statuses that reduce available balance. */
export const PAYOUT_BALANCE_LOCK_STATUSES: PayoutStatus[] = [
  'pending',
  'processing',
  'success',
];

/** Format a cooldown end date for user-facing copy. */
export function formatPayoutEligibleDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-UG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function payoutCooldownPolicyMessage(days = PAYOUT_COOLDOWN_DAYS): string {
  return `Disbursements are limited to once every ${days} days.`;
}

export function payoutCooldownBlockedMessage(nextPayoutAt: string): string {
  return `Your next payout can be requested on ${formatPayoutEligibleDate(nextPayoutAt)}.`;
}