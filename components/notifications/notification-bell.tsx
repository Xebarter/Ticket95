'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/lib/notifications';

const POLL_MS = 45_000;
const FETCH_TIMEOUT_MS = 10_000;

function relativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const delta = Math.max(0, Date.now() - then);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isBenignFetchError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  const message = error.message.toLowerCase();
  return (
    name === 'AbortError' ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('aborted')
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch('/api/notifications?limit=30', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      // Transient network / abort / HMR — don't surface as a console TypeError overlay.
      if (!isBenignFetchError(error)) {
        console.warn('Failed to load notifications:', error);
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refresh();
    };

    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      abortRef.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [open, refresh]);

  const markOneRead = async (notification: AppNotification) => {
    if (notification.read_at) return;
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
    } catch (error) {
      if (!isBenignFetchError(error)) {
        console.warn('Failed to mark notification read:', error);
      }
      void refresh();
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch (error) {
      if (!isBenignFetchError(error)) {
        console.warn('Failed to mark all notifications read:', error);
      }
      void refresh();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
            </p>
          </div>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <ScrollArea className="h-[min(22rem,60vh)]">
          {loading && notifications.length === 0 ? (
            <div className="space-y-2 p-3">
              <div className="h-14 animate-pulse rounded-xl bg-muted" />
              <div className="h-14 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You’ll be alerted when new events go live.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.map((notification) => {
                const unread = !notification.read_at;
                const content = (
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm leading-snug', unread ? 'font-semibold' : 'font-medium')}>
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {relativeTime(notification.created_at)}
                    </p>
                  </div>
                );

                return (
                  <li key={notification.id}>
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        onClick={() => {
                          void markOneRead(notification);
                          setOpen(false);
                        }}
                        className={cn(
                          'flex gap-3 px-3 py-3 transition-colors hover:bg-muted/50',
                          unread && 'bg-primary/[0.04]'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            unread ? 'bg-primary' : 'bg-transparent'
                          )}
                          aria-hidden
                        />
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void markOneRead(notification)}
                        className={cn(
                          'flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50',
                          unread && 'bg-primary/[0.04]'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            unread ? 'bg-primary' : 'bg-transparent'
                          )}
                          aria-hidden
                        />
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
