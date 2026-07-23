'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProfileSection } from '@/components/profile/profile-ui';
import { Search } from 'lucide-react';
import { formatDateTime, formatMoney } from '../helpers';
import type { EventPurchaseRow } from '../types';

type Props = {
  purchases: EventPurchaseRow[];
  currency: string;
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'pending') return 'secondary';
  if (status === 'failed') return 'destructive';
  return 'outline';
}

function compactTicketMix(row: EventPurchaseRow) {
  const entries = Object.entries(row.ticketCountByType);
  if (entries.length === 0) return `${row.totalTickets} tickets`;
  return entries.map(([type, count]) => `${type} ×${count}`).join(', ');
}

export function EventPurchasesTable({ purchases, currency }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter((row) => {
      const haystack = [
        row.buyerName,
        row.buyerEmail,
        row.order.id,
        row.order.status,
        compactTicketMix(row),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [purchases, query]);

  return (
    <ProfileSection
      title="Purchase history"
      description="Find orders by buyer name, email, or status."
      actions={
        purchases.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {filtered.length}/{purchases.length}
          </span>
        ) : null
      }
    >
      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">No purchases recorded for this event yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search purchases…"
              className="h-10 rounded-xl pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No purchases match.</p>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {filtered.map((row) => (
                  <div
                    key={row.order.id}
                    className="rounded-xl border border-border/70 bg-background/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.buyerName || row.buyerEmail}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.buyerEmail}
                        </p>
                      </div>
                      <Badge
                        variant={statusVariant(row.order.status)}
                        className="shrink-0 rounded-full capitalize"
                      >
                        {row.order.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="mt-0.5 font-semibold tabular-nums">
                          {formatMoney(row.order.total_price, row.order.currency || currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tickets</p>
                        <p className="mt-0.5 font-medium leading-snug">{compactTicketMix(row)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Purchased</p>
                        <p className="mt-0.5">
                          {formatDateTime(row.order.created_at)}
                          <span className="ml-1.5 font-mono text-[11px] text-muted-foreground/80">
                            #{row.order.id.slice(0, 8)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[840px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2.5 pr-3 font-medium">Purchased</th>
                      <th className="pb-2.5 pr-3 font-medium">Buyer</th>
                      <th className="pb-2.5 pr-3 font-medium">Tickets</th>
                      <th className="pb-2.5 pr-3 font-medium">Amount</th>
                      <th className="pb-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.order.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-3 align-top text-muted-foreground">
                          {formatDateTime(row.order.created_at)}
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                            #{row.order.id.slice(0, 8)}
                          </p>
                        </td>
                        <td className="py-3 pr-3 align-top">
                          <p className="font-medium">{row.buyerName || row.buyerEmail}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{row.buyerEmail}</p>
                        </td>
                        <td className="py-3 pr-3 align-top">{compactTicketMix(row)}</td>
                        <td className="py-3 pr-3 align-top font-medium tabular-nums">
                          {formatMoney(row.order.total_price, row.order.currency || currency)}
                        </td>
                        <td className="py-3 align-top">
                          <Badge
                            variant={statusVariant(row.order.status)}
                            className="rounded-full capitalize"
                          >
                            {row.order.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </ProfileSection>
  );
}
