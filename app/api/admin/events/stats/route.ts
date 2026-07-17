// GET /api/admin/events/stats
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getNowIso } from '@/lib/event-status';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  try {
    await requireAdmin();

    const nowIso = getNowIso();
    // Single lean query is typically faster than several exact count queries.
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('status,date');

    if (error) {
      console.error('Error fetching admin event stats:', error);
      return Response.json(
        { error: 'Failed to fetch event stats', details: error.message },
        { status: 500 }
      );
    }

    const rows = data ?? [];
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let expired = 0;

    for (const row of rows) {
      if (row.status === 'pending') {
        pending += 1;
        continue;
      }
      if (row.status === 'rejected') {
        rejected += 1;
        continue;
      }
      if (row.status === 'approved') {
        if (row.date && row.date < nowIso) {
          expired += 1;
        } else {
          approved += 1;
        }
      }
    }

    return Response.json({
      total: rows.length,
      pending,
      approved,
      rejected,
      expired,
    });
  } catch (error: any) {
    console.error('Unexpected admin stats error:', error);
    return Response.json(
      { error: 'Internal server error', details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
