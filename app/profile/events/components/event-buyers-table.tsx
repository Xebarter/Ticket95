import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '../helpers';
import type { EventBuyerSummary } from '../types';

type Props = {
  buyers: EventBuyerSummary[];
};

function renderByType(purchasedByType: Record<string, number>) {
  const entries = Object.entries(purchasedByType);
  if (entries.length === 0) return '-';
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${type} (${count})`)
    .join(', ');
}

export function EventBuyersTable({ buyers }: Props) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Ticket purchasers</CardTitle>
      </CardHeader>
      <CardContent>
        {buyers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchaser data yet for this event.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Buyer</th>
                  <th className="pb-2 pr-3 font-medium">Email</th>
                  <th className="pb-2 pr-3 font-medium">Orders</th>
                  <th className="pb-2 pr-3 font-medium">Tickets</th>
                  <th className="pb-2 pr-3 font-medium">Ticket mix</th>
                  <th className="pb-2 font-medium">Latest purchase</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((buyer) => (
                  <tr key={buyer.key} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{buyer.name || buyer.email}</td>
                    <td className="py-2 pr-3">{buyer.email}</td>
                    <td className="py-2 pr-3">{buyer.completedOrders}</td>
                    <td className="py-2 pr-3">{buyer.totalTickets}</td>
                    <td className="py-2 pr-3">{renderByType(buyer.purchasedByType)}</td>
                    <td className="py-2">{formatDateTime(buyer.latestPurchaseAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
