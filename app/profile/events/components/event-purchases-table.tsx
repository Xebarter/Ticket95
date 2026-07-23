import { Badge } from '@/components/ui/badge';
import { ProfileSection } from '@/components/profile/profile-ui';
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
  return (
    <ProfileSection
      title="Purchase history"
      description="Completed and pending orders for this event."
    >
      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground">No purchases recorded for this event yet.</p>
      ) : (
        <div className="overflow-x-auto">
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
              {purchases.map((row) => (
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
                    <Badge variant={statusVariant(row.order.status)} className="rounded-full capitalize">
                      {row.order.status}
                    </Badge>
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
