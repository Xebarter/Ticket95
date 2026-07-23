'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getOrdersByEvent,
  getTicketTypesByEvent,
  getTicketsByEvent,
  getUsersByIds,
} from '@/lib/supabase-db';
import type { Event } from '@/lib/supabase-client';
import { buildEventManagementData } from './helpers';
import type { EventManagementData } from './types';

export function useEventManagement(event: Event | null) {
  const [data, setData] = useState<EventManagementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const eventRef = useRef(event);
  eventRef.current = event;

  const eventId = event?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    const loadEventData = async () => {
      if (!eventId) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [orders, tickets, ticketTypes] = await Promise.all([
          getOrdersByEvent(eventId),
          getTicketsByEvent(eventId),
          getTicketTypesByEvent(eventId),
        ]);

        const userIds = Array.from(
          new Set(orders.map((order) => order.user_id).filter(Boolean))
        ) as string[];
        const users = userIds.length > 0 ? await getUsersByIds(userIds) : [];

        if (cancelled) return;

        const latestEvent = eventRef.current;
        if (!latestEvent || latestEvent.id !== eventId) return;

        setData(buildEventManagementData(latestEvent, orders, tickets, users, ticketTypes));
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load event management data.');
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadEventData();
    return () => {
      cancelled = true;
    };
  }, [eventId, reloadKey]);

  // Merge live event patches (e.g. affiliates) without a second effect / refetch
  const resolvedData = useMemo<EventManagementData | null>(() => {
    if (!data) return null;
    if (!event || event.id !== data.event.id) return data;
    return { ...data, event };
  }, [data, event]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data: resolvedData, loading, error, reload };
}
