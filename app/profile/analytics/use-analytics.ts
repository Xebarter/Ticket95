'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnalyticsDatePreset,
  ProfileAnalyticsPayload,
} from '@/lib/profile-analytics';

type AnalyticsResponse = ProfileAnalyticsPayload & { success?: boolean; error?: string };

const LIVE_POLL_MS = 10_000;

export function useOrganizerAnalytics() {
  const [eventId, setEventId] = useState<string>('');
  const [preset, setPreset] = useState<AnalyticsDatePreset>('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<ProfileAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (eventId) params.set('eventId', eventId);
    if (preset === 'custom') {
      if (customFrom) params.set('from', new Date(customFrom).toISOString());
      if (customTo) {
        const end = new Date(customTo);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
    }
    return params.toString();
  }, [eventId, preset, customFrom, customTo]);

  const fetchAnalytics = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      if (hasLoadedRef.current) setRefreshing(true);
      else setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/profile/analytics?${queryString}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json()) as AnalyticsResponse;
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load analytics');
      }
      setData(json);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryString]);

  useEffect(() => {
    hasLoadedRef.current = false;
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const isLive = Boolean(data?.live?.isLive);

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => {
      void fetchAnalytics({ silent: true });
    }, LIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [isLive, fetchAnalytics]);

  const refresh = useCallback(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    eventId,
    setEventId,
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    data,
    loading,
    refreshing,
    error,
    refresh,
    isLive,
  };
}
