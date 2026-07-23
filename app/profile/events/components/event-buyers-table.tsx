'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ProfileSection } from '@/components/profile/profile-ui';
import { Search } from 'lucide-react';
import { formatDateTime } from '../helpers';
import type { EventBuyerSummary } from '../types';

type Props = {
  buyers: EventBuyerSummary[];
};

function renderByType(purchasedByType: Record<string, number>) {
  const entries = Object.entries(purchasedByType);
  if (entries.length === 0) return '—';
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type} (${count})`)
    .join(', ');
}

export function EventBuyersTable({ buyers }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter((buyer) => {
      const haystack = [buyer.name, buyer.email, renderByType(buyer.purchasedByType)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [buyers, query]);

  return (
    <ProfileSection
      title="Ticket purchasers"
      description="Search buyers by name or email."
      actions={
        buyers.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {filtered.length}/{buyers.length}
          </span>
        ) : null
      }
    >
      {buyers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No purchaser data yet for this event.</p>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search buyers…"
              className="h-10 rounded-xl pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No buyers match.</p>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {filtered.map((buyer) => (
                  <div
                    key={buyer.key}
                    className="rounded-xl border border-border/70 bg-background/70 p-3"
                  >
                    <p className="truncate text-sm font-medium">{buyer.name || buyer.email}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{buyer.email}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Orders</p>
                        <p className="mt-0.5 font-semibold tabular-nums">{buyer.completedOrders}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tickets</p>
                        <p className="mt-0.5 font-semibold tabular-nums">{buyer.totalTickets}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Latest</p>
                        <p className="mt-0.5 leading-snug">{formatDateTime(buyer.latestPurchaseAt)}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-muted-foreground">Ticket mix</p>
                        <p className="mt-0.5 leading-snug">{renderByType(buyer.purchasedByType)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2.5 pr-3 font-medium">Buyer</th>
                      <th className="pb-2.5 pr-3 font-medium">Orders</th>
                      <th className="pb-2.5 pr-3 font-medium">Tickets</th>
                      <th className="pb-2.5 pr-3 font-medium">Ticket mix</th>
                      <th className="pb-2.5 font-medium">Latest purchase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((buyer) => (
                      <tr key={buyer.key} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-3 align-top">
                          <p className="font-medium">{buyer.name || buyer.email}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{buyer.email}</p>
                        </td>
                        <td className="py-3 pr-3 align-top tabular-nums">{buyer.completedOrders}</td>
                        <td className="py-3 pr-3 align-top tabular-nums">{buyer.totalTickets}</td>
                        <td className="py-3 pr-3 align-top text-muted-foreground">
                          {renderByType(buyer.purchasedByType)}
                        </td>
                        <td className="py-3 align-top text-muted-foreground">
                          {formatDateTime(buyer.latestPurchaseAt)}
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
