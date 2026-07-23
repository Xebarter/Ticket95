/** Client-safe affiliate constants (no server imports). */
export const AFFILIATE_REF_STORAGE_KEY = 'ticket95_affiliate_ref';
export const DEFAULT_AFFILIATE_COMMISSION_PERCENT = 5;
export const MIN_AFFILIATE_COMMISSION_PERCENT = 5;
export const MAX_AFFILIATE_COMMISSION_PERCENT = 100;

/** Clamp a commission percent into the allowed range (min 5%, max 100%). */
export function clampAffiliateCommissionPercent(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_AFFILIATE_COMMISSION_PERCENT;
  return Math.min(
    MAX_AFFILIATE_COMMISSION_PERCENT,
    Math.max(MIN_AFFILIATE_COMMISSION_PERCENT, n)
  );
}
