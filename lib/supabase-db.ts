import { supabase, User, Event, Sponsor, Order, Ticket, TicketType } from './supabase-client';
import { getNowIso } from './event-status';

// User queries
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase.from('users').select('*').in('id', uniqueIds);

  if (error) throw error;
  return data || [];
}

export async function createUser(
  id: string,
  email: string,
  role: 'customer' | 'organizer' | 'admin'
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert([{ id, email, role }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(
  eventId: string,
  eventData: Partial<Omit<Event, 'id' | 'organizer_id' | 'created_at' | 'updated_at'>>
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  profile: { profile_name?: string; profile_description?: string; profile_logo_url?: string }
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Event queries
export async function getApprovedEvents(): Promise<Event[]> {
  const nowIso = getNowIso();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'approved')
    .gt('date', nowIso)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function searchApprovedEvents(searchTerm: string): Promise<Event[]> {
  const nowIso = getNowIso();
  if (!searchTerm || searchTerm.trim() === '') {
    return getApprovedEvents();
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();

  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      description,
      date,
      venue,
      image_url,
      organizer_id,
      organizer_name,
      organizer_logo_url,
      status,
      currency,
      ticket_price,
      total_tickets,
      tickets_available,
      ticket_types (
        id,
        name,
        price,
        available_quantity,
        order_index,
        description
      )
    `)
    .eq('status', 'approved')
    .gt('date', nowIso)
    .or(
      `name.ilike.%${normalizedSearch}%,venue.ilike.%${normalizedSearch}%,organizer_name.ilike.%${normalizedSearch}%,description.ilike.%${normalizedSearch}%`
    )
    .order('date', { ascending: true });

  if (error) {
    console.error('Supabase search query error:', error);
    throw error;
  }

  return (data || []) as any as Event[];
}

export async function getApprovedEventsWithTicketTypes(limit?: number): Promise<Event[]> {
  const nowIso = getNowIso();
  let query = supabase
    .from('events')
    .select(`
      id,
      name,
      date,
      venue,
      image_url,
      organizer_id,
      organizer_name,
      organizer_logo_url,
      status,
      currency,
      ticket_price,
      total_tickets,
      tickets_available,
      ticket_types (
        id,
        name,
        price,
        available_quantity,
        order_index,
        description
      )
    `)
    .eq('status', 'approved')
    .gt('date', nowIso)
    .order('date', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase query error:', error);
    throw error;
  }
  return (data || []) as any as Event[];
}

/**
 * Fetch featured events for the homepage carousel.
 * Keep the select lean — nested embeds under RLS have been timing out.
 */
export async function getFeaturedEvents(limit: number = 5) {
  const nowIso = getNowIso();
  const baseSelect = `
    id,
    name,
    description,
    date,
    venue,
    image_url,
    organizer_name,
    currency,
    ticket_price,
    total_tickets,
    tickets_available
  `;

  try {
    const { data, error } = await supabase
      .from('events')
      .select(`${baseSelect}, ticket_types ( id, price )`)
      .eq('status', 'approved')
      .eq('is_featured', true)
      .gt('date', nowIso)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      // Column missing — migration 012 not applied yet
      if (error.code === '42703' || error.message?.includes('is_featured')) {
        console.warn(
          'is_featured column missing; run scripts/sql/012_add_featured_events.sql'
        );
        return [] as Event[];
      }
      console.error('Supabase featured events query error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
    return (data || []) as any as Event[];
  } catch (error) {
    console.warn('Falling back to featured events query without ticket_types');
    try {
      const { data, error: fallbackError } = await supabase
        .from('events')
        .select(baseSelect)
        .eq('status', 'approved')
        .eq('is_featured', true)
        .gt('date', nowIso)
        .order('date', { ascending: true })
        .limit(limit);

      if (fallbackError) {
        if (
          fallbackError.code === '42703' ||
          fallbackError.message?.includes('is_featured')
        ) {
          console.warn(
            'is_featured column missing; run scripts/sql/012_add_featured_events.sql'
          );
          return [] as Event[];
        }
        console.error('Failed to fetch featured events:', {
          message: fallbackError.message,
          code: fallbackError.code,
          details: fallbackError.details,
          hint: fallbackError.hint,
        });
        return [] as Event[];
      }

      return (data || []).map((event) => ({
        ...event,
        ticket_types: [],
      })) as any as Event[];
    } catch (fallbackError) {
      console.error('Failed to fetch featured events:', fallbackError);
      return [] as Event[];
    }
  }
}

/**
 * Lean query for the public landing page – selects only the fields the event
 * card needs. Sponsors are intentionally omitted here (expensive RLS embeds
 * were causing statement timeouts); the purchase dialog loads them on demand.
 */
export async function getApprovedEventsForLanding(limit: number = 12) {
  const nowIso = getNowIso();
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        venue,
        image_url,
        organizer_name,
        status,
        currency,
        ticket_types (
          id
        )
      `)
      .eq('status', 'approved')
      .gt('date', nowIso)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Supabase landing query error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
    return (data || []).map((event) => ({
      ...event,
      sponsors: [],
    })) as any as Event[];
  } catch (error) {
    console.warn('Falling back to events query without ticket_types relationship');
    const { data, error: fallbackError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        venue,
        image_url,
        organizer_name,
        status,
        currency
      `)
      .eq('status', 'approved')
      .gt('date', nowIso)
      .order('date', { ascending: true })
      .limit(limit);

    if (fallbackError) {
      console.error('Supabase fallback query error:', {
        message: fallbackError.message,
        code: fallbackError.code,
        details: fallbackError.details,
        hint: fallbackError.hint,
      });
      throw new Error(`Failed to fetch events: ${fallbackError.message}`);
    }

    return (data || []).map((event) => ({
      ...event,
      ticket_types: [],
      sponsors: [],
    })) as any as Event[];
  }
}

export async function getEventById(id: string): Promise<Event | null> {
  if (!id || typeof id !== 'string' || id.trim() === '') return null;
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}


export async function getTicketTypesForEvent(eventId: string): Promise<TicketType[]> {
  if (!eventId || typeof eventId !== 'string' || eventId.trim() === '') return [];
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Supabase ticket types query error:', error);
    throw error;
  }
  return (data || []) as TicketType[];
}

export async function getEventsByOrganizer(organizerId: string): Promise<Event[]> {
  if (!organizerId || typeof organizerId !== 'string' || organizerId.trim() === '') return [];
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPendingEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEventStatus(
  eventId: string,
  status: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string
): Promise<Event> {
  const updateData: any = { status };
  if (rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEventTickets(eventId: string, quantity: number): Promise<Event> {
  const { data: event, error: fetchError } = await supabase
    .from('events')
    .select('tickets_available')
    .eq('id', eventId)
    .single();

  if (fetchError) throw fetchError;

  const newAvailable = Math.max(0, (event?.tickets_available || 0) - quantity);

  const { data, error } = await supabase
    .from('events')
    .update({ tickets_available: newAvailable })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Sponsor queries
export async function getSponsorsByEvent(eventId: string): Promise<Sponsor[]> {
  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createSponsor(sponsorData: Omit<Sponsor, 'id' | 'created_at'>): Promise<Sponsor> {
  const { data, error } = await supabase
    .from('sponsors')
    .insert([sponsorData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSponsor(sponsorId: string): Promise<void> {
  const { error } = await supabase
    .from('sponsors')
    .delete()
    .eq('id', sponsorId);

  if (error) throw error;
}

export async function replaceEventSponsors(
  eventId: string,
  sponsors: Array<Omit<Sponsor, 'id' | 'created_at'>>
): Promise<void> {
  const { error: deleteError } = await supabase.from('sponsors').delete().eq('event_id', eventId);
  if (deleteError) throw deleteError;

  if (sponsors.length === 0) return;

  const { error: insertError } = await supabase.from('sponsors').insert(sponsors);
  if (insertError) throw insertError;
}

// Order queries
export async function getOrdersByUser(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOrdersByEvent(eventId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createOrder(orderData: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateOrder(
  orderId: string,
  orderData: Partial<Omit<Order, 'id' | 'created_at' | 'updated_at'>>
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update(orderData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Ticket queries
export async function getTicketsByUser(userId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTicketsByUserOrEmail(userId: string, email?: string): Promise<Ticket[]> {
  const userTicketsPromise = getTicketsByUser(userId);
  const normalizedEmail = (email || '').trim().toLowerCase();

  let emailOrderIds: string[] = [];
  if (normalizedEmail) {
    try {
      const { data: ordersByEmail, error: emailOrdersError } = await supabase
        .from('orders')
        .select('id')
        .filter('payment_metadata->customer->>email', 'ilike', normalizedEmail);

      if (emailOrdersError) {
        console.warn('Failed to load email-linked guest orders:', emailOrdersError);
      } else {
        emailOrderIds = (ordersByEmail || []).map((order) => order.id);
      }
    } catch (error) {
      console.warn('Failed to load guest orders by email:', error);
    }
  }

  let emailTickets: Ticket[] = [];
  if (emailOrderIds.length > 0) {
    const { data: ticketsByEmail, error: emailTicketsError } = await supabase
      .from('tickets')
      .select('*')
      .in('order_id', emailOrderIds)
      .order('created_at', { ascending: false });

    if (emailTicketsError) throw emailTicketsError;
    emailTickets = ticketsByEmail || [];
  }

  const userTickets = await userTicketsPromise;
  const uniqueTickets = new Map<string, Ticket>();
  [...userTickets, ...emailTickets].forEach((ticket) => {
    uniqueTickets.set(ticket.id, ticket);
  });

  return Array.from(uniqueTickets.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getTicketsByOrder(orderId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTicketsByEvent(eventId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createTickets(
  ticketsData: Array<Omit<Ticket, 'id' | 'created_at' | 'updated_at'>>
): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .insert(ticketsData)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateTicketStatus(ticketId: string, status: 'valid' | 'used' | 'expired' | 'refunded'): Promise<Ticket> {
  const { data, error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Ticket Type queries
export async function getTicketTypesByEvent(eventId: string): Promise<TicketType[]> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTicketTypeById(id: string): Promise<TicketType | null> {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createTicketType(ticketTypeData: Omit<TicketType, 'id' | 'created_at' | 'updated_at'>): Promise<TicketType> {
  const { data, error } = await supabase
    .from('ticket_types')
    .insert([ticketTypeData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTicketTypes(ticketTypesData: Array<Omit<TicketType, 'id' | 'created_at' | 'updated_at'>>): Promise<TicketType[]> {
  const { data, error } = await supabase
    .from('ticket_types')
    .insert(ticketTypesData)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateTicketTypeQuantity(ticketTypeId: string, quantitySold: number): Promise<TicketType> {
  const { data: ticketType, error: fetchError } = await supabase
    .from('ticket_types')
    .select('available_quantity')
    .eq('id', ticketTypeId)
    .single();

  if (fetchError) throw fetchError;

  const newAvailable = Math.max(0, (ticketType?.available_quantity || 0) - quantitySold);

  const { data, error } = await supabase
    .from('ticket_types')
    .update({ available_quantity: newAvailable })
    .eq('id', ticketTypeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTicketType(ticketTypeId: string): Promise<void> {
  const { error } = await supabase
    .from('ticket_types')
    .delete()
    .eq('id', ticketTypeId);

  if (error) throw error;
}

export async function replaceEventTicketTypes(
  eventId: string,
  ticketTypes: Array<Omit<TicketType, 'id' | 'created_at' | 'updated_at' | 'event_id'>>
): Promise<void> {
  const { error: deleteError } = await supabase.from('ticket_types').delete().eq('event_id', eventId);
  if (deleteError) throw deleteError;

  if (ticketTypes.length === 0) return;

  const rows = ticketTypes.map((ticketType) => ({
    event_id: eventId,
    name: ticketType.name,
    description: ticketType.description,
    price: ticketType.price,
    total_quantity: ticketType.total_quantity,
    available_quantity: ticketType.available_quantity,
    order_index: ticketType.order_index,
  }));

  const { error: insertError } = await supabase.from('ticket_types').insert(rows);
  if (insertError) throw insertError;
}
