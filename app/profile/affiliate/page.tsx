'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Copy, Share2, Ticket, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ProfileLoadingState,
  ProfilePageHeader,
  ProfileSection,
} from '@/components/profile/profile-ui';
import {
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  clampAffiliateCommissionPercent,
} from '@/lib/affiliate-constants';
import { RequestPayoutDialog, formatUgx } from '@/components/payouts/request-payout-dialog';
import {
  MIN_PAYOUT_AMOUNT_UGX,
  payoutCooldownBlockedMessage,
} from '@/lib/payout-constants';
import { cn } from '@/lib/utils';
import type { Payout } from '@/lib/supabase-client';

type AffiliateEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  currency?: string;
  image_url?: string | null;
  tickets_available?: number;
  affiliate_commission_percent?: number | null;
};

type CommissionRow = {
  id: string;
  event_id: string;
  order_amount: number;
  commission_percent: number;
  commission_amount: number;
  currency: string;
  status: string;
  payout_id?: string | null;
  created_at: string;
  events?: { name: string } | null;
};

type AffiliatePayoutBalance = {
  available: number;
  pendingCommissions: number;
  paidCommissions: number;
  lifetime: number;
  minPayout: number;
  canRequest: boolean;
  cooldownDays?: number;
  lastPayoutAt?: string | null;
  nextPayoutAt?: string | null;
  payoutPhone: string | null;
  recentPayouts: Payout[];
};

const formatMoney = (amount: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
};

const formatEventDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  action,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: typeof Wallet;
  accent?: 'default' | 'emerald' | 'amber';
  action?: React.ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  const iconClass =
    accent === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-700'
      : accent === 'amber'
        ? 'bg-amber-500/10 text-amber-700'
        : 'bg-primary/10 text-primary';

  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-border/70 bg-background/70 p-3 sm:p-4',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl',
              iconClass
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-1.5 min-w-0 text-lg font-semibold tracking-tight tabular-nums sm:mt-2 sm:text-2xl',
          valueClassName
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{hint}</p> : null}
      {action ? <div className="mt-2.5">{action}</div> : null}
    </div>
  );
}

export default function AffiliateDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [programEnabled, setProgramEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [events, setEvents] = useState<AffiliateEvent[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [totals, setTotals] = useState({ lifetime: 0, pending: 0, paid: 0, sales: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [payoutBalance, setPayoutBalance] = useState<AffiliatePayoutBalance | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [affRes, balRes] = await Promise.all([
        fetch('/api/affiliates/me'),
        fetch('/api/payouts/affiliate/balance'),
      ]);
      const payload = await affRes.json();
      if (!affRes.ok) throw new Error(payload.error || 'Failed to load');
      setProgramEnabled(Boolean(payload.settings?.programEnabled));
      setReferralCode(payload.affiliate?.referral_code || '');
      setEvents(payload.events || []);
      setCommissions(payload.commissions || []);
      setTotals(payload.totals || { lifetime: 0, pending: 0, paid: 0, sales: 0 });

      if (balRes.ok) {
        const bal = await balRes.json();
        setPayoutBalance(bal);
      }
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

  const copyText = async (value: string, successTitle: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: successTitle });
      return true;
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
      return false;
    }
  };

  const copyCode = async () => {
    if (!referralCode) return;
    const ok = await copyText(referralCode, 'Code copied');
    if (!ok) return;
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = async (eventId: string) => {
    const link = buildLink(eventId);
    const ok = await copyText(link, 'Link copied');
    if (!ok) return;
    setCopiedId(eventId);
    setTimeout(() => setCopiedId(null), 2000);
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

  const handlePayoutRequest = async ({ amount, phone }: { amount: number; phone: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/payouts/affiliate/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payout request failed');
      toast({
        title: data.autoDisbursed ? 'Payout submitted' : 'Payout recorded with errors',
        description: data.autoDisbursed
          ? 'Mobile money disbursement is processing via Paytota.'
          : data.payout?.error_message || 'Check payout history for details.',
      });
      setDialogOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ProfileLoadingState label="Loading…" />;
  }

  const available = payoutBalance?.available ?? totals.pending;
  const canRequest = payoutBalance?.canRequest ?? available >= MIN_PAYOUT_AMOUNT_UGX;
  const paidHint = payoutBalance
    ? `Paid ${formatUgx(payoutBalance.paidCommissions)}`
    : `Paid ${formatMoney(totals.paid)}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProfilePageHeader title="Affiliate" description="Promote events. Earn commission." />

      {!programEnabled ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-900 sm:px-4">
          Program paused. Past commissions still shown below.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        <MetricCard
          label="Available"
          value={formatUgx(available)}
          accent="amber"
          icon={Wallet}
          hint={`Min ${formatUgx(MIN_PAYOUT_AMOUNT_UGX)}`}
          valueClassName="truncate text-base sm:text-2xl"
          className="col-span-2 lg:col-span-1"
          action={
            <Button
              type="button"
              size="sm"
              className="h-9 w-full rounded-lg text-xs sm:w-auto"
              disabled={!canRequest}
              onClick={() => setDialogOpen(true)}
            >
              Request payout
            </Button>
          }
        />
        <MetricCard label="Sales" value={String(totals.sales)} />
        <MetricCard
          label="Lifetime"
          value={formatMoney(totals.lifetime)}
          accent="emerald"
          icon={Wallet}
          hint={paidHint}
          valueClassName="truncate text-base sm:text-2xl"
        />
      </div>

      {!canRequest && payoutBalance?.nextPayoutAt ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {payoutCooldownBlockedMessage(payoutBalance.nextPayoutAt)}
        </p>
      ) : null}

      <ProfileSection title="Events">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events to promote right now.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const eventCommission = clampAffiliateCommissionPercent(
                event.affiliate_commission_percent ?? DEFAULT_AFFILIATE_COMMISSION_PERCENT
              );
              return (
                <div
                  key={event.id}
                  className="overflow-hidden rounded-xl border border-border/70 bg-background/70"
                >
                  <div className="flex items-start gap-3 p-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted sm:h-16 sm:w-16">
                      {event.image_url ? (
                        <Image
                          src={event.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Ticket className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                        <Link
                          href={`/events/${event.id}?ref=${encodeURIComponent(referralCode)}`}
                          className="line-clamp-2 min-w-0 text-sm font-medium leading-snug hover:underline sm:text-base"
                        >
                          {event.name}
                        </Link>
                        <Badge
                          variant="outline"
                          className="w-fit shrink-0 rounded-full border-emerald-500/30 bg-emerald-500/10 text-[10px] tabular-nums text-emerald-800 sm:text-xs"
                        >
                          {eventCommission}%
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                        <span>{formatEventDate(event.date)}</span>
                        <span className="mx-1 opacity-50">·</span>
                        <span className="break-words">{event.venue}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/20 p-2.5 sm:flex sm:justify-end sm:bg-transparent sm:p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-11 rounded-xl sm:h-9 sm:min-w-[6.5rem]"
                      onClick={() => copyLink(event.id)}
                    >
                      {copiedId === event.id ? (
                        <Check className="mr-1.5 h-4 w-4" />
                      ) : (
                        <Copy className="mr-1.5 h-4 w-4" />
                      )}
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      className="h-11 rounded-xl sm:h-9 sm:min-w-[6.5rem]"
                      onClick={() => shareLink(event)}
                    >
                      <Share2 className="mr-1.5 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Commissions">
        {commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commissions yet.</p>
        ) : (
          <div className="space-y-2">
            {commissions.map((row) => {
              const eventName = row.events?.name || 'Event';
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium leading-snug sm:truncate">
                      {eventName}
                    </p>
                    <p className="mt-0.5 break-words text-[11px] text-muted-foreground sm:text-xs">
                      {row.commission_percent}% of{' '}
                      {formatMoney(Number(row.order_amount), row.currency)}
                      <span className="mx-1 opacity-50">·</span>
                      {new Date(row.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:flex-col sm:items-end sm:justify-center">
                    <p className="min-w-0 truncate text-sm font-semibold tabular-nums">
                      {formatMoney(Number(row.commission_amount), row.currency)}
                    </p>
                    <Badge
                      variant="outline"
                      className="shrink-0 rounded-full capitalize text-[10px]"
                    >
                      {row.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ProfileSection>

      {payoutBalance && payoutBalance.recentPayouts.length > 0 ? (
        <ProfileSection title="Payouts">
          <div className="space-y-2">
            {payoutBalance.recentPayouts.slice(0, 8).map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-xl border border-border/70 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium tabular-nums">{formatUgx(Number(p.amount))}</p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {new Date(p.requested_at).toLocaleDateString()}
                    <span className="mx-1 opacity-50">·</span>
                    {p.phone}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit shrink-0 capitalize">
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </ProfileSection>
      ) : null}

      {referralCode ? (
        <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground/70">
          <span>Code</span>
          <span className="font-mono tabular-nums tracking-wide">{referralCode}</span>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
            aria-label="Copy referral code"
          >
            {copiedCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      ) : null}

      <RequestPayoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        available={available}
        defaultPhone={payoutBalance?.payoutPhone}
        title="Request payout"
        submitting={submitting}
        onSubmit={handlePayoutRequest}
      />
    </div>
  );
}
