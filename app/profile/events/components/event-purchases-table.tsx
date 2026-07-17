import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  return entries.map(([type, count]) => `${type} x${count}`).join(', ');
}

export function EventPurchasesTable({ purchases, currency }: Props) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Purchase history</CardTitle>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases recorded for this event.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Purchased at</th>
                  <th className="pb-2 pr-3 font-medium">Buyer</th>
                  <th className="pb-2 pr-3 font-medium">Email</th>
                  <th className="pb-2 pr-3 font-medium">Order ID</th>
                  <th className="pb-2 pr-3 font-medium">Tickets</th>
                  <th className="pb-2 pr-3 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((row) => (
                  <tr key={row.order.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{formatDateTime(row.order.created_at)}</td>
                    <td className="py-2 pr-3 font-medium">{row.buyerName || row.buyerEmail}</td>
                    <td className="py-2 pr-3">{row.buyerEmail}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.order.id.slice(0, 8)}...</td>
                    <td className="py-2 pr-3">{compactTicketMix(row)}</td>
                    <td className="py-2 pr-3">{formatMoney(row.order.total_price, row.order.currency || currency)}</td>
                    <td className="py-2">
                      <Badge variant={statusVariant(row.order.status)}>{row.order.status}</Badge>
                    </td>
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
