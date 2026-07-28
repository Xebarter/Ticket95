'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RequestPayoutDialog, formatUgx } from '@/components/payouts/request-payout-dialog';
import {
  PAYOUT_COOLDOWN_DAYS,
  TOTAL_PLATFORM_AND_GATEWAY_PERCENT,
  payoutCooldownBlockedMessage,
  payoutCooldownPolicyMessage,
} from '@/lib/payout-constants';
import type { Payout } from '@/lib/supabase-client';

type OrganizerBalance = {
  currency: string;
  grossRevenue: number;
  gatewayFees: number;
  platformFees: number;
  affiliateDeductions: number;
  organizerEarned: number;
  paidOut: number;
  available: number;
  minPayout: number;
  canRequest: boolean;
  cooldownDays?: number;
  lastPayoutAt?: string | null;
  nextPayoutAt?: string | null;
  payoutPhone: string | null;
  recentPayouts: Payout[];
  perEvent: Array<{
    eventId: string;
    eventName: string;
    grossRevenue: number;
    organizerShare: number;
    affiliateDeductions: number;
  }>;
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'success') return 'default';
  if (status === 'error') return 'destructive';
  if (status === 'processing' || status === 'pending') return 'secondary';
  return 'outline';
}

export function OrganizerEarningsPanel({ selectedEventId }: { selectedEventId?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [balance, setBalance] = useState<OrganizerBalance | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts/organizer/balance');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load earnings');
      setBalance(data);
    } catch (error) {
      toast({
        title: 'Couldn’t load earnings',
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

  const selectedEventShare = balance?.perEvent.find((e) => e.eventId === selectedEventId);

  const handleRequest = async ({ amount, phone }: { amount: number; phone: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/payouts/organizer/request', {
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

  if (loading && !balance) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading earnings…
      </div>
    );
  }

  if (!balance) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight">Earnings & payouts</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ticket95 retains {TOTAL_PLATFORM_AND_GATEWAY_PERCENT}% (2% platform + 3.5% gateway).
            Affiliate cuts apply only on referred sales.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {payoutCooldownPolicyMessage(balance.cooldownDays ?? PAYOUT_COOLDOWN_DAYS)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            disabled={!balance.canRequest}
            onClick={() => setDialogOpen(true)}
          >
            Request payout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Gross sales" value={formatUgx(balance.grossRevenue)} />
        <Metric
          label="Fees (5.5%)"
          value={formatUgx(balance.gatewayFees + balance.platformFees)}
        />
        <Metric label="Affiliate cuts" value={formatUgx(balance.affiliateDeductions)} />
        <Metric label="Available" value={formatUgx(balance.available)} emphasize />
      </div>

      {selectedEventShare ? (
        <p className="text-xs text-muted-foreground">
          This event net:{' '}
          <span className="font-medium text-foreground tabular-nums">
            {formatUgx(selectedEventShare.organizerShare)}
          </span>
          {selectedEventShare.affiliateDeductions > 0
            ? ` (after ${formatUgx(selectedEventShare.affiliateDeductions)} affiliate)`
            : null}
        </p>
      ) : null}

      {!balance.canRequest && balance.nextPayoutAt ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {payoutCooldownBlockedMessage(balance.nextPayoutAt)}
        </p>
      ) : null}

      {!balance.canRequest && !balance.nextPayoutAt ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Payouts unlock at {formatUgx(balance.minPayout)}. Paid out so far:{' '}
          {formatUgx(balance.paidOut)}.
        </p>
      ) : null}

      {balance.recentPayouts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-1.5 font-medium">Date</th>
                <th className="py-1.5 font-medium">Amount</th>
                <th className="py-1.5 font-medium">Phone</th>
                <th className="py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {balance.recentPayouts.slice(0, 5).map((p) => (
                <tr key={p.id} className="border-b border-border/40">
                  <td className="py-1.5 tabular-nums">
                    {new Date(p.requested_at).toLocaleDateString()}
                  </td>
                  <td className="py-1.5 tabular-nums">{formatUgx(Number(p.amount))}</td>
                  <td className="py-1.5">{p.phone}</td>
                  <td className="py-1.5">
                    <Badge variant={statusVariant(p.status)} className="capitalize">
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <RequestPayoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        available={balance.available}
        defaultPhone={balance.payoutPhone}
        title="Request organizer payout"
        submitting={submitting}
        onSubmit={handleRequest}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold tabular-nums ${
          emphasize ? 'text-emerald-700 dark:text-emerald-400' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
