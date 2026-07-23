import { ProfileSection } from '@/components/profile/profile-ui';
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
    .slice(0, 3)
    .map(([type, count]) => `${type} (${count})`)
    .join(', ');
}

export function EventBuyersTable({ buyers }: Props) {
  return (
    <ProfileSection
      title="Ticket purchasers"
      description="People who bought tickets for this event."
    >
      {buyers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No purchaser data yet for this event.</p>
      ) : (
        <div className="overflow-x-auto">
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
              {buyers.map((buyer) => (
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
      )}
    </ProfileSection>
  );
}
