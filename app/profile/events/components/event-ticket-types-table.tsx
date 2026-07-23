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
        <p className="text-sm text-muted-foreground">No ticket types for this event yet.</p>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {ticketTypes.map((item) => {
              const soldOut =
                item.availableCount !== null && item.availableCount <= 0 && item.soldCount > 0;
              return (
                <div
                  key={item.key}
                  className="rounded-xl border border-border/70 bg-background/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-medium leading-snug">{item.name}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(item.grossRevenue, currency)}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Sold</p>
                      <p className="mt-0.5 font-semibold tabular-nums">{item.soldCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Left</p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {item.availableCount === null ? '—' : item.availableCount}
                        {soldOut ? (
                          <span className="ml-1 font-medium text-amber-700">Sold out</span>
                        ) : null}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="mt-0.5 font-semibold tabular-nums">
                        {item.unitPrice === null ? '—' : formatMoney(item.unitPrice, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
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
        </>
      )}
    </ProfileSection>
  );
}
