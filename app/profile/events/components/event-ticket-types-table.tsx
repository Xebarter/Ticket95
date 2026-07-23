import { ProfileSection } from '@/components/profile/profile-ui';
import { formatMoney } from '../helpers';
import type { EventTicketTypeSummary } from '../types';

type Props = {
  ticketTypes: EventTicketTypeSummary[];
  currency: string;
};

export function EventTicketTypesTable({ ticketTypes, currency }: Props) {
  return (
    <ProfileSection
      title="Ticket types"
      description="Inventory and revenue by ticket type."
    >
      {ticketTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ticket types sold for this event yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-2.5 pr-3 font-medium">Ticket type</th>
                <th className="pb-2.5 pr-3 font-medium">Sold</th>
                <th className="pb-2.5 pr-3 font-medium">Available</th>
                <th className="pb-2.5 pr-3 font-medium">Unit price</th>
                <th className="pb-2.5 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((item) => (
                <tr key={item.key} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-3 font-medium">{item.name}</td>
                  <td className="py-3 pr-3 tabular-nums">{item.soldCount}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {item.availableCount === null ? '—' : item.availableCount}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">
                    {item.unitPrice === null ? '—' : formatMoney(item.unitPrice, currency)}
                  </td>
                  <td className="py-3 font-semibold tabular-nums">
                    {formatMoney(item.grossRevenue, currency)}
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
