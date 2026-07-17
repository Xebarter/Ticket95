import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerAuthUser } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthUser(request);
    if (!session || (session.role !== 'admin' && session.role !== 'organizer')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabaseAdmin
      .from('events')
      .select('id, name, date, venue, organizer_id, organizer_name, status')
      .order('date', { ascending: true });

    if (session.role === 'organizer') {
      query = query.eq('organizer_id', session.userId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
