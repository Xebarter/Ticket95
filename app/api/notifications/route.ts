import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { countUnreadNotifications, listNotificationsForUser } from '@/lib/notifications';

const NOTIFICATIONS_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '30');
    const unreadOnly = searchParams.get('unread') === '1';

    const [notifications, unreadCount] = await withTimeout(
      Promise.all([
        listNotificationsForUser(session.userId, { limit, unreadOnly }),
        countUnreadNotifications(session.userId),
      ]),
      NOTIFICATIONS_TIMEOUT_MS,
      [[], 0] as [Awaited<ReturnType<typeof listNotificationsForUser>>, number]
    );

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    // Prefer empty payload over a hard failure so the bell stays quiet during outages.
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
