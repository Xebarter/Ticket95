import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { markNotificationRead } from '@/lib/notifications';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Notification id required' }, { status: 400 });
    }

    await markNotificationRead(session.userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/notifications/[id]/read error:', error);
    return NextResponse.json({ error: 'Failed to mark notification read' }, { status: 500 });
  }
}
