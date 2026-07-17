import type { Event, Order, Ticket, TicketType } from '@/lib/supabase-client';

export type TicketCountMap = Record<string, number>;

export type EventPurchaseRow = {
  order: Order;
  buyerName?: string;
  buyerEmail: string;
  tickets: Ticket[];
  ticketCountByType: TicketCountMap;
  totalTickets: number;
};

export type EventBuyerSummary = {
  key: string;
  name?: string;
  email: string;
  totalTickets: number;
  completedOrders: number;
  latestPurchaseAt?: string;
  purchasedByType: TicketCountMap;
};

export type EventTicketTypeSummary = {
  key: string;
  name: string;
  soldCount: number;
  availableCount: number | null;
  unitPrice: number | null;
  grossRevenue: number;
};

export type EventManagementMetrics = {
  soldTickets: number;
  grossRevenue: number;
  uniqueBuyers: number;
  latestPurchaseAt?: string;
};

export type EventManagementData = {
  event: Event;
  ticketTypes: TicketType[];
  purchases: EventPurchaseRow[];
  buyers: EventBuyerSummary[];
  ticketTypeSummaries: EventTicketTypeSummary[];
  metrics: EventManagementMetrics;
};
