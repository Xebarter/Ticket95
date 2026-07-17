import type { Event, Order, Ticket, TicketType, User } from '@/lib/supabase-client';
import type {
  EventBuyerSummary,
  EventManagementData,
  EventPurchaseRow,
  EventTicketTypeSummary,
  TicketCountMap,
} from './types';

const UNKNOWN_TICKET_TYPE = 'General';

function getPaymentCustomer(order: Order): { email?: string; name?: string } {
  const metadata = order.payment_metadata as { customer?: { email?: string; name?: string } } | undefined;
  return metadata?.customer || {};
}

function resolveBuyer(order: Order, userById: Map<string, User>) {
  const user = order.user_id ? userById.get(order.user_id) : undefined;
  const customer = getPaymentCustomer(order);
  const email = user?.email || customer.email || 'unknown@unknown.com';
  const name = user?.profile_name || customer.name;
  return { email, name };
}

function buildTicketCountMap(tickets: Ticket[]): TicketCountMap {
  return tickets.reduce<TicketCountMap>((acc, ticket) => {
    const key = ticket.ticket_type_name || UNKNOWN_TICKET_TYPE;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildPurchases(orders: Order[], ticketsByOrderId: Map<string, Ticket[]>, userById: Map<string, User>) {
  const rows: EventPurchaseRow[] = orders
    .map((order) => {
      const tickets = ticketsByOrderId.get(order.id) || [];
      const { email, name } = resolveBuyer(order, userById);
      return {
        order,
        buyerEmail: email,
        buyerName: name,
        tickets,
        ticketCountByType: buildTicketCountMap(tickets),
        totalTickets: tickets.length || order.quantity,
      };
    })
    .sort((a, b) => +new Date(b.order.created_at) - +new Date(a.order.created_at));

  return rows;
}

function buildTicketTypeSummaries(ticketTypes: TicketType[], purchases: EventPurchaseRow[], fallbackPrice: number) {
  const summaryByKey = new Map<string, EventTicketTypeSummary>();

  ticketTypes.forEach((ticketType) => {
    summaryByKey.set(ticketType.id, {
      key: ticketType.id,
      name: ticketType.name,
      soldCount: 0,
      availableCount: ticketType.available_quantity,
      unitPrice: ticketType.price,
      grossRevenue: 0,
    });
  });

  for (const purchase of purchases) {
    if (purchase.order.status !== 'completed') continue;
    for (const ticket of purchase.tickets) {
      const key = ticket.ticket_type_id || ticket.ticket_type_name || UNKNOWN_TICKET_TYPE;
      const name = ticket.ticket_type_name || UNKNOWN_TICKET_TYPE;
      const existing = summaryByKey.get(key);
      const price = typeof ticket.ticket_price === 'number' ? ticket.ticket_price : existing?.unitPrice ?? fallbackPrice;
      if (existing) {
        existing.soldCount += 1;
        existing.grossRevenue += price;
        continue;
      }
      summaryByKey.set(key, {
        key,
        name,
        soldCount: 1,
        availableCount: null,
        unitPrice: price,
        grossRevenue: price,
      });
    }
  }

  return Array.from(summaryByKey.values()).sort((a, b) => b.soldCount - a.soldCount);
}

function buildBuyerSummaries(purchases: EventPurchaseRow[]) {
  const buyerMap = new Map<string, EventBuyerSummary>();

  for (const purchase of purchases) {
    const key = purchase.order.user_id || purchase.buyerEmail.toLowerCase();
    const existing = buyerMap.get(key);
    if (!existing) {
      buyerMap.set(key, {
        key,
        name: purchase.buyerName,
        email: purchase.buyerEmail,
        totalTickets: purchase.order.status === 'completed' ? purchase.totalTickets : 0,
        completedOrders: purchase.order.status === 'completed' ? 1 : 0,
        latestPurchaseAt: purchase.order.created_at,
        purchasedByType: purchase.order.status === 'completed' ? { ...purchase.ticketCountByType } : {},
      });
      continue;
    }

    existing.latestPurchaseAt =
      +new Date(existing.latestPurchaseAt || 0) < +new Date(purchase.order.created_at)
        ? purchase.order.created_at
        : existing.latestPurchaseAt;

    if (purchase.order.status === 'completed') {
      existing.totalTickets += purchase.totalTickets;
      existing.completedOrders += 1;
      for (const [typeName, count] of Object.entries(purchase.ticketCountByType)) {
        existing.purchasedByType[typeName] = (existing.purchasedByType[typeName] || 0) + count;
      }
    }
  }

  return Array.from(buyerMap.values()).sort((a, b) => b.totalTickets - a.totalTickets);
}

export function buildEventManagementData(
  event: Event,
  orders: Order[],
  tickets: Ticket[],
  users: User[],
  ticketTypes: TicketType[]
): EventManagementData {
  const userById = new Map(users.map((user) => [user.id, user]));
  const ticketsByOrderId = new Map<string, Ticket[]>();
  tickets.forEach((ticket) => {
    const current = ticketsByOrderId.get(ticket.order_id) || [];
    current.push(ticket);
    ticketsByOrderId.set(ticket.order_id, current);
  });

  const purchases = buildPurchases(orders, ticketsByOrderId, userById);
  const buyers = buildBuyerSummaries(purchases);
  const ticketTypeSummaries = buildTicketTypeSummaries(ticketTypes, purchases, event.ticket_price);

  const completedPurchases = purchases.filter((purchase) => purchase.order.status === 'completed');
  const grossRevenue = completedPurchases.reduce((sum, purchase) => sum + purchase.order.total_price, 0);
  const soldTickets = completedPurchases.reduce((sum, purchase) => sum + purchase.totalTickets, 0);
  const latestPurchaseAt = completedPurchases[0]?.order.created_at;

  return {
    event,
    ticketTypes,
    purchases,
    buyers,
    ticketTypeSummaries,
    metrics: {
      soldTickets,
      grossRevenue,
      uniqueBuyers: buyers.filter((buyer) => buyer.totalTickets > 0).length,
      latestPurchaseAt,
    },
  };
}

export function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDateTime(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
