import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPaytotaAccountBalance } from '@/lib/paytota';
import { roundMoney } from '@/lib/affiliates';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const payeeType = searchParams.get('payeeType');
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    let query = supabaseAdmin
      .from('payouts')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(200);

    if (status && ['pending', 'processing', 'success', 'error', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }
    if (payeeType && ['organizer', 'affiliate'].includes(payeeType)) {
      query = query.eq('payee_type', payeeType);
    }

    const { data: payoutsRaw, error } = await query;
    if (error) throw error;

    let payouts = payoutsRaw || [];
    if (q) {
      payouts = payouts.filter((row) => {
        const hay = [
          row.phone,
          row.email,
          row.paytota_reference,
          row.paytota_payout_id,
          row.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const userIds = [...new Set(payouts.map((p) => p.payee_user_id).filter(Boolean))];
    const { data: usersRaw } = userIds.length
      ? await supabaseAdmin.from('users').select('id, email, profile_name').in('id', userIds)
      : { data: [] as Array<{ id: string; email: string; profile_name: string | null }> };

    const usersById = new Map((usersRaw || []).map((u) => [u.id, u]));

    const enriched = payouts.map((row) => {
      const user = usersById.get(row.payee_user_id);
      return {
        ...row,
        payee_email: user?.email || row.email || '—',
        payee_name: user?.profile_name || null,
      };
    });

    const totals = {
      pending: 0,
      processing: 0,
      success: 0,
      error: 0,
      cancelled: 0,
      count: enriched.length,
    };
    for (const row of enriched) {
      const key = row.status as keyof typeof totals;
      if (key in totals && typeof totals[key] === 'number') {
        totals[key] = roundMoney(totals[key] + (Number(row.amount) || 0));
      }
    }

    // Platform fees accrued from completed orders (best-effort)
    const { data: feeRows } = await supabaseAdmin
      .from('orders')
      .select('platform_fee_amount, total_price')
      .eq('status', 'completed')
      .limit(5000);

    let platformFeesAccrued = 0;
    for (const row of feeRows || []) {
      if (row.platform_fee_amount != null) {
        platformFeesAccrued += Number(row.platform_fee_amount) || 0;
      } else {
        platformFeesAccrued += ((Number(row.total_price) || 0) * 2) / 100;
      }
    }
    platformFeesAccrued = roundMoney(platformFeesAccrued);

    let paytotaBalance: Record<string, unknown> | null = null;
    try {
      paytotaBalance = (await getPaytotaAccountBalance()) as Record<string, unknown>;
    } catch (err) {
      console.warn('Paytota balance fetch failed:', err);
    }

    return NextResponse.json({
      payouts: enriched,
      totals,
      platformFeesAccrued,
      paytotaBalance,
    });
  } catch (error: unknown) {
    console.error('Admin payouts list error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load payouts';
    const status = message.includes('Admin') || message.includes('session') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
