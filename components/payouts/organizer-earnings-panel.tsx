'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RequestPayoutDialog, formatUgx } from '@/components/payouts/request-payout-dialog';
import {
  TOTAL_PLATFORM_AND_GATEWAY_PERCENT,
  payoutCooldownBlockedMessage,
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
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50/80 to-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700/60 dark:from-slate-900/60 dark:to-slate-950">
        <Loader2 className="h-4 w-4 animate-spin text-[#9A7B2F]" />
        Loading earnings…
      </div>
    );
  }

  if (!balance) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-[#f7f2e8]/50 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4 dark:border-slate-700/60 dark:from-slate-950 dark:via-slate-950 dark:to-[#9A7B2F]/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#9A7B2F]/12 text-[#8a6d28]">
              <Wallet className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Earnings
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ticket95 retains {TOTAL_PLATFORM_AND_GATEWAY_PERCENT}%.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 shrink-0 rounded-xl p-0 text-slate-500 sm:h-9 sm:w-9"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh earnings"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-10 flex-1 rounded-xl bg-[#9A7B2F] text-white hover:bg-[#866a28] sm:h-9 sm:flex-none"
            disabled={!balance.canRequest}
            onClick={() => setDialogOpen(true)}
          >
            Request payout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Gross" value={formatUgx(balance.grossRevenue)} />
        <Metric
          label="Fees"
          value={formatUgx(balance.gatewayFees + balance.platformFees)}
        />
        <Metric label="Affiliates" value={formatUgx(balance.affiliateDeductions)} />
        <Metric label="Available" value={formatUgx(balance.available)} emphasize />
      </div>

      {selectedEventShare ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This event:{' '}
          <span className="font-medium text-slate-800 tabular-nums dark:text-slate-200">
            {formatUgx(selectedEventShare.organizerShare)}
          </span>
        </p>
      ) : null}

      {!balance.canRequest && balance.nextPayoutAt ? (
        <p className="rounded-xl border border-amber-200/60 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {payoutCooldownBlockedMessage(balance.nextPayoutAt)}
        </p>
      ) : null}

      {!balance.canRequest && !balance.nextPayoutAt ? (
        <p className="rounded-xl border border-amber-200/60 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          Unlocks at {formatUgx(balance.minPayout)}. Paid: {formatUgx(balance.paidOut)}.
        </p>
      ) : null}

      {balance.recentPayouts.length > 0 ? (
        <>
          <div className="space-y-2 sm:hidden">
            {balance.recentPayouts.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 text-xs dark:border-slate-700/60 dark:bg-slate-900/50"
              >
                <div className="min-w-0">
                  <p className="font-medium tabular-nums text-slate-900 dark:text-slate-100">
                    {formatUgx(Number(p.amount))}
                  </p>
                  <p className="mt-0.5 truncate text-slate-500">
                    {new Date(p.requested_at).toLocaleDateString()}
                    <span className="mx-1 opacity-50">·</span>
                    {p.phone}
                  </p>
                </div>
                <Badge variant={statusVariant(p.status)} className="shrink-0 capitalize">
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-200/70 dark:border-slate-700/60">
                  <th className="py-1.5 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Amount</th>
                  <th className="py-1.5 font-medium">Phone</th>
                  <th className="py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {balance.recentPayouts.slice(0, 5).map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/80">
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
        </>
      ) : null}

      <RequestPayoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        available={balance.available}
        defaultPhone={balance.payoutPhone}
        title="Request payout"
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
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        emphasize
          ? 'border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10'
          : 'border-slate-200/70 bg-slate-50/60 dark:border-slate-700/50 dark:bg-slate-900/40'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold tabular-nums ${
          emphasize
            ? 'text-emerald-800 dark:text-emerald-300'
            : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
