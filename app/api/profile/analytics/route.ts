import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  buildProfileAnalytics,
  resolveAnalyticsRange,
  type AnalyticsDatePreset,
} from '@/lib/profile-analytics';
import type {
  AffiliateCommission,
  Event,
  Order,
  Ticket,
  TicketType,
  VerifierSession,
} from '@/lib/supabase-client';

const PRESETS = new Set<AnalyticsDatePreset>([
  'today',
  'yesterday',
  'last7',
  'last30',
  'thisMonth',
  'entire',
  'custom',
]);

async function fetchAllByEventIds<T>(
  table: string,
  select: string,
  eventIds: string[]
): Promise<T[]> {
  if (eventIds.length === 0) return [];
  const { data, error } = await supabaseAdmin.from(table).select(select).in('event_id', eventIds);
  if (error) throw error;
  return (data || []) as T[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const presetRaw = (searchParams.get('preset') || 'last30') as AnalyticsDatePreset;
    const preset = PRESETS.has(presetRaw) ? presetRaw : 'last30';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const { from, to } = resolveAnalyticsRange(preset, fromParam, toParam);

    const { data: eventsRaw, error: eventsError } = await supabaseAdmin
      .from('events')
      .select(
        'id, organizer_id, name, date, venue, ticket_price, total_tickets, tickets_available, currency, image_url, status, created_at, updated_at, organizer_name'
      )
      .eq('organizer_id', session.userId)
      .order('date', { ascending: false });

    if (eventsError) throw eventsError;

    const allEvents = (eventsRaw || []) as Event[];
    if (eventId && !allEvents.some((e) => e.id === eventId)) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const scopedEvents = eventId ? allEvents.filter((e) => e.id === eventId) : allEvents;
    const eventIds = scopedEvents.map((e) => e.id);

    if (eventIds.length === 0) {
      const empty = buildProfileAnalytics({
        events: [],
        orders: [],
        tickets: [],
        ticketTypes: [],
        commissions: [],
        verifierSessions: [],
        affiliateCodeById: new Map(),
        userById: new Map(),
        from,
        to,
        selectedEventId: eventId,
      });
      empty.events = buildProfileAnalytics({
        events: allEvents,
        orders: [],
        tickets: [],
        ticketTypes: [],
        commissions: [],
        verifierSessions: [],
        affiliateCodeById: new Map(),
        userById: new Map(),
        from: null,
        to: null,
        selectedEventId: null,
      }).events;
      return NextResponse.json({ success: true, ...empty });
    }

    const [orders, tickets, ticketTypes, commissions, verifierSessions] = await Promise.all([
      fetchAllByEventIds<Order>(
        'orders',
        'id, event_id, user_id, quantity, total_price, currency, status, payment_provider, payment_metadata, affiliate_id, affiliate_referral_code, created_at, updated_at',
        eventIds
      ),
      fetchAllByEventIds<Ticket>(
        'tickets',
        'id, order_id, event_id, user_id, event_name, organizer_name, ticket_type_id, ticket_type_name, ticket_price, status, qr_code, checked_in_at, checked_in_by, created_at, updated_at',
        eventIds
      ),
      fetchAllByEventIds<TicketType>(
        'ticket_types',
        'id, event_id, name, description, price, total_quantity, available_quantity, order_index, created_at, updated_at',
        eventIds
      ),
      fetchAllByEventIds<AffiliateCommission>(
        'affiliate_commissions',
        'id, affiliate_id, order_id, event_id, buyer_user_id, order_amount, commission_percent, commission_amount, currency, status, paid_at, notes, created_at, updated_at',
        eventIds
      ),
      fetchAllByEventIds<VerifierSession>(
        'verifier_sessions',
        'id, event_id, device_name, token_jti, expires_at, revoked_at, last_seen_at, created_at',
        eventIds
      ),
    ]);

    const userIds = [
      ...new Set(orders.map((o) => o.user_id).filter((id): id is string => Boolean(id))),
    ];
    const affiliateIds = [
      ...new Set([
        ...orders.map((o) => o.affiliate_id).filter((id): id is string => Boolean(id)),
        ...commissions.map((c) => c.affiliate_id),
      ]),
    ];

    const [{ data: users }, { data: affiliates }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('users').select('id, email, profile_name').in('id', userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; email?: string; profile_name?: string }> }),
      affiliateIds.length
        ? supabaseAdmin.from('affiliates').select('id, referral_code').in('id', affiliateIds)
        : Promise.resolve({ data: [] as Array<{ id: string; referral_code: string }> }),
    ]);

    const userById = new Map(
      (users || []).map((u) => [u.id, { email: u.email, profile_name: u.profile_name }])
    );
    const affiliateCodeById = new Map((affiliates || []).map((a) => [a.id, a.referral_code]));

    const payload = buildProfileAnalytics({
      events: scopedEvents,
      orders,
      tickets,
      ticketTypes,
      commissions,
      verifierSessions,
      affiliateCodeById,
      userById,
      from,
      to,
      selectedEventId: eventId,
    });

    // Always expose full organizer event list for the filter picker
    payload.events = buildProfileAnalytics({
      events: allEvents,
      orders: [],
      tickets: [],
      ticketTypes: [],
      commissions: [],
      verifierSessions: [],
      affiliateCodeById: new Map(),
      userById: new Map(),
      from: null,
      to: null,
      selectedEventId: null,
    }).events;
    if (eventId) {
      payload.selectedEvent = payload.events.find((e) => e.id === eventId) || null;
    }

    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error('Profile analytics GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
