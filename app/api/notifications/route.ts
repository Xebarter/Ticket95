import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { countUnreadNotifications, listNotificationsForUser } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '30');
    const unreadOnly = searchParams.get('unread') === '1';

    const [notifications, unreadCount] = await Promise.all([
      listNotificationsForUser(session.userId, { limit, unreadOnly }),
      countUnreadNotifications(session.userId),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
