import { getEventLifecycleStatus } from '@/lib/event-status';
import type {
  AffiliateCommission,
  Event,
  Order,
  Ticket,
  TicketType,
  VerifierSession,
} from '@/lib/supabase-client';

const UNKNOWN_TICKET_TYPE = 'General';

export type AnalyticsDatePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'entire'
  | 'custom';

export type AnalyticsEventSummary = {
  id: string;
  name: string;
  date: string;
  venue: string;
  imageUrl?: string | null;
  currency: string;
  status: ReturnType<typeof getEventLifecycleStatus>;
  totalTickets: number;
  ticketsAvailable: number;
  isLive: boolean;
};

export type AnalyticsKpis = {
  capacity: number;
  ticketsSold: number;
  ticketsRemaining: number;
  sellThroughPercent: number;
  ticketsValid: number;
  ticketsUsed: number;
  ticketsExpired: number;
  ticketsRefunded: number;
  grossRevenue: number;
  refundedRevenue: number;
  netRevenue: number;
  checkedIn: number;
  remainingCheckIn: number;
  attendanceRate: number;
  capacityUsage: number;
  orderCount: number;
  completedOrders: number;
  pendingOrders: number;
  failedOrders: number;
  refundedOrders: number;
  averageOrderValue: number;
  averageTicketsPerOrder: number;
  uniqueBuyers: number;
  currency: string;
};

export type TimeSeriesPoint = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  tickets: number;
};

export type HourlyPoint = {
  hour: number;
  label: string;
  revenue: number;
  orders: number;
  checkIns: number;
};

export type TicketTypeAnalyticsRow = {
  key: string;
  name: string;
  eventId: string;
  eventName: string;
  capacity: number;
  sold: number;
  remaining: number;
  revenue: number;
  attended: number;
  refunded: number;
  soldPercent: number;
};

export type BuyerAnalyticsRow = {
  key: string;
  name?: string;
  email: string;
  orders: number;
  tickets: number;
  spend: number;
  isReturning: boolean;
};

export type PaymentProviderRow = {
  provider: string;
  orders: number;
  revenue: number;
};

export type AffiliateAnalyticsRow = {
  affiliateId: string;
  referralCode: string;
  sales: number;
  revenue: number;
  commission: number;
  pendingCommission: number;
  paidCommission: number;
};

export type VerifierAnalyticsRow = {
  sessionId: string;
  eventId: string;
  eventName: string;
  deviceName: string;
  createdAt: string;
  lastSeenAt?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  isActive: boolean;
  checkIns: number;
};

export type EventCapacityRow = {
  eventId: string;
  eventName: string;
  capacity: number;
  sold: number;
  remaining: number;
  fillRate: number;
  revenue: number;
};

export type InsightCard = {
  id: string;
  tone: 'info' | 'warning' | 'success';
  title: string;
  body: string;
};

export type RecentOrderRow = {
  id: string;
  eventId: string;
  eventName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: Order['status'];
  paymentProvider?: string | null;
  createdAt: string;
  buyerEmail: string;
  buyerName?: string;
};

export type LiveMetrics = {
  isLive: boolean;
  checkedIn: number;
  checkInsLast10Min: number;
  activeVerifierSessions: number;
  ticketsPurchasedToday: number;
  lastCheckInAt?: string | null;
};

export type ProfileAnalyticsPayload = {
  generatedAt: string;
  filters: {
    eventId: string | null;
    from: string | null;
    to: string | null;
  };
  events: AnalyticsEventSummary[];
  selectedEvent: AnalyticsEventSummary | null;
  kpis: AnalyticsKpis;
  live: LiveMetrics;
  dailySeries: TimeSeriesPoint[];
  hourlySeries: HourlyPoint[];
  cumulativeSeries: TimeSeriesPoint[];
  orderStatus: Array<{ status: string; label: string; value: number; color: string }>;
  ticketTypes: TicketTypeAnalyticsRow[];
  buyers: BuyerAnalyticsRow[];
  customerSummary: {
    uniqueBuyers: number;
    newBuyers: number;
    returningBuyers: number;
    repeatRate: number;
    averageSpend: number;
    averageTickets: number;
  };
  payments: PaymentProviderRow[];
  affiliates: AffiliateAnalyticsRow[];
  verifiers: VerifierAnalyticsRow[];
  capacityByEvent: EventCapacityRow[];
  checkInTimeline: TimeSeriesPoint[];
  peakCheckInHour: number | null;
  insights: InsightCard[];
  recentOrders: RecentOrderRow[];
};

type BuyerMeta = { email?: string; name?: string };

function getPaymentCustomer(order: Order): BuyerMeta {
  const metadata = order.payment_metadata as { customer?: BuyerMeta } | undefined;
  return metadata?.customer || {};
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function dayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function inRange(iso: string, from: Date | null, to: Date | null): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

export function resolveAnalyticsRange(
  preset: AnalyticsDatePreset,
  fromParam?: string | null,
  toParam?: string | null,
  now = new Date()
): { from: Date | null; to: Date | null } {
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  if (preset === 'entire') return { from: null, to: null };
  if (preset === 'custom') {
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;
    return {
      from: from && !Number.isNaN(from.getTime()) ? from : null,
      to: to && !Number.isNaN(to.getTime()) ? to : null,
    };
  }
  if (preset === 'today') {
    return { from: startOfDay(now), to: endOfDay(now) };
  }
  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (preset === 'last7') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(now) };
  }
  if (preset === 'last30') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 29);
    return { from, to: endOfDay(now) };
  }
  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from, to: endOfDay(now) };
  }
  return { from: null, to: null };
}

export function isEventLive(
  event: Pick<Event, 'status' | 'date' | 'end_date'>,
  now = new Date()
): boolean {
  if (event.status !== 'approved') return false;
  const eventDate = new Date(event.date);
  if (Number.isNaN(eventDate.getTime())) return false;

  const endSource = event.end_date ? new Date(event.end_date) : eventDate;
  if (Number.isNaN(endSource.getTime())) return false;

  const start = new Date(eventDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endSource);
  end.setHours(23, 59, 59, 999);

  // Also treat as live if within 6h before start / 12h after end timestamp
  const looseStart = new Date(eventDate.getTime() - 6 * 60 * 60 * 1000);
  const looseEnd = new Date(endSource.getTime() + 12 * 60 * 60 * 1000);
  const t = now.getTime();
  return (t >= start.getTime() && t <= end.getTime()) || (t >= looseStart.getTime() && t <= looseEnd.getTime());
}

function emptyKpis(currency: string): AnalyticsKpis {
  return {
    capacity: 0,
    ticketsSold: 0,
    ticketsRemaining: 0,
    sellThroughPercent: 0,
    ticketsValid: 0,
    ticketsUsed: 0,
    ticketsExpired: 0,
    ticketsRefunded: 0,
    grossRevenue: 0,
    refundedRevenue: 0,
    netRevenue: 0,
    checkedIn: 0,
    remainingCheckIn: 0,
    attendanceRate: 0,
    capacityUsage: 0,
    orderCount: 0,
    completedOrders: 0,
    pendingOrders: 0,
    failedOrders: 0,
    refundedOrders: 0,
    averageOrderValue: 0,
    averageTicketsPerOrder: 0,
    uniqueBuyers: 0,
    currency,
  };
}

export function buildProfileAnalytics(params: {
  events: Event[];
  orders: Order[];
  tickets: Ticket[];
  ticketTypes: TicketType[];
  commissions: AffiliateCommission[];
  verifierSessions: VerifierSession[];
  affiliateCodeById: Map<string, string>;
  userById: Map<string, { email?: string; profile_name?: string }>;
  from: Date | null;
  to: Date | null;
  selectedEventId: string | null;
}): ProfileAnalyticsPayload {
  const {
    events,
    orders,
    tickets,
    ticketTypes,
    commissions,
    verifierSessions,
    affiliateCodeById,
    userById,
    from,
    to,
    selectedEventId,
  } = params;

  const now = new Date();
  const eventById = new Map(events.map((e) => [e.id, e]));
  const currency =
    events.find((e) => e.currency)?.currency ||
    orders.find((o) => o.currency)?.currency ||
    'USD';

  const eventSummaries: AnalyticsEventSummary[] = events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.date,
    venue: event.venue,
    imageUrl: event.image_url,
    currency: event.currency || currency,
    status: getEventLifecycleStatus(event),
    totalTickets: event.total_tickets,
    ticketsAvailable: event.tickets_available,
    isLive: isEventLive(event, now),
  }));

  const selectedEvent = selectedEventId
    ? eventSummaries.find((e) => e.id === selectedEventId) || null
    : eventSummaries.length === 1
      ? eventSummaries[0]
      : null;

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const filteredOrders = orders.filter((o) => inRange(o.created_at, from, to));
  const filteredTickets = tickets.filter((t) => {
    const order = orderById.get(t.order_id);
    const ts = order?.created_at || t.created_at;
    return inRange(ts, from, to);
  });

  // Inventory KPIs use current event capacity (not date-filtered)
  const capacity = events.reduce((sum, e) => sum + (e.total_tickets || 0), 0);
  const ticketsRemaining = events.reduce((sum, e) => sum + (e.tickets_available || 0), 0);
  const ticketsSoldInventory = Math.max(capacity - ticketsRemaining, 0);

  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending');
  const failedOrders = filteredOrders.filter((o) => o.status === 'failed');
  const refundedOrders = filteredOrders.filter((o) => o.status === 'refunded');

  const grossRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const refundedRevenue = refundedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const netRevenue = Math.max(grossRevenue - refundedRevenue, 0);

  const ticketsSoldFromOrders = completedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const ticketsSold = ticketsSoldFromOrders || filteredTickets.filter((t) => t.status !== 'refunded').length;

  const ticketsValid = filteredTickets.filter((t) => t.status === 'valid').length;
  const ticketsUsed = filteredTickets.filter((t) => t.status === 'used').length;
  const ticketsExpired = filteredTickets.filter((t) => t.status === 'expired').length;
  const ticketsRefunded = filteredTickets.filter((t) => t.status === 'refunded').length;

  // Attendance uses all tickets for selected events (door ops), not only sales-date filter
  const attendanceTickets = tickets;
  const checkedIn = attendanceTickets.filter((t) => t.status === 'used' || t.checked_in_at).length;
  const soldForAttendance = attendanceTickets.filter((t) => t.status !== 'refunded').length;
  const remainingCheckIn = Math.max(soldForAttendance - checkedIn, 0);
  const attendanceRate = soldForAttendance > 0 ? (checkedIn / soldForAttendance) * 100 : 0;
  const capacityUsage = capacity > 0 ? (checkedIn / capacity) * 100 : 0;

  const buyerKeyForOrder = (order: Order) => {
    if (order.user_id) return `u:${order.user_id}`;
    const customer = getPaymentCustomer(order);
    return `e:${(customer.email || 'unknown').toLowerCase()}`;
  };

  const buyerMap = new Map<
    string,
    { email: string; name?: string; orders: number; tickets: number; spend: number }
  >();

  for (const order of completedOrders) {
    const key = buyerKeyForOrder(order);
    const user = order.user_id ? userById.get(order.user_id) : undefined;
    const customer = getPaymentCustomer(order);
    const email = user?.email || customer.email || 'unknown@unknown.com';
    const name = user?.profile_name || customer.name;
    const existing = buyerMap.get(key) || { email, name, orders: 0, tickets: 0, spend: 0 };
    existing.orders += 1;
    existing.tickets += order.quantity || 0;
    existing.spend += Number(order.total_price || 0);
    if (!existing.name && name) existing.name = name;
    buyerMap.set(key, existing);
  }

  const buyers: BuyerAnalyticsRow[] = Array.from(buyerMap.entries())
    .map(([key, b]) => ({
      key,
      email: b.email,
      name: b.name,
      orders: b.orders,
      tickets: b.tickets,
      spend: b.spend,
      isReturning: b.orders >= 2,
    }))
    .sort((a, b) => b.spend - a.spend);

  const uniqueBuyers = buyers.length;
  const returningBuyers = buyers.filter((b) => b.isReturning).length;
  const newBuyers = uniqueBuyers - returningBuyers;
  const repeatRate = uniqueBuyers > 0 ? (returningBuyers / uniqueBuyers) * 100 : 0;
  const averageSpend = uniqueBuyers > 0 ? grossRevenue / uniqueBuyers : 0;
  const averageTickets = uniqueBuyers > 0 ? ticketsSold / uniqueBuyers : 0;

  const kpis: AnalyticsKpis = {
    ...emptyKpis(currency),
    capacity,
    ticketsSold: ticketsSoldInventory || ticketsSold,
    ticketsRemaining,
    sellThroughPercent: capacity > 0 ? ((ticketsSoldInventory || ticketsSold) / capacity) * 100 : 0,
    ticketsValid,
    ticketsUsed,
    ticketsExpired,
    ticketsRefunded,
    grossRevenue,
    refundedRevenue,
    netRevenue,
    checkedIn,
    remainingCheckIn,
    attendanceRate,
    capacityUsage,
    orderCount: filteredOrders.length,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    failedOrders: failedOrders.length,
    refundedOrders: refundedOrders.length,
    averageOrderValue: completedOrders.length > 0 ? grossRevenue / completedOrders.length : 0,
    averageTicketsPerOrder: completedOrders.length > 0 ? ticketsSold / completedOrders.length : 0,
    uniqueBuyers,
    currency,
  };

  // Daily series
  const dailyMap = new Map<string, TimeSeriesPoint>();
  for (const order of completedOrders) {
    const key = dayKey(order.created_at);
    const current = dailyMap.get(key) || { key, label: dayLabel(key), revenue: 0, orders: 0, tickets: 0 };
    current.revenue += Number(order.total_price || 0);
    current.orders += 1;
    current.tickets += order.quantity || 0;
    dailyMap.set(key, current);
  }
  const dailySeries = Array.from(dailyMap.values()).sort((a, b) => a.key.localeCompare(b.key));

  let runningRevenue = 0;
  let runningOrders = 0;
  let runningTickets = 0;
  const cumulativeSeries = dailySeries.map((point) => {
    runningRevenue += point.revenue;
    runningOrders += point.orders;
    runningTickets += point.tickets;
    return {
      key: point.key,
      label: point.label,
      revenue: runningRevenue,
      orders: runningOrders,
      tickets: runningTickets,
    };
  });

  // Hourly series
  const hourly: HourlyPoint[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    revenue: 0,
    orders: 0,
    checkIns: 0,
  }));
  for (const order of completedOrders) {
    const hour = new Date(order.created_at).getHours();
    hourly[hour].revenue += Number(order.total_price || 0);
    hourly[hour].orders += 1;
  }
  for (const ticket of attendanceTickets) {
    if (!ticket.checked_in_at) continue;
    if (!inRange(ticket.checked_in_at, from, to) && (from || to)) continue;
    const hour = new Date(ticket.checked_in_at).getHours();
    hourly[hour].checkIns += 1;
  }

  const checkInDayMap = new Map<string, TimeSeriesPoint>();
  for (const ticket of attendanceTickets) {
    if (!ticket.checked_in_at) continue;
    const key = dayKey(ticket.checked_in_at);
    const current = checkInDayMap.get(key) || { key, label: dayLabel(key), revenue: 0, orders: 0, tickets: 0 };
    current.tickets += 1;
    checkInDayMap.set(key, current);
  }
  const checkInTimeline = Array.from(checkInDayMap.values()).sort((a, b) => a.key.localeCompare(b.key));
  const peakCheckInHour = hourly.some((h) => h.checkIns > 0)
    ? hourly.reduce((best, row) => (row.checkIns > hourly[best].checkIns ? row.hour : best), 0)
    : null;

  // Ticket types
  const typeById = new Map(ticketTypes.map((t) => [t.id, t]));
  const typeStats = new Map<string, TicketTypeAnalyticsRow>();

  for (const tt of ticketTypes) {
    const event = eventById.get(tt.event_id);
    typeStats.set(tt.id, {
      key: tt.id,
      name: tt.name,
      eventId: tt.event_id,
      eventName: event?.name || 'Event',
      capacity: tt.total_quantity,
      sold: 0,
      remaining: tt.available_quantity,
      revenue: 0,
      attended: 0,
      refunded: 0,
      soldPercent: 0,
    });
  }

  for (const ticket of filteredTickets) {
    const key = ticket.ticket_type_id || ticket.ticket_type_name || UNKNOWN_TICKET_TYPE;
    const name = ticket.ticket_type_name || typeById.get(ticket.ticket_type_id || '')?.name || UNKNOWN_TICKET_TYPE;
    const event = eventById.get(ticket.event_id);
    const existing = typeStats.get(key);
    const price =
      typeof ticket.ticket_price === 'number'
        ? ticket.ticket_price
        : typeById.get(ticket.ticket_type_id || '')?.price ?? event?.ticket_price ?? 0;

    if (!existing) {
      typeStats.set(key, {
        key,
        name,
        eventId: ticket.event_id,
        eventName: event?.name || 'Event',
        capacity: 0,
        sold: ticket.status === 'refunded' ? 0 : 1,
        remaining: 0,
        revenue: ticket.status === 'refunded' ? 0 : price,
        attended: ticket.status === 'used' || ticket.checked_in_at ? 1 : 0,
        refunded: ticket.status === 'refunded' ? 1 : 0,
        soldPercent: 0,
      });
      continue;
    }

    if (ticket.status === 'refunded') {
      existing.refunded += 1;
    } else {
      existing.sold += 1;
      existing.revenue += price;
    }
    if (ticket.status === 'used' || ticket.checked_in_at) existing.attended += 1;
  }

  const ticketTypeRows = Array.from(typeStats.values())
    .map((row) => ({
      ...row,
      soldPercent: row.capacity > 0 ? (row.sold / row.capacity) * 100 : row.sold > 0 ? 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Payments
  const paymentMap = new Map<string, PaymentProviderRow>();
  for (const order of completedOrders) {
    const provider = order.payment_provider || 'unknown';
    const current = paymentMap.get(provider) || { provider, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += Number(order.total_price || 0);
    paymentMap.set(provider, current);
  }
  const payments = Array.from(paymentMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Affiliates
  const affiliateMap = new Map<string, AffiliateAnalyticsRow>();
  for (const order of completedOrders) {
    if (!order.affiliate_id) continue;
    const current = affiliateMap.get(order.affiliate_id) || {
      affiliateId: order.affiliate_id,
      referralCode: affiliateCodeById.get(order.affiliate_id) || order.affiliate_referral_code || '—',
      sales: 0,
      revenue: 0,
      commission: 0,
      pendingCommission: 0,
      paidCommission: 0,
    };
    current.sales += 1;
    current.revenue += Number(order.total_price || 0);
    affiliateMap.set(order.affiliate_id, current);
  }
  for (const commission of commissions) {
    if (!inRange(commission.created_at, from, to) && (from || to)) continue;
    const current = affiliateMap.get(commission.affiliate_id) || {
      affiliateId: commission.affiliate_id,
      referralCode: affiliateCodeById.get(commission.affiliate_id) || '—',
      sales: 0,
      revenue: 0,
      commission: 0,
      pendingCommission: 0,
      paidCommission: 0,
    };
    const amount = Number(commission.commission_amount || 0);
    current.commission += amount;
    if (commission.status === 'pending' || commission.status === 'approved') {
      current.pendingCommission += amount;
    }
    if (commission.status === 'paid') current.paidCommission += amount;
    affiliateMap.set(commission.affiliate_id, current);
  }
  const affiliates = Array.from(affiliateMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Verifiers
  const checkInsBySession = new Map<string, number>();
  for (const ticket of attendanceTickets) {
    if (!ticket.checked_in_by) continue;
    checkInsBySession.set(ticket.checked_in_by, (checkInsBySession.get(ticket.checked_in_by) || 0) + 1);
  }
  const verifiers: VerifierAnalyticsRow[] = verifierSessions
    .map((session) => {
      const event = eventById.get(session.event_id);
      const isActive =
        !session.revoked_at && new Date(session.expires_at).getTime() > now.getTime();
      return {
        sessionId: session.id,
        eventId: session.event_id,
        eventName: event?.name || 'Event',
        deviceName: session.device_name || 'Door device',
        createdAt: session.created_at,
        lastSeenAt: session.last_seen_at,
        expiresAt: session.expires_at,
        revokedAt: session.revoked_at,
        isActive,
        checkIns: checkInsBySession.get(session.id) || 0,
      };
    })
    .sort((a, b) => b.checkIns - a.checkIns || +new Date(b.lastSeenAt || b.createdAt) - +new Date(a.lastSeenAt || a.createdAt));

  // Capacity by event
  const revenueByEvent = new Map<string, number>();
  for (const order of completedOrders) {
    revenueByEvent.set(order.event_id, (revenueByEvent.get(order.event_id) || 0) + Number(order.total_price || 0));
  }
  const capacityByEvent: EventCapacityRow[] = events
    .map((event) => {
      const sold = Math.max(event.total_tickets - event.tickets_available, 0);
      return {
        eventId: event.id,
        eventName: event.name,
        capacity: event.total_tickets,
        sold,
        remaining: event.tickets_available,
        fillRate: event.total_tickets > 0 ? (sold / event.total_tickets) * 100 : 0,
        revenue: revenueByEvent.get(event.id) || 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Live metrics
  const tenMinAgo = now.getTime() - 10 * 60 * 1000;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const liveEvents = selectedEventId
    ? events.filter((e) => e.id === selectedEventId && isEventLive(e, now))
    : events.filter((e) => isEventLive(e, now));
  const liveEventIds = new Set(liveEvents.map((e) => e.id));
  const liveTickets = attendanceTickets.filter((t) => liveEventIds.has(t.event_id));
  const liveCheckedIn = liveTickets.filter((t) => t.status === 'used' || t.checked_in_at).length;
  const checkInsLast10Min = liveTickets.filter(
    (t) => t.checked_in_at && new Date(t.checked_in_at).getTime() >= tenMinAgo
  ).length;
  const lastCheckInAt = liveTickets
    .map((t) => t.checked_in_at)
    .filter(Boolean)
    .sort((a, b) => +new Date(b!) - +new Date(a!))[0] || null;
  const activeVerifierSessions = verifiers.filter(
    (v) => v.isActive && liveEventIds.has(v.eventId)
  ).length;
  const ticketsPurchasedToday = completedOrders.filter(
    (o) => liveEventIds.has(o.event_id) && new Date(o.created_at).getTime() >= todayStart.getTime()
  ).length;

  const live: LiveMetrics = {
    isLive: liveEvents.length > 0,
    checkedIn: liveCheckedIn,
    checkInsLast10Min,
    activeVerifierSessions,
    ticketsPurchasedToday,
    lastCheckInAt,
  };

  // Insights
  const insights: InsightCard[] = [];
  if (kpis.capacity > 0 && kpis.sellThroughPercent < 30 && events.some((e) => getEventLifecycleStatus(e) === 'approved')) {
    insights.push({
      id: 'low-sellthrough',
      tone: 'warning',
      title: 'Low sell-through',
      body: `Only ${kpis.sellThroughPercent.toFixed(0)}% of capacity is sold. Consider boosting promotion or adjusting ticket mix.`,
    });
  }
  if (kpis.orderCount > 0 && kpis.refundedOrders / Math.max(kpis.completedOrders + kpis.refundedOrders, 1) > 0.1) {
    insights.push({
      id: 'high-refunds',
      tone: 'warning',
      title: 'Elevated refunds',
      body: `${kpis.refundedOrders} refunded orders totaling ${refundedRevenue.toFixed(2)} ${currency}. Review recent cancellations.`,
    });
  }
  if (affiliates[0] && affiliates[0].revenue > 0) {
    insights.push({
      id: 'top-affiliate',
      tone: 'success',
      title: 'Top affiliate',
      body: `${affiliates[0].referralCode} drove ${affiliates[0].sales} sales and ${affiliates[0].revenue.toFixed(2)} ${currency} in attributed revenue.`,
    });
  }
  if (live.isLive && live.checkInsLast10Min > 0) {
    insights.push({
      id: 'live-momentum',
      tone: 'info',
      title: 'Door momentum',
      body: `${live.checkInsLast10Min} check-ins in the last 10 minutes across live events.`,
    });
  }
  if (ticketTypeRows[0] && ticketTypeRows[0].revenue > 0) {
    insights.push({
      id: 'top-ticket-type',
      tone: 'info',
      title: 'Top ticket type',
      body: `${ticketTypeRows[0].name} leads with ${ticketTypeRows[0].sold} sold and ${ticketTypeRows[0].revenue.toFixed(2)} ${currency} revenue.`,
    });
  }
  if (kpis.sellThroughPercent >= 80) {
    insights.push({
      id: 'strong-sales',
      tone: 'success',
      title: 'Strong sell-through',
      body: `${kpis.sellThroughPercent.toFixed(0)}% of capacity sold. Inventory is performing well.`,
    });
  }

  const recentOrders: RecentOrderRow[] = [...filteredOrders]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 12)
    .map((order) => {
      const user = order.user_id ? userById.get(order.user_id) : undefined;
      const customer = getPaymentCustomer(order);
      const event = eventById.get(order.event_id);
      return {
        id: order.id,
        eventId: order.event_id,
        eventName: event?.name || 'Event',
        quantity: order.quantity,
        totalPrice: Number(order.total_price || 0),
        currency: order.currency || currency,
        status: order.status,
        paymentProvider: order.payment_provider,
        createdAt: order.created_at,
        buyerEmail: user?.email || customer.email || 'unknown@unknown.com',
        buyerName: user?.profile_name || customer.name,
      };
    });

  return {
    generatedAt: now.toISOString(),
    filters: {
      eventId: selectedEventId,
      from: from?.toISOString() || null,
      to: to?.toISOString() || null,
    },
    events: eventSummaries,
    selectedEvent,
    kpis,
    live,
    dailySeries,
    hourlySeries: hourly,
    cumulativeSeries,
    orderStatus: [
      { status: 'completed', label: 'Completed', value: completedOrders.length, color: '#10b981' },
      { status: 'pending', label: 'Pending', value: pendingOrders.length, color: '#f59e0b' },
      { status: 'failed', label: 'Failed', value: failedOrders.length, color: '#ef4444' },
      { status: 'refunded', label: 'Refunded', value: refundedOrders.length, color: '#6366f1' },
    ].filter((item) => item.value > 0),
    ticketTypes: ticketTypeRows,
    buyers: buyers.slice(0, 25),
    customerSummary: {
      uniqueBuyers,
      newBuyers,
      returningBuyers,
      repeatRate,
      averageSpend,
      averageTickets,
    },
    payments,
    affiliates,
    verifiers,
    capacityByEvent,
    checkInTimeline,
    peakCheckInHour,
    insights,
    recentOrders,
  };
}
