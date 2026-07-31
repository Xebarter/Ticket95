import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteAdminEvent } from '@/lib/admin-event-details';
import { revalidatePublicEventPages } from '@/lib/revalidate-public-events';
import type { Event } from '@/lib/supabase-client';

export const CLEAR_REMOVAL_FIELDS = {
  removed_at: null,
  removed_by: null,
} as const;

export const CLEAR_DEACTIVATION_FIELDS = {
  deactivation_reason: null,
  deactivation_requested_at: null,
  reactivation_requested_at: null,
} as const;

async function loadEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Event) || null;
}

/** Admin soft-delete: hide from public; organizer can edit/resubmit or hard-delete. */
export async function softRemoveEvent(params: {
  eventId: string;
  adminUserId: string;
}): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');
  if (event.status === 'removed') {
    throw new Error('Event is already removed');
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      status: 'removed',
      removed_at: new Date().toISOString(),
      removed_by: params.adminUserId,
      is_featured: false,
      ...CLEAR_DEACTIVATION_FIELDS,
    })
    .eq('id', params.eventId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePublicEventPages(params.eventId);
  return data as Event;
}

/** Admin unverify: approved → pending (requires re-approval). */
export async function unverifyEvent(params: { eventId: string }): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');
  if (event.status !== 'approved') {
    throw new Error('Only approved events can be unverified');
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      status: 'pending',
      rejection_reason: null,
      is_featured: false,
      ...CLEAR_DEACTIVATION_FIELDS,
      ...CLEAR_REMOVAL_FIELDS,
    })
    .eq('id', params.eventId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePublicEventPages(params.eventId);
  return data as Event;
}

/** Organizer resubmits a removed (or rejected) event for admin review. */
export async function resubmitEventForVerification(params: {
  eventId: string;
  organizerId: string;
}): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');
  if (event.organizer_id !== params.organizerId) {
    throw new Error('You can only manage your own events');
  }
  if (event.status !== 'removed' && event.status !== 'rejected') {
    throw new Error('Only deleted or rejected events can be resubmitted');
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      status: 'pending',
      rejection_reason: null,
      ...CLEAR_REMOVAL_FIELDS,
      ...CLEAR_DEACTIVATION_FIELDS,
    })
    .eq('id', params.eventId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Event;
}

/**
 * Organizer permanent delete — only allowed for admin-soft-removed events.
 */
export async function permanentlyDeleteRemovedEvent(params: {
  eventId: string;
  organizerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const event = await loadEvent(params.eventId);
  if (!event) return { ok: false, error: 'Event not found' };
  if (event.organizer_id !== params.organizerId) {
    return { ok: false, error: 'You can only delete your own events' };
  }
  if (event.status !== 'removed') {
    return { ok: false, error: 'Only events deleted by admin can be permanently removed' };
  }

  const result = await deleteAdminEvent(params.eventId);
  return result;
}
