import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { markAllNotificationsRead } from '@/lib/notifications';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updated = await markAllNotificationsRead(session.userId);
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('POST /api/notifications/read-all error:', error);
    return NextResponse.json({ error: 'Failed to mark notifications read' }, { status: 500 });
  }
}
