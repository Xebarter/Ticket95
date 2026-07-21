import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  ensureAffiliateForUser,
  getAffiliateSettings,
} from '@/lib/affiliates';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const settings = await getAffiliateSettings();
    const affiliate = await ensureAffiliateForUser(session.userId, session.email);

    const { data: commissionsRaw, error: commissionsError } = await supabaseAdmin
      .from('affiliate_commissions')
      .select(
        'id, order_id, event_id, order_amount, commission_percent, commission_amount, currency, status, paid_at, created_at'
      )
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (commissionsError) throw commissionsError;

    const commissionRows = commissionsRaw || [];
    const eventIds = [...new Set(commissionRows.map((c) => c.event_id).filter(Boolean))];
    const { data: commissionEvents } = eventIds.length
      ? await supabaseAdmin.from('events').select('id, name').in('id', eventIds)
      : { data: [] as Array<{ id: string; name: string }> };
    const eventNameById = new Map((commissionEvents || []).map((e) => [e.id, e.name]));

    const nowIso = new Date().toISOString();
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('id, name, date, venue, currency, image_url, tickets_available, status')
      .eq('status', 'approved')
      .eq('affiliates_enabled', true)
      .gt('date', nowIso)
      .order('date', { ascending: true })
      .limit(100);

    if (eventsError) throw eventsError;

    const rows = commissionRows.map((row) => ({
      ...row,
      events: { name: eventNameById.get(row.event_id) || 'Event' },
    }));
    const totals = rows.reduce(
      (acc, row) => {
        const amount = Number(row.commission_amount) || 0;
        acc.lifetime += amount;
        if (row.status === 'pending' || row.status === 'approved') acc.pending += amount;
        if (row.status === 'paid') acc.paid += amount;
        acc.sales += 1;
        return acc;
      },
      { lifetime: 0, pending: 0, paid: 0, sales: 0 }
    );

    return NextResponse.json({
      success: true,
      settings,
      affiliate,
      events: events || [],
      commissions: rows,
      totals,
    });
  } catch (error) {
    console.error('Affiliate me GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load affiliate dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
