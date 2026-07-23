'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Copy, Handshake, Share2, Ticket, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ProfileLoadingState,
  ProfileMetric,
  ProfilePageHeader,
  ProfileSection,
} from '@/components/profile/profile-ui';

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
    return <ProfileLoadingState label="Loading affiliate dashboard…" />;
  }

  return (
    <div className="space-y-6">
      <ProfilePageHeader
        title="Affiliate"
        description={`Share ticket links for affiliate-enabled events and earn ${commissionPercent}% commission on completed sales.`}
      />

      {!programEnabled ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900">
          The affiliate program is currently paused by Ticket95. You can still view past commissions
          below.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileMetric label="Your code" value={referralCode || '—'} icon={Handshake} />
        <ProfileMetric label="Sales" value={String(totals.sales)} />
        <ProfileMetric label="Pending" value={formatMoney(totals.pending)} accent="amber" icon={Wallet} />
        <ProfileMetric
          label="Lifetime"
          value={formatMoney(totals.lifetime)}
          accent="emerald"
          icon={Wallet}
        />
      </div>

      <ProfileSection
        title="Events you can promote"
        description="Copy or share your unique referral link for each event."
        actions={
          <Badge variant="outline" className="rounded-full">
            {commissionPercent}% commission
          </Badge>
        }
      >
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No affiliate-enabled events right now. Organizers must allow affiliates on their events.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted sm:h-[4.5rem] sm:w-[4.5rem]">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Ticket className="h-6 w-6" />
                      </div>
                    )}
                  </div>
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
                </div>
                <div className="flex gap-1.5 pl-[4.75rem] sm:pl-0">
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
                  <Button size="sm" className="rounded-xl" onClick={() => shareLink(event)}>
                    <Share2 className="mr-1.5 h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        title="Your commissions"
        description="Earnings appear here after a referred purchase completes."
      >
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2.5"
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
                    <p className="text-sm font-semibold tabular-nums">
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
      </ProfileSection>
    </div>
  );
}
