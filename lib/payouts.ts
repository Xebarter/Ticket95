import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAffiliateByUserId, roundMoney } from '@/lib/affiliates';
import { computeOrderShares, resolveOrganizerShare } from '@/lib/order-shares';
import {
  MIN_PAYOUT_AMOUNT_UGX,
  PAYOUT_BALANCE_LOCK_STATUSES,
  PAYOUT_COUNTRY,
  PAYOUT_CURRENCY,
  type PayoutPayeeType,
  type PayoutStatus,
} from '@/lib/payout-constants';
import {
  createPaytotaPayout,
  executePaytotaPayout,
  getPaytotaPayoutStatus,
  isPaytotaPayoutFailed,
  isPaytotaPayoutSuccessful,
  normalizeUgandaMomoPhone,
} from '@/lib/paytota';
import type { Payout } from '@/lib/supabase-client';

export type OrganizerBalanceSummary = {
  currency: string;
  grossRevenue: number;
  gatewayFees: number;
  platformFees: number;
  affiliateDeductions: number;
  organizerEarned: number;
  paidOut: number;
  lockedInPayouts: number;
  available: number;
  minPayout: number;
  canRequest: boolean;
  payoutPhone: string | null;
  email: string;
  recentPayouts: Payout[];
  perEvent: Array<{
    eventId: string;
    eventName: string;
    grossRevenue: number;
    organizerShare: number;
    affiliateDeductions: number;
  }>;
};

export type AffiliateBalanceSummary = {
  currency: string;
  available: number;
  pendingCommissions: number;
  paidCommissions: number;
  lifetime: number;
  lockedInPayouts: number;
  minPayout: number;
  canRequest: boolean;
  payoutPhone: string | null;
  email: string;
  affiliateId: string;
  referralCode: string;
  recentPayouts: Payout[];
};

type CompletedOrderShareRow = {
  id: string;
  event_id: string;
  total_price: number;
  currency?: string | null;
  gateway_fee_amount?: number | null;
  platform_fee_amount?: number | null;
  affiliate_share_amount?: number | null;
  organizer_share_amount?: number | null;
  affiliate_id?: string | null;
};

function sumAmounts(values: number[]): number {
  return roundMoney(values.reduce((sum, n) => sum + n, 0));
}

async function getUserContact(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, payout_phone, profile_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('User not found');
  return data;
}

async function listUserPayouts(userId: string, payeeType: PayoutPayeeType, limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('payee_user_id', userId)
    .eq('payee_type', payeeType)
    .order('requested_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Payout[];
}

async function sumLockedPayouts(userId: string, payeeType: PayoutPayeeType) {
  const { data, error } = await supabaseAdmin
    .from('payouts')
    .select('amount, status')
    .eq('payee_user_id', userId)
    .eq('payee_type', payeeType)
    .in('status', PAYOUT_BALANCE_LOCK_STATUSES);
  if (error) throw error;
  return sumAmounts((data || []).map((row) => Number(row.amount) || 0));
}

function sharesForOrder(order: CompletedOrderShareRow, affiliatePercentFallback = 0) {
  if (
    order.organizer_share_amount != null &&
    order.gateway_fee_amount != null &&
    order.platform_fee_amount != null
  ) {
    return {
      gatewayFee: roundMoney(Number(order.gateway_fee_amount) || 0),
      platformFee: roundMoney(Number(order.platform_fee_amount) || 0),
      affiliateShare: roundMoney(Number(order.affiliate_share_amount) || 0),
      organizerShare: roundMoney(Number(order.organizer_share_amount) || 0),
      totalPrice: roundMoney(Number(order.total_price) || 0),
    };
  }

  // Legacy orders: infer affiliate % from affiliate_share or attribution
  let affiliatePercent = affiliatePercentFallback;
  if (order.affiliate_share_amount != null && Number(order.total_price) > 0) {
    affiliatePercent =
      (Number(order.affiliate_share_amount) / Number(order.total_price)) * 100;
  } else if (order.affiliate_id) {
    // Unknown historic rate — use 10% default for attributed orders without share cols
    affiliatePercent = affiliatePercent || 10;
  }

  const computed = computeOrderShares({
    totalPrice: Number(order.total_price) || 0,
    affiliateCommissionPercent: affiliatePercent,
  });

  return {
    gatewayFee: computed.gatewayFee,
    platformFee: computed.platformFee,
    affiliateShare: computed.affiliateShare,
    organizerShare: computed.organizerShare,
    totalPrice: computed.totalPrice,
  };
}

export async function getOrganizerBalance(userId: string): Promise<OrganizerBalanceSummary> {
  const user = await getUserContact(userId);

  const { data: events, error: eventsError } = await supabaseAdmin
    .from('events')
    .select('id, name, affiliate_commission_percent')
    .eq('organizer_id', userId);
  if (eventsError) throw eventsError;

  const eventRows = events || [];
  const eventIds = eventRows.map((e) => e.id);
  const eventNameById = new Map(eventRows.map((e) => [e.id, e.name]));
  const eventAffiliatePct = new Map(
    eventRows.map((e) => [e.id, Number(e.affiliate_commission_percent) || 0])
  );

  if (eventIds.length === 0) {
    const recentPayouts = await listUserPayouts(userId, 'organizer');
    return {
      currency: PAYOUT_CURRENCY,
      grossRevenue: 0,
      gatewayFees: 0,
      platformFees: 0,
      affiliateDeductions: 0,
      organizerEarned: 0,
      paidOut: 0,
      lockedInPayouts: 0,
      available: 0,
      minPayout: MIN_PAYOUT_AMOUNT_UGX,
      canRequest: false,
      payoutPhone: user.payout_phone || null,
      email: user.email,
      recentPayouts,
      perEvent: [],
    };
  }

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select(
      'id, event_id, total_price, currency, gateway_fee_amount, platform_fee_amount, affiliate_share_amount, organizer_share_amount, affiliate_id'
    )
    .in('event_id', eventIds)
    .eq('status', 'completed');
  if (ordersError) throw ordersError;

  const perEventMap = new Map<
    string,
    { eventId: string; eventName: string; grossRevenue: number; organizerShare: number; affiliateDeductions: number }
  >();

  let grossRevenue = 0;
  let gatewayFees = 0;
  let platformFees = 0;
  let affiliateDeductions = 0;
  let organizerEarned = 0;

  for (const order of (orders || []) as CompletedOrderShareRow[]) {
    const shares = sharesForOrder(order, eventAffiliatePct.get(order.event_id) || 0);
    // If order had no affiliate, force affiliate share 0 even if event has a default %
    const effective =
      order.affiliate_id || (Number(order.affiliate_share_amount) || 0) > 0
        ? shares
        : computeOrderShares({ totalPrice: Number(order.total_price) || 0, affiliateCommissionPercent: 0 });

    // Prefer persisted organizer share when present
    const organizerShare =
      order.organizer_share_amount != null
        ? resolveOrganizerShare(order)
        : effective.organizerShare;
    const affiliateShare =
      order.affiliate_share_amount != null
        ? roundMoney(Number(order.affiliate_share_amount) || 0)
        : order.affiliate_id
          ? effective.affiliateShare
          : 0;
    const gatewayFee =
      order.gateway_fee_amount != null
        ? roundMoney(Number(order.gateway_fee_amount) || 0)
        : effective.gatewayFee;
    const platformFee =
      order.platform_fee_amount != null
        ? roundMoney(Number(order.platform_fee_amount) || 0)
        : effective.platformFee;

    grossRevenue += effective.totalPrice;
    gatewayFees += gatewayFee;
    platformFees += platformFee;
    affiliateDeductions += affiliateShare;
    organizerEarned += organizerShare;

    const existing = perEventMap.get(order.event_id) || {
      eventId: order.event_id,
      eventName: eventNameById.get(order.event_id) || 'Event',
      grossRevenue: 0,
      organizerShare: 0,
      affiliateDeductions: 0,
    };
    existing.grossRevenue += effective.totalPrice;
    existing.organizerShare += organizerShare;
    existing.affiliateDeductions += affiliateShare;
    perEventMap.set(order.event_id, existing);
  }

  const lockedInPayouts = await sumLockedPayouts(userId, 'organizer');
  const { data: successPayouts } = await supabaseAdmin
    .from('payouts')
    .select('amount')
    .eq('payee_user_id', userId)
    .eq('payee_type', 'organizer')
    .eq('status', 'success');
  const paidOut = sumAmounts((successPayouts || []).map((r) => Number(r.amount) || 0));

  const available = roundMoney(Math.max(0, organizerEarned - lockedInPayouts));
  const recentPayouts = await listUserPayouts(userId, 'organizer');

  return {
    currency: PAYOUT_CURRENCY,
    grossRevenue: roundMoney(grossRevenue),
    gatewayFees: roundMoney(gatewayFees),
    platformFees: roundMoney(platformFees),
    affiliateDeductions: roundMoney(affiliateDeductions),
    organizerEarned: roundMoney(organizerEarned),
    paidOut,
    lockedInPayouts,
    available,
    minPayout: MIN_PAYOUT_AMOUNT_UGX,
    canRequest: available >= MIN_PAYOUT_AMOUNT_UGX,
    payoutPhone: user.payout_phone || null,
    email: user.email,
    recentPayouts,
    perEvent: [...perEventMap.values()].map((row) => ({
      ...row,
      grossRevenue: roundMoney(row.grossRevenue),
      organizerShare: roundMoney(row.organizerShare),
      affiliateDeductions: roundMoney(row.affiliateDeductions),
    })),
  };
}

export async function getAffiliateBalance(userId: string): Promise<AffiliateBalanceSummary> {
  const user = await getUserContact(userId);
  const affiliate = await getAffiliateByUserId(userId);
  if (!affiliate) {
    throw new Error('Affiliate profile not found. Open the affiliate dashboard first.');
  }

  const { data: commissions, error } = await supabaseAdmin
    .from('affiliate_commissions')
    .select('id, commission_amount, status, payout_id, currency')
    .eq('affiliate_id', affiliate.id);
  if (error) throw error;

  let pendingCommissions = 0;
  let paidCommissions = 0;
  let lifetime = 0;
  let availableFromCommissions = 0;

  for (const row of commissions || []) {
    const amount = Number(row.commission_amount) || 0;
    if (row.status === 'cancelled') continue;
    lifetime += amount;
    if (row.status === 'paid') {
      paidCommissions += amount;
      continue;
    }
    if (row.status === 'pending' || row.status === 'approved') {
      pendingCommissions += amount;
      if (!row.payout_id) {
        availableFromCommissions += amount;
      }
    }
  }

  // Also subtract pending/processing payouts that already locked commissions
  const lockedInPayouts = await sumLockedPayouts(userId, 'affiliate');
  // Available is commissions not yet linked; locked payouts already linked so don't double-subtract
  const available = roundMoney(Math.max(0, availableFromCommissions));
  const recentPayouts = await listUserPayouts(userId, 'affiliate');

  return {
    currency: PAYOUT_CURRENCY,
    available,
    pendingCommissions: roundMoney(pendingCommissions),
    paidCommissions: roundMoney(paidCommissions),
    lifetime: roundMoney(lifetime),
    lockedInPayouts,
    minPayout: MIN_PAYOUT_AMOUNT_UGX,
    canRequest: available >= MIN_PAYOUT_AMOUNT_UGX,
    payoutPhone: user.payout_phone || null,
    email: user.email,
    affiliateId: affiliate.id,
    referralCode: affiliate.referral_code,
    recentPayouts,
  };
}

async function persistPayoutPhone(userId: string, phone: string) {
  await supabaseAdmin.from('users').update({ payout_phone: phone }).eq('id', userId);
}

async function runPaytotaDisbursement(payoutId: string) {
  const { data: payout, error } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single();
  if (error || !payout) throw error || new Error('Payout not found');

  try {
    let paytotaId = payout.paytota_payout_id as string | null;
    let executionUrl = payout.execution_url as string | null;
    let metadata = (payout.paytota_metadata || {}) as Record<string, unknown>;

    if (!paytotaId || !executionUrl) {
      const created = await createPaytotaPayout({
        email: payout.email || 'payouts@ticket95.com',
        phone: payout.phone,
        country: payout.country || PAYOUT_COUNTRY,
        currency: payout.currency || PAYOUT_CURRENCY,
        amount: Number(payout.amount),
        description:
          payout.payee_type === 'affiliate'
            ? 'Ticket95 affiliate commission payout'
            : 'Ticket95 organizer payout',
        reference: payout.paytota_reference,
      });

      paytotaId = created.id;
      executionUrl = created.execution_url || null;
      metadata = { ...metadata, create: created.raw };

      await supabaseAdmin
        .from('payouts')
        .update({
          paytota_payout_id: paytotaId,
          execution_url: executionUrl,
          paytota_metadata: metadata,
          status: 'processing',
          error_message: null,
        })
        .eq('id', payoutId);

      if (!executionUrl) {
        // Some responses may omit execution_url — fetch status
        const status = await getPaytotaPayoutStatus(paytotaId);
        executionUrl = status.execution_url ? String(status.execution_url) : null;
        if (executionUrl) {
          await supabaseAdmin
            .from('payouts')
            .update({ execution_url: executionUrl })
            .eq('id', payoutId);
        }
      }
    }

    if (!executionUrl) {
      throw new Error('Paytota did not return an execution URL for this payout.');
    }

    const executed = await executePaytotaPayout(executionUrl);
    metadata = { ...metadata, execute: executed };

    await supabaseAdmin
      .from('payouts')
      .update({
        status: 'processing',
        paytota_metadata: metadata,
        error_message: null,
      })
      .eq('id', payoutId);

    return { payoutId, paytotaId, status: 'processing' as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payout disbursement failed';
    await markPayoutFailed(payoutId, message);
    throw err;
  }
}

export async function markPayoutFailed(payoutId: string, message: string) {
  const { data: payout } = await supabaseAdmin
    .from('payouts')
    .select('id, payee_type')
    .eq('id', payoutId)
    .maybeSingle();

  await supabaseAdmin
    .from('payouts')
    .update({
      status: 'error',
      error_message: message,
      processed_at: new Date().toISOString(),
    })
    .eq('id', payoutId);

  // Unlock affiliate commissions so they can be requested/retried
  if (payout?.payee_type === 'affiliate') {
    await supabaseAdmin
      .from('affiliate_commissions')
      .update({ payout_id: null })
      .eq('payout_id', payoutId)
      .in('status', ['pending', 'approved']);
  }
}

export async function markPayoutSuccess(payoutId: string, metadataExtra?: Record<string, unknown>) {
  const { data: payout, error } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single();
  if (error || !payout) throw error || new Error('Payout not found');

  const metadata = {
    ...((payout.paytota_metadata || {}) as Record<string, unknown>),
    ...(metadataExtra || {}),
  };

  await supabaseAdmin
    .from('payouts')
    .update({
      status: 'success',
      error_message: null,
      processed_at: new Date().toISOString(),
      paytota_metadata: metadata,
    })
    .eq('id', payoutId);

  if (payout.payee_type === 'affiliate') {
    await supabaseAdmin
      .from('affiliate_commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payout_id: payoutId,
      })
      .eq('payout_id', payoutId);
  }
}

export async function syncPayoutFromPaytota(payoutId: string) {
  const { data: payout, error } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single();
  if (error || !payout) throw error || new Error('Payout not found');
  if (!payout.paytota_payout_id) {
    throw new Error('Payout has not been submitted to Paytota yet.');
  }

  const remote = await getPaytotaPayoutStatus(payout.paytota_payout_id);
  const status = String(remote.status || '').toLowerCase();

  if (isPaytotaPayoutSuccessful(status)) {
    await markPayoutSuccess(payoutId, { sync: remote });
    return { status: 'success' as const };
  }

  if (isPaytotaPayoutFailed(status)) {
    await markPayoutFailed(
      payoutId,
      typeof (remote as { error?: { message?: string } }).error?.message === 'string'
        ? String((remote as { error: { message: string } }).error.message)
        : 'Paytota reported payout failure'
    );
    return { status: 'error' as const };
  }

  await supabaseAdmin
    .from('payouts')
    .update({
      status: status === 'initialized' ? 'pending' : 'processing',
      paytota_metadata: {
        ...((payout.paytota_metadata || {}) as Record<string, unknown>),
        sync: remote,
      },
      execution_url: remote.execution_url
        ? String(remote.execution_url)
        : payout.execution_url,
    })
    .eq('id', payoutId);

  return { status: (status || 'processing') as PayoutStatus };
}

export async function requestOrganizerPayout(params: {
  userId: string;
  amount?: number;
  phone: string;
}) {
  const phone = normalizeUgandaMomoPhone(params.phone);
  if (!phone) {
    throw new Error('Enter a valid Uganda mobile money number (e.g. 2567XXXXXXXX).');
  }

  const balance = await getOrganizerBalance(params.userId);
  const amount = roundMoney(
    params.amount != null ? Number(params.amount) : balance.available
  );

  if (amount < MIN_PAYOUT_AMOUNT_UGX) {
    throw new Error(`Minimum payout is UGX ${MIN_PAYOUT_AMOUNT_UGX.toLocaleString()}.`);
  }
  if (amount > balance.available + 0.001) {
    throw new Error('Requested amount exceeds your available balance.');
  }

  await persistPayoutPhone(params.userId, phone);

  const reference = `org_${params.userId.slice(0, 8)}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

  const { data: payout, error } = await supabaseAdmin
    .from('payouts')
    .insert([
      {
        payee_type: 'organizer',
        payee_user_id: params.userId,
        amount,
        currency: PAYOUT_CURRENCY,
        phone,
        email: balance.email,
        country: PAYOUT_COUNTRY,
        status: 'pending',
        paytota_reference: reference,
      },
    ])
    .select()
    .single();

  if (error || !payout) throw error || new Error('Failed to create payout request');

  try {
    await runPaytotaDisbursement(payout.id);
  } catch (err) {
    // Row already marked error inside runPaytotaDisbursement
    const message = err instanceof Error ? err.message : 'Disbursement failed';
    return { payout: { ...payout, status: 'error', error_message: message }, autoDisbursed: false };
  }

  const { data: refreshed } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payout.id)
    .single();

  return { payout: refreshed || payout, autoDisbursed: true };
}

export async function requestAffiliatePayout(params: {
  userId: string;
  amount?: number;
  phone: string;
}) {
  const phone = normalizeUgandaMomoPhone(params.phone);
  if (!phone) {
    throw new Error('Enter a valid Uganda mobile money number (e.g. 2567XXXXXXXX).');
  }

  const balance = await getAffiliateBalance(params.userId);
  const amount = roundMoney(
    params.amount != null ? Number(params.amount) : balance.available
  );

  if (amount < MIN_PAYOUT_AMOUNT_UGX) {
    throw new Error(`Minimum payout is UGX ${MIN_PAYOUT_AMOUNT_UGX.toLocaleString()}.`);
  }
  if (amount > balance.available + 0.001) {
    throw new Error('Requested amount exceeds your available balance.');
  }

  await persistPayoutPhone(params.userId, phone);

  const { data: eligible, error: eligibleError } = await supabaseAdmin
    .from('affiliate_commissions')
    .select('id, commission_amount')
    .eq('affiliate_id', balance.affiliateId)
    .in('status', ['pending', 'approved'])
    .is('payout_id', null)
    .order('created_at', { ascending: true });
  if (eligibleError) throw eligibleError;

  // Select commissions up to requested amount (FIFO, whole commissions only)
  const lockIds: string[] = [];
  let lockedTotal = 0;
  for (const row of eligible || []) {
    const rowAmount = Number(row.commission_amount) || 0;
    if (rowAmount <= 0) continue;
    if (lockedTotal >= amount) break;
    // Skip if this single commission would blow past request by a large margin when we already have some
    if (lockedTotal > 0 && lockedTotal + rowAmount > amount + 0.01) break;
    lockIds.push(row.id);
    lockedTotal = roundMoney(lockedTotal + rowAmount);
  }

  lockedTotal = roundMoney(lockedTotal);
  if (lockedTotal < MIN_PAYOUT_AMOUNT_UGX) {
    throw new Error(
      `Selected commissions total UGX ${lockedTotal.toLocaleString()}, below the UGX ${MIN_PAYOUT_AMOUNT_UGX.toLocaleString()} minimum.`
    );
  }

  const payoutAmount = lockedTotal;

  const reference = `aff_${balance.affiliateId.slice(0, 8)}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

  const { data: payout, error } = await supabaseAdmin
    .from('payouts')
    .insert([
      {
        payee_type: 'affiliate',
        payee_user_id: params.userId,
        affiliate_id: balance.affiliateId,
        amount: payoutAmount,
        currency: PAYOUT_CURRENCY,
        phone,
        email: balance.email,
        country: PAYOUT_COUNTRY,
        status: 'pending',
        paytota_reference: reference,
      },
    ])
    .select()
    .single();

  if (error || !payout) throw error || new Error('Failed to create payout request');

  const { error: lockError } = await supabaseAdmin
    .from('affiliate_commissions')
    .update({ payout_id: payout.id })
    .in('id', lockIds);
  if (lockError) {
    await supabaseAdmin.from('payouts').update({ status: 'cancelled' }).eq('id', payout.id);
    throw lockError;
  }

  try {
    await runPaytotaDisbursement(payout.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Disbursement failed';
    return { payout: { ...payout, status: 'error', error_message: message }, autoDisbursed: false };
  }

  const { data: refreshed } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payout.id)
    .single();

  return { payout: refreshed || payout, autoDisbursed: true };
}

export async function retryPayout(payoutId: string) {
  const { data: payout, error } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single();
  if (error || !payout) throw error || new Error('Payout not found');

  if (payout.status !== 'error' && payout.status !== 'pending') {
    throw new Error('Only failed or pending payouts can be retried.');
  }

  // Re-lock affiliate commissions if needed
  if (payout.payee_type === 'affiliate' && payout.affiliate_id) {
    const { data: linked } = await supabaseAdmin
      .from('affiliate_commissions')
      .select('id')
      .eq('payout_id', payoutId)
      .limit(1);

    if (!linked?.length) {
      const { data: eligible } = await supabaseAdmin
        .from('affiliate_commissions')
        .select('id, commission_amount')
        .eq('affiliate_id', payout.affiliate_id)
        .in('status', ['pending', 'approved'])
        .is('payout_id', null)
        .order('created_at', { ascending: true });

      let remaining = Number(payout.amount) || 0;
      const lockIds: string[] = [];
      for (const row of eligible || []) {
        if (remaining <= 0) break;
        lockIds.push(row.id);
        remaining = roundMoney(remaining - (Number(row.commission_amount) || 0));
      }
      if (lockIds.length) {
        await supabaseAdmin
          .from('affiliate_commissions')
          .update({ payout_id: payoutId })
          .in('id', lockIds);
      }
    }
  }

  // Clear previous Paytota ids so a fresh create+execute runs
  await supabaseAdmin
    .from('payouts')
    .update({
      status: 'pending',
      error_message: null,
      paytota_payout_id: null,
      execution_url: null,
      paytota_reference: `${payout.paytota_reference}_r${Date.now().toString(36).slice(-4)}`,
      processed_at: null,
    })
    .eq('id', payoutId);

  await runPaytotaDisbursement(payoutId);

  const { data: refreshed } = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single();

  return refreshed;
}

export async function findPayoutByPaytotaIdOrReference(params: {
  paytotaId?: string;
  reference?: string;
}) {
  if (params.paytotaId) {
    const { data } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('paytota_payout_id', params.paytotaId)
      .maybeSingle();
    if (data) return data as Payout;
  }
  if (params.reference) {
    const { data } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('paytota_reference', params.reference)
      .maybeSingle();
    if (data) return data as Payout;
  }
  return null;
}
