import { NextRequest, NextResponse } from 'next/server';
import { getEventsByOrganizer } from '@/lib/supabase-db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await getEventsByOrganizer(session.userId);

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Get organizer events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
