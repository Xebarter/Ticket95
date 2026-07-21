import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('affiliate_commissions')
      .select(
        'id, order_id, event_id, affiliate_id, order_amount, commission_percent, commission_amount, currency, status, paid_at, notes, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && ['pending', 'approved', 'paid', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: commissionsRaw, error } = await query;
    if (error) throw error;

    const commissionRows = commissionsRaw || [];
    const affiliateIds = [...new Set(commissionRows.map((c) => c.affiliate_id).filter(Boolean))];
    const eventIds = [...new Set(commissionRows.map((c) => c.event_id).filter(Boolean))];

    const [{ data: affiliatesForCommissions }, { data: eventsRaw }, { data: allAffiliates }] =
      await Promise.all([
        affiliateIds.length
          ? supabaseAdmin
              .from('affiliates')
              .select('id, referral_code, user_id, status')
              .in('id', affiliateIds)
          : Promise.resolve({ data: [] as Array<{ id: string; referral_code: string; user_id: string; status: string }> }),
        eventIds.length
          ? supabaseAdmin.from('events').select('id, name').in('id', eventIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
        supabaseAdmin
          .from('affiliates')
          .select('id, referral_code, status, user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

    const userIds = [
      ...new Set(
        [...(affiliatesForCommissions || []), ...(allAffiliates || [])]
          .map((a) => a.user_id)
          .filter(Boolean)
      ),
    ];

    const { data: usersRaw } = userIds.length
      ? await supabaseAdmin.from('users').select('id, email, profile_name').in('id', userIds)
      : { data: [] as Array<{ id: string; email: string; profile_name: string | null }> };

    const usersById = new Map((usersRaw || []).map((u) => [u.id, u]));
    const affiliatesById = new Map((affiliatesForCommissions || []).map((a) => [a.id, a]));
    const eventsById = new Map((eventsRaw || []).map((e) => [e.id, e]));

    const commissions = commissionRows.map((row) => {
      const affiliate = affiliatesById.get(row.affiliate_id);
      const user = affiliate ? usersById.get(affiliate.user_id) : null;
      return {
        ...row,
        event_name: eventsById.get(row.event_id)?.name || 'Event',
        affiliate_code: affiliate?.referral_code || '—',
        affiliate_email: user?.email || '—',
        affiliate_name: user?.profile_name || null,
      };
    });

    const affiliates = (allAffiliates || []).map((row) => {
      const user = usersById.get(row.user_id);
      return {
        ...row,
        email: user?.email || '—',
        profile_name: user?.profile_name || null,
      };
    });

    const totals = commissions.reduce(
      (acc, row) => {
        const amount = Number(row.commission_amount) || 0;
        acc.totalEarned += amount;
        if (row.status === 'pending' || row.status === 'approved') acc.totalPayable += amount;
        if (row.status === 'paid') acc.totalPaid += amount;
        return acc;
      },
      { totalEarned: 0, totalPayable: 0, totalPaid: 0 }
    );

    return NextResponse.json({
      success: true,
      commissions,
      affiliates,
      totals,
    });
  } catch (error) {
    console.error('Admin affiliates GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load affiliates';
    const statusCode = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const commissionId = typeof body?.commissionId === 'string' ? body.commissionId : '';
    const nextStatus = typeof body?.status === 'string' ? body.status : '';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : undefined;

    if (!commissionId || !['pending', 'approved', 'paid', 'cancelled'].includes(nextStatus)) {
      return NextResponse.json({ error: 'Invalid commission update' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === 'paid') {
      updatePayload.paid_at = new Date().toISOString();
    } else {
      updatePayload.paid_at = null;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes || null;
    }

    const { data, error } = await supabaseAdmin
      .from('affiliate_commissions')
      .update(updatePayload)
      .eq('id', commissionId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, commission: data });
  } catch (error) {
    console.error('Admin affiliates PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update commission';
    const statusCode = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
