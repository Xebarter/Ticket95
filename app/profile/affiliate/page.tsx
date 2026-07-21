'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Copy, Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AffiliateEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  currency?: string;
  image_url?: string | null;
  tickets_available?: number;
};

type CommissionRow = {
  id: string;
  event_id: string;
  order_amount: number;
  commission_percent: number;
  commission_amount: number;
  currency: string;
  status: string;
  created_at: string;
  events?: { name: string } | null;
};

const formatMoney = (amount: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
};

export default function AffiliateDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [programEnabled, setProgramEnabled] = useState(true);
  const [commissionPercent, setCommissionPercent] = useState(5);
  const [referralCode, setReferralCode] = useState('');
  const [events, setEvents] = useState<AffiliateEvent[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [totals, setTotals] = useState({ lifetime: 0, pending: 0, paid: 0, sales: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/affiliates/me');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load');
      setProgramEnabled(Boolean(payload.settings?.programEnabled));
      setCommissionPercent(Number(payload.settings?.commissionPercent) || 5);
      setReferralCode(payload.affiliate?.referral_code || '');
      setEvents(payload.events || []);
      setCommissions(payload.commissions || []);
      setTotals(payload.totals || { lifetime: 0, pending: 0, paid: 0, sales: 0 });
    } catch (error) {
      toast({
        title: 'Couldn’t load affiliate dashboard',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildLink = (eventId: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/events/${eventId}?ref=${encodeURIComponent(referralCode)}`;
  };

  const copyLink = async (eventId: string) => {
    const link = buildLink(eventId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(eventId);
      toast({ title: 'Affiliate link copied' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  const shareLink = async (event: AffiliateEvent) => {
    const link = buildLink(event.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Get tickets for ${event.name}`,
          url: link,
        });
        return;
      } catch {
        // fall through to copy
      }
    }
    await copyLink(event.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Affiliate</h1>
        <p className="text-sm text-muted-foreground">
          Share ticket links for affiliate-enabled events and earn {commissionPercent}% commission on
          completed sales.
        </p>
      </header>

      {!programEnabled ? (
        <Card className="border-border/70">
          <CardContent className="p-4 text-sm text-muted-foreground">
            The affiliate program is currently paused by Ticket95. You can still view past
            commissions below.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Your code" value={referralCode || '—'} />
        <Metric label="Sales" value={String(totals.sales)} />
        <Metric label="Pending" value={formatMoney(totals.pending)} />
        <Metric label="Lifetime" value={formatMoney(totals.lifetime)} />
      </div>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Events you can promote</p>
            <Badge variant="outline" className="rounded-full">
              {commissionPercent}% commission
            </Badge>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No affiliate-enabled events right now. Organizers must allow affiliates on their
              events.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/events/${event.id}?ref=${encodeURIComponent(referralCode)}`}
                      className="font-medium leading-snug hover:underline"
                    >
                      {event.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      · {event.venue}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => copyLink(event.id)}
                    >
                      {copiedId === event.id ? (
                        <Check className="mr-1.5 h-4 w-4" />
                      ) : (
                        <Copy className="mr-1.5 h-4 w-4" />
                      )}
                      Copy link
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => shareLink(event)}
                    >
                      <Share2 className="mr-1.5 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <p className="text-sm font-medium">Your commissions</p>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No earnings yet. Share a link and commissions appear here after a successful purchase.
            </p>
          ) : (
            <div className="space-y-2">
              {commissions.map((row) => {
                const eventName = row.events?.name || 'Event';
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{eventName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.commission_percent}% of{' '}
                        {formatMoney(Number(row.order_amount), row.currency)} ·{' '}
                        {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {formatMoney(Number(row.commission_amount), row.currency)}
                      </p>
                      <Badge variant="outline" className="mt-1 rounded-full capitalize text-[10px]">
                        {row.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
