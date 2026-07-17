'use client';

import { useEffect, useState } from 'react';
import { getOrdersByEvent, getTicketTypesByEvent, getTicketsByEvent, getUsersByIds } from '@/lib/supabase-db';
import type { Event } from '@/lib/supabase-client';
import { buildEventManagementData } from './helpers';
import type { EventManagementData } from './types';

export function useEventManagement(event: Event | null) {
  const [data, setData] = useState<EventManagementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadEventData = async () => {
      if (!event) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [orders, tickets, ticketTypes] = await Promise.all([
          getOrdersByEvent(event.id),
          getTicketsByEvent(event.id),
          getTicketTypesByEvent(event.id),
        ]);

        const userIds = Array.from(new Set(orders.map((order) => order.user_id).filter(Boolean))) as string[];
        const users = userIds.length > 0 ? await getUsersByIds(userIds) : [];

        if (!mounted) return;
        setData(buildEventManagementData(event, orders, tickets, users, ticketTypes));
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load event management data.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadEventData();
    return () => {
      mounted = false;
    };
  }, [event]);

  return { data, loading, error };
}
