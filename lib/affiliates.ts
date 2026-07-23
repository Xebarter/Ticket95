import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  clampAffiliateCommissionPercent,
} from '@/lib/affiliate-constants';

export {
  AFFILIATE_REF_STORAGE_KEY,
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  MIN_AFFILIATE_COMMISSION_PERCENT,
  MAX_AFFILIATE_COMMISSION_PERCENT,
  clampAffiliateCommissionPercent,
} from '@/lib/affiliate-constants';

export type AffiliateRow = {
  id: string;
  user_id: string;
  referral_code: string;
  status: 'active' | 'suspended';
  payout_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateCommissionRow = {
  id: string;
  affiliate_id: string;
  order_id: string;
  event_id: string;
  buyer_user_id: string | null;
  order_amount: number;
  commission_percent: number;
  commission_amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AffiliateSettings = {
  programEnabled: boolean;
  commissionPercent: number;
};

function generateReferralCode(seed?: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const base = (seed || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  let random = '';
  for (let i = 0; i < 6; i += 1) {
    random += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${base || 'T95'}${random}`.slice(0, 10);
}

export async function getAffiliateSettings(): Promise<AffiliateSettings> {
  const { data, error } = await supabaseAdmin
    .from('platform_settings')
    .select('key, value')
    .in('key', ['affiliate_program_enabled', 'affiliate_commission_percent']);

  if (error) throw error;

  const map = new Map((data || []).map((row) => [row.key, row.value]));
  const enabledRaw = map.get('affiliate_program_enabled');
  const percentRaw = map.get('affiliate_commission_percent');

  let programEnabled = true;
  if (enabledRaw === false || enabledRaw === 'false') programEnabled = false;
  else if (enabledRaw === true || enabledRaw === 'true') programEnabled = true;

  let commissionPercent = DEFAULT_AFFILIATE_COMMISSION_PERCENT;
  if (typeof percentRaw === 'number') {
    commissionPercent = percentRaw;
  } else if (typeof percentRaw === 'string' && percentRaw.trim() !== '') {
    const parsed = Number(percentRaw);
    if (!Number.isNaN(parsed)) commissionPercent = parsed;
  }

  return {
    programEnabled,
    // Platform default for new events / fallback when an event rate is missing
    commissionPercent: clampAffiliateCommissionPercent(commissionPercent),
  };
}

export async function setAffiliateSettings(
  settings: Partial<AffiliateSettings>,
  updatedBy?: string
): Promise<AffiliateSettings> {
  const current = await getAffiliateSettings();
  const next: AffiliateSettings = {
    programEnabled:
      typeof settings.programEnabled === 'boolean' ? settings.programEnabled : current.programEnabled,
    commissionPercent:
      typeof settings.commissionPercent === 'number'
        ? clampAffiliateCommissionPercent(settings.commissionPercent)
        : current.commissionPercent,
  };

  const rows = [
    {
      key: 'affiliate_program_enabled',
      value: next.programEnabled,
      updated_by: updatedBy || null,
    },
    {
      key: 'affiliate_commission_percent',
      value: next.commissionPercent,
      updated_by: updatedBy || null,
    },
  ];

  const { error } = await supabaseAdmin.from('platform_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  return next;
}

export async function getAffiliateByUserId(userId: string): Promise<AffiliateRow | null> {
  const { data, error } = await supabaseAdmin
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAffiliateByReferralCode(code: string): Promise<AffiliateRow | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const { data, error } = await supabaseAdmin
    .from('affiliates')
    .select('*')
    .eq('referral_code', normalized)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureAffiliateForUser(userId: string, email?: string): Promise<AffiliateRow> {
  const existing = await getAffiliateByUserId(userId);
  if (existing) return existing;

  const emailSeed = (email || '').split('@')[0] || '';
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referral_code = generateReferralCode(emailSeed);
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert([{ user_id: userId, referral_code, status: 'active' }])
      .select()
      .single();

    if (!error && data) return data as AffiliateRow;

    // Unique violation — retry with a new code
    if (error && (error as { code?: string }).code === '23505') {
      lastError = error;
      continue;
    }

    // Race: another request created the row
    const raced = await getAffiliateByUserId(userId);
    if (raced) return raced;

    throw error || lastError;
  }

  throw lastError || new Error('Failed to create affiliate profile');
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export async function createAffiliateCommissionForOrder(params: {
  orderId: string;
  eventId: string;
  buyerUserId: string | null;
  orderAmount: number;
  currency: string;
  affiliateId: string;
  commissionPercent: number;
}): Promise<AffiliateCommissionRow | null> {
  const commissionAmount = roundMoney(
    (Number(params.orderAmount) || 0) * (params.commissionPercent / 100)
  );

  if (commissionAmount <= 0) return null;

  const { data, error } = await supabaseAdmin
    .from('affiliate_commissions')
    .upsert(
      [
        {
          affiliate_id: params.affiliateId,
          order_id: params.orderId,
          event_id: params.eventId,
          buyer_user_id: params.buyerUserId,
          order_amount: roundMoney(params.orderAmount),
          commission_percent: params.commissionPercent,
          commission_amount: commissionAmount,
          currency: params.currency || 'USD',
          status: 'pending',
        },
      ],
      { onConflict: 'order_id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) {
    // Duplicate order commission is fine (idempotent complete)
    if ((error as { code?: string }).code === '23505') return null;
    throw error;
  }

  return data;
}
