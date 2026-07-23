'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/supabase-auth-context';
import { getEventsByOrganizer, getOrdersByUser, getTicketsByUserOrEmail } from '@/lib/supabase-db';
import type { Event, Order, Ticket } from '@/lib/supabase-client';
import { getEventLifecycleStatus } from '@/lib/event-status';

export function useProfileData() {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setMyEvents([]);
        setMyOrders([]);
        setMyTickets([]);
        setLoading(false);
        return;
      }

      try {
        const [events, orders, tickets] = await Promise.all([
          getEventsByOrganizer(user.id),
          getOrdersByUser(user.id),
          getTicketsByUserOrEmail(user.id, user.email),
        ]);
        setMyEvents(events);
        setMyOrders(orders);
        setMyTickets(tickets);
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [user?.id, user?.email]);

  const totals = useMemo(() => {
    const validTickets = myTickets.filter((ticket) => ticket.status === 'valid').length;
    const approvedEvents = myEvents.filter((event) => getEventLifecycleStatus(event) === 'approved').length;
    const totalSpent = myOrders
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + order.total_price, 0);
    const estimatedRevenue = myEvents.reduce((sum, event) => {
      const sold = Math.max(event.total_tickets - event.tickets_available, 0);
      return sum + sold * event.ticket_price;
    }, 0);

    return { validTickets, approvedEvents, totalSpent, estimatedRevenue };
  }, [myEvents, myOrders, myTickets]);

  const patchEvent = (eventId: string, patch: Partial<Event>) => {
    setMyEvents((prev) =>
      prev.map((event) => (event.id === eventId ? { ...event, ...patch } : event))
    );
  };

  return { user, loading, myEvents, myOrders, myTickets, totals, patchEvent };
}
