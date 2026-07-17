import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '../helpers';
import type { EventTicketTypeSummary } from '../types';

type Props = {
  ticketTypes: EventTicketTypeSummary[];
  currency: string;
};

export function EventTicketTypesTable({ ticketTypes, currency }: Props) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Ticket types purchased</CardTitle>
      </CardHeader>
      <CardContent>
        {ticketTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets purchased for this event yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Ticket type</th>
                  <th className="pb-2 pr-3 font-medium">Purchased</th>
                  <th className="pb-2 pr-3 font-medium">Available</th>
                  <th className="pb-2 pr-3 font-medium">Unit price</th>
                  <th className="pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {ticketTypes.map((item) => (
                  <tr key={item.key} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{item.name}</td>
                    <td className="py-2 pr-3">{item.soldCount}</td>
                    <td className="py-2 pr-3">{item.availableCount === null ? '-' : item.availableCount}</td>
                    <td className="py-2 pr-3">
                      {item.unitPrice === null ? '-' : formatMoney(item.unitPrice, currency)}
                    </td>
                    <td className="py-2 font-medium">{formatMoney(item.grossRevenue, currency)}</td>
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
