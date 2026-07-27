import {
  GATEWAY_FEE_PERCENT,
  PLATFORM_FEE_PERCENT,
} from '@/lib/payout-constants';

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export type OrderSharesInput = {
  totalPrice: number;
  /** Null/undefined/0 means no affiliate cut on this order. */
  affiliateCommissionPercent?: number | null;
};

export type OrderShares = {
  totalPrice: number;
  gatewayFee: number;
  platformFee: number;
  affiliateShare: number;
  organizerShare: number;
  affiliateCommissionPercent: number;
};

/**
 * Split gross ticket total into gateway, platform, affiliate, and organizer shares.
 * All percents apply to gross `totalPrice` (not nested).
 */
export function computeOrderShares(input: OrderSharesInput): OrderShares {
  const totalPrice = roundMoney(Math.max(0, Number(input.totalPrice) || 0));
  const affiliateCommissionPercent = Math.max(
    0,
    Number(input.affiliateCommissionPercent) || 0
  );

  const gatewayFee = roundMoney((totalPrice * GATEWAY_FEE_PERCENT) / 100);
  const platformFee = roundMoney((totalPrice * PLATFORM_FEE_PERCENT) / 100);
  const affiliateShare = roundMoney((totalPrice * affiliateCommissionPercent) / 100);
  const organizerShare = roundMoney(
    Math.max(0, totalPrice - gatewayFee - platformFee - affiliateShare)
  );

  return {
    totalPrice,
    gatewayFee,
    platformFee,
    affiliateShare,
    organizerShare,
    affiliateCommissionPercent,
  };
}

/** Prefer persisted share columns; fall back to live compute for older orders. */
export function resolveOrganizerShare(order: {
  total_price?: number | null;
  organizer_share_amount?: number | null;
  affiliate_share_amount?: number | null;
  gateway_fee_amount?: number | null;
  platform_fee_amount?: number | null;
  affiliate_commission_percent?: number | null;
}): number {
  if (
    order.organizer_share_amount != null &&
    Number.isFinite(Number(order.organizer_share_amount))
  ) {
    return roundMoney(Number(order.organizer_share_amount));
  }

  const totalPrice = Number(order.total_price) || 0;
  const affiliatePercent =
    order.affiliate_commission_percent != null
      ? Number(order.affiliate_commission_percent)
      : order.affiliate_share_amount != null && totalPrice > 0
        ? (Number(order.affiliate_share_amount) / totalPrice) * 100
        : 0;

  return computeOrderShares({
    totalPrice,
    affiliateCommissionPercent: affiliatePercent,
  }).organizerShare;
}
