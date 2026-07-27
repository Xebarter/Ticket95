'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatUgx } from '@/components/payouts/request-payout-dialog';
import { Loader2, RefreshCw, RotateCcw, Banknote } from 'lucide-react';

type AdminPayoutRow = {
  id: string;
  payee_type: 'organizer' | 'affiliate';
  amount: number;
  currency: string;
  phone: string;
  email?: string | null;
  status: string;
  paytota_payout_id?: string | null;
  paytota_reference: string;
  requested_at: string;
  processed_at?: string | null;
  error_message?: string | null;
  payee_email?: string;
  payee_name?: string | null;
};

type Totals = {
  pending: number;
  processing: number;
  success: number;
  error: number;
  cancelled: number;
  count: number;
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'success') return 'default';
  if (status === 'error') return 'destructive';
  if (status === 'processing' || status === 'pending') return 'secondary';
  return 'outline';
}

export default function AdminPayoutClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<AdminPayoutRow[]>([]);
  const [totals, setTotals] = useState<Totals>({
    pending: 0,
    processing: 0,
    success: 0,
    error: 0,
    cancelled: 0,
    count: 0,
  });
  const [platformFeesAccrued, setPlatformFeesAccrued] = useState(0);
  const [paytotaBalance, setPaytotaBalance] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<string>('all');
  const [payeeType, setPayeeType] = useState<string>('all');
  const [q, setQ] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (payeeType !== 'all') params.set('payeeType', payeeType);
      if (q.trim()) params.set('q', q.trim());

      const res = await fetch(`/api/admin/payouts?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payouts');
      setPayouts(data.payouts || []);
      setTotals(data.totals || totals);
      setPlatformFeesAccrued(Number(data.platformFeesAccrued) || 0);
      setPaytotaBalance(data.paytotaBalance || null);
    } catch (error) {
      toast({
        title: 'Couldn’t load payouts',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, payeeType, q, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (id: string, action: 'retry' | 'refresh') => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/payouts/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${action} failed`);
      toast({
        title: action === 'retry' ? 'Retry submitted' : 'Status refreshed',
        description: data.payout?.status
          ? `Current status: ${data.payout.status}`
          : undefined,
      });
      await load();
    } catch (error) {
      toast({
        title: action === 'retry' ? 'Retry failed' : 'Refresh failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  const availablePayoutBalance =
    paytotaBalance?.available_payout_balance ??
    paytotaBalance?.payout_balance ??
    paytotaBalance?.available_balance ??
    null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor Paytota mobile money disbursements for organizers and affiliates. Requests
            auto-disburse; use retry on failures.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Paytota payout balance"
          value={
            availablePayoutBalance != null
              ? formatUgx(Number(availablePayoutBalance))
              : 'Unavailable'
          }
          icon={Banknote}
        />
        <SummaryCard label="Platform fees accrued (2%)" value={formatUgx(platformFeesAccrued)} />
        <SummaryCard label="Pending / processing" value={formatUgx(totals.pending + totals.processing)} />
        <SummaryCard label="Successful payouts" value={formatUgx(totals.success)} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search phone, email, reference…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={payeeType} onValueChange={setPayeeType}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Payee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payees</SelectItem>
            <SelectItem value="organizer">Organizer</SelectItem>
            <SelectItem value="affiliate">Affiliate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && payouts.length === 0 ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payouts…
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 px-4 py-12 text-center text-sm text-muted-foreground">
          No payouts match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border/70 bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-medium">Payee</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Phone</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Reference</th>
                <th className="px-3 py-2.5 font-medium">Requested</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((row) => (
                <tr key={row.id} className="border-b border-border/50 align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{row.payee_name || row.payee_email || '—'}</p>
                    <p className="text-xs text-muted-foreground">{row.payee_email}</p>
                    {row.error_message ? (
                      <p className="mt-1 max-w-[220px] text-xs text-destructive">{row.error_message}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 capitalize">{row.payee_type}</td>
                  <td className="px-3 py-2.5 tabular-nums font-medium">
                    {formatUgx(Number(row.amount))}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{row.phone}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={statusVariant(row.status)} className="capitalize">
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="max-w-[140px] truncate font-mono text-xs" title={row.paytota_reference}>
                      {row.paytota_reference}
                    </p>
                    {row.paytota_payout_id ? (
                      <p
                        className="max-w-[140px] truncate font-mono text-[10px] text-muted-foreground"
                        title={row.paytota_payout_id}
                      >
                        {row.paytota_payout_id}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums">
                    {new Date(row.requested_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={actionId === row.id || !row.paytota_payout_id}
                        onClick={() => void runAction(row.id, 'refresh')}
                      >
                        {actionId === row.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        )}
                        Sync
                      </Button>
                      {(row.status === 'error' || row.status === 'pending') && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8"
                          disabled={actionId === row.id}
                          onClick={() => void runAction(row.id, 'retry')}
                        >
                          {actionId === row.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          )}
                          Retry
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Banknote;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground/70" /> : null}
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
