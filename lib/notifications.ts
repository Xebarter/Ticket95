import { supabaseAdmin } from '@/lib/supabase-admin';

export type NotificationType = 'new_event';

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NewEventNotifyInput = {
  id: string;
  name: string;
  venue?: string | null;
  date?: string | null;
  organizer_name?: string | null;
  image_url?: string | null;
};

const INSERT_CHUNK = 400;

function formatEventWhen(date?: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Fan-out in-app alerts when an event goes live (approved).
 * Safe to call fire-and-forget from approve handlers.
 */
export async function notifyUsersOfNewEvent(event: NewEventNotifyInput): Promise<number> {
  const { data: users, error: usersError } = await supabaseAdmin.from('users').select('id');

  if (usersError) {
    console.error('[notifications] Failed to load users for fan-out:', usersError);
    return 0;
  }

  const userIds = (users ?? []).map((row) => row.id).filter(Boolean);
  if (userIds.length === 0) return 0;

  const when = formatEventWhen(event.date);
  const venue = event.venue?.trim();
  const bodyParts = [
    event.organizer_name ? `By ${event.organizer_name}` : null,
    when,
    venue,
  ].filter(Boolean);

  const rows = userIds.map((userId) => ({
    user_id: userId,
    type: 'new_event' satisfies NotificationType,
    title: `New event: ${event.name}`,
    body: bodyParts.join(' · ') || 'A new event is live on Ticket95.',
    href: `/events/${event.id}`,
    data: {
      event_id: event.id,
      event_name: event.name,
      image_url: event.image_url ?? null,
    },
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const { error } = await supabaseAdmin.from('notifications').insert(chunk);
    if (error) {
      console.error('[notifications] Fan-out insert failed:', error);
      continue;
    }
    inserted += chunk.length;
  }

  return inserted;
}

export async function listNotificationsForUser(
  userId: string,
  opts?: { limit?: number; unreadOnly?: boolean }
): Promise<AppNotification[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 30, 1), 100);

  try {
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (opts?.unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[notifications] List failed:', error);
      return [];
    }

    return (data ?? []) as AppNotification[];
  } catch (error) {
    console.error('[notifications] List failed:', error);
    return [];
  }
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('[notifications] Unread count failed:', error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error('[notifications] Unread count failed:', error);
    return 0;
  }
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[notifications] Mark read failed:', error);
    throw error;
  }

  return Boolean(data);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
    .select('id');

  if (error) {
    console.error('[notifications] Mark all read failed:', error);
    throw error;
  }

  return data?.length ?? 0;
}
