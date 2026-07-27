/** Client-safe payout / fee constants. */
export const GATEWAY_FEE_PERCENT = 3.5;
export const PLATFORM_FEE_PERCENT = 2;
/** Combined cut taken before organizer (and after affiliate when present). */
export const TOTAL_PLATFORM_AND_GATEWAY_PERCENT = GATEWAY_FEE_PERCENT + PLATFORM_FEE_PERCENT;
export const MIN_PAYOUT_AMOUNT_UGX = 20_000;
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
