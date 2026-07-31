import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Event } from '@/lib/supabase-client';
import {
  hasPendingDeactivationRequest,
  hasPendingReactivationRequest,
} from '@/lib/event-status';
import { revalidatePublicEventPages } from '@/lib/revalidate-public-events';

export type EventDeactivationFields = Pick<
  Event,
  | 'id'
  | 'status'
  | 'organizer_id'
  | 'deactivation_reason'
  | 'deactivation_requested_at'
  | 'reactivation_requested_at'
>;

export { hasPendingDeactivationRequest, hasPendingReactivationRequest };

async function loadEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Event) || null;
}

export async function requestEventDeactivation(params: {
  eventId: string;
  organizerId: string;
  reason?: string | null;
}): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');
  if (event.organizer_id !== params.organizerId) {
    throw new Error('You can only manage your own events');
  }
  if (event.status !== 'approved') {
    throw new Error('Only live events can be deactivated');
  }
  if (event.deactivation_requested_at) {
    throw new Error('A deactivation request is already pending');
  }

  const reason = (params.reason || '').trim() || null;
  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      deactivation_reason: reason,
      deactivation_requested_at: new Date().toISOString(),
      reactivation_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.eventId)
    .eq('organizer_id', params.organizerId)
    .eq('status', 'approved')
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to request deactivation');
  return data as Event;
}

export async function cancelEventDeactivationRequest(params: {
  eventId: string;
  organizerId: string;
}): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');
  if (event.organizer_id !== params.organizerId) {
    throw new Error('You can only manage your own events');
  }
  if (event.status !== 'approved' || !event.deactivation_requested_at) {
    throw new Error('No pending deactivation request');
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      deactivation_reason: null,
      deactivation_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.eventId)
    .eq('organizer_id', params.organizerId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to cancel request');
  return data as Event;
}

export async function requestEventReactivation(params: {
  eventId: string;
  organizerId: string;
  reason?: string | null;
}): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');
  if (event.organizer_id !== params.organizerId) {
    throw new Error('You can only manage your own events');
  }
  if (event.status !== 'deactivated') {
    throw new Error('Only deactivated events can request reactivation');
  }
  if (event.reactivation_requested_at) {
    throw new Error('A reactivation request is already pending');
  }

  const reason = (params.reason || '').trim() || null;
  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      deactivation_reason: reason ?? event.deactivation_reason ?? null,
      reactivation_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.eventId)
    .eq('organizer_id', params.organizerId)
    .eq('status', 'deactivated')
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to request reactivation');
  return data as Event;
}

export async function cancelEventReactivationRequest(params: {
  eventId: string;
  organizerId: string;
}): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');
  if (event.organizer_id !== params.organizerId) {
    throw new Error('You can only manage your own events');
  }
  if (event.status !== 'deactivated' || !event.reactivation_requested_at) {
    throw new Error('No pending reactivation request');
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({
      reactivation_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.eventId)
    .eq('organizer_id', params.organizerId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to cancel request');
  return data as Event;
}

export async function resolveEventDeactivationRequest(params: {
  eventId: string;
  action: 'approve' | 'deny';
}): Promise<Event> {
  const event = await loadEvent(params.eventId);
  if (!event) throw new Error('Event not found');

  if (hasPendingDeactivationRequest(event)) {
    if (params.action === 'approve') {
      const { data, error } = await supabaseAdmin
        .from('events')
        .update({
          status: 'deactivated',
          deactivation_requested_at: null,
          reactivation_requested_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.eventId)
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'Failed to deactivate event');
      revalidatePublicEventPages(params.eventId);
      return data as Event;
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update({
        deactivation_reason: null,
        deactivation_requested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.eventId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to deny deactivation');
    return data as Event;
  }

  if (hasPendingReactivationRequest(event)) {
    if (params.action === 'approve') {
      const { data, error } = await supabaseAdmin
        .from('events')
        .update({
          status: 'approved',
          deactivation_reason: null,
          deactivation_requested_at: null,
          reactivation_requested_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.eventId)
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message || 'Failed to reactivate event');
      revalidatePublicEventPages(params.eventId);
      return data as Event;
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update({
        reactivation_requested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.eventId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to deny reactivation');
    return data as Event;
  }

  // Admin can directly reactivate a deactivated event without a request.
  if (event.status === 'deactivated' && params.action === 'approve') {
    const { data, error } = await supabaseAdmin
      .from('events')
      .update({
        status: 'approved',
        deactivation_reason: null,
        deactivation_requested_at: null,
        reactivation_requested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.eventId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to reactivate event');
    revalidatePublicEventPages(params.eventId);
    return data as Event;
  }

  throw new Error('No pending deactivation or reactivation request for this event');
}
