'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type CommissionRow = {
  id: string;
  order_id: string;
  event_name: string;
  affiliate_code: string;
  affiliate_email: string;
  affiliate_name: string | null;
  order_amount: number;
  commission_percent: number;
  commission_amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  created_at: string;
};

type AffiliateRow = {
  id: string;
  referral_code: string;
  status: string;
  email: string;
  profile_name: string | null;
  created_at: string;
};

const formatMoney = (amount: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export default function AdminAffiliatesClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [totals, setTotals] = useState({ totalEarned: 0, totalPayable: 0, totalPaid: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const response = await fetch(`/api/admin/affiliates${qs}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load');
      setCommissions(payload.commissions || []);
      setAffiliates(payload.affiliates || []);
      setTotals(payload.totals || { totalEarned: 0, totalPayable: 0, totalPaid: 0 });
    } catch (error) {
      toast({
        title: 'Couldn’t load affiliates',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (commissionId: string, status: string) => {
    setUpdatingId(commissionId);
    try {
      const response = await fetch('/api/admin/affiliates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Update failed');
      toast({ title: `Marked as ${status}` });
      await load();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Affiliates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track reseller commissions and mark payouts.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'pending', 'approved', 'paid', 'cancelled'].map((value) => (
            <Button
              key={value}
              size="sm"
              variant={statusFilter === value ? 'default' : 'outline'}
              className="rounded-xl capitalize"
              onClick={() => setStatusFilter(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Lifetime commissions" value={formatMoney(totals.totalEarned)} />
        <Metric label="Payable" value={formatMoney(totals.totalPayable)} />
        <Metric label="Paid out" value={formatMoney(totals.totalPaid)} />
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card className="border-border/70">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <p className="text-sm font-medium">Commissions</p>
              {commissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commissions yet.</p>
              ) : (
                <div className="space-y-2">
                  {commissions.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium leading-snug">{row.event_name}</p>
                          <Badge variant="outline" className="rounded-full capitalize">
                            {row.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.affiliate_name || row.affiliate_email} · {row.affiliate_code} ·{' '}
                          {row.commission_percent}% of {formatMoney(Number(row.order_amount), row.currency)}
                        </p>
                        <p className="text-sm font-medium tabular-nums">
                          {formatMoney(Number(row.commission_amount), row.currency)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {row.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={updatingId === row.id}
                            onClick={() => updateStatus(row.id, 'approved')}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {row.status === 'pending' || row.status === 'approved' ? (
                          <Button
                            size="sm"
                            className="rounded-xl"
                            disabled={updatingId === row.id}
                            onClick={() => updateStatus(row.id, 'paid')}
                          >
                            Mark paid
                          </Button>
                        ) : null}
                        {row.status !== 'cancelled' && row.status !== 'paid' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-muted-foreground"
                            disabled={updatingId === row.id}
                            onClick={() => updateStatus(row.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <p className="text-sm font-medium">Affiliates ({affiliates.length})</p>
              {affiliates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No affiliates enrolled yet.</p>
              ) : (
                <div className="space-y-2">
                  {affiliates.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.profile_name || row.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.email} · code {row.referral_code}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 rounded-full capitalize">
                        {row.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
