'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Event, Sponsor, TicketType } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle,
  CheckCircle2,
  Ticket,
  Minus,
  Plus,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { getStoredAffiliateCode } from '@/components/affiliates/affiliate-ref-capture';
import { stashFreeCheckoutPayload } from '@/lib/checkout-handoff';
import { formatDisplayPrice, isFreePrice } from '@/lib/event-display';
import { cn } from '@/lib/utils';

const supabase = getSupabaseBrowserClient();

function formatPrice(price: number) {
  return Math.round(price).toLocaleString('en-US');
}

function formatTicketAmount(
  currencySymbol: string,
  price: number,
  formatPriceFn: (value: number) => string = formatPrice
) {
  if (isFreePrice(price)) return 'Free';
  return `${currencySymbol}${formatPriceFn(price)}`;
}

function getCurrencySymbol(currencyCode: string) {
  const currencies: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    CNY: '¥',
    INR: '₹',
    NGN: '₦',
    ZAR: 'R',
    KES: 'KSh',
    UGX: 'USh',
  };
  return currencies[currencyCode] || currencyCode;
}

/** Solid uniform fills per ticket type — one color each, no tonal mixes. */
const TICKET_TYPE_COLORS = [
  {
    key: 'graphite',
    surface: 'bg-slate-800',
    selected: 'ring-2 ring-slate-900/30 ring-offset-2',
    swatch: 'bg-slate-800',
  },
  {
    key: 'brass',
    surface: 'bg-[#9A7B2F]',
    selected: 'ring-2 ring-[#9A7B2F]/40 ring-offset-2',
    swatch: 'bg-[#9A7B2F]',
  },
  {
    key: 'teal',
    surface: 'bg-teal-800',
    selected: 'ring-2 ring-teal-900/35 ring-offset-2',
    swatch: 'bg-teal-800',
  },
  {
    key: 'navy',
    surface: 'bg-[#1e3a5f]',
    selected: 'ring-2 ring-[#1e3a5f]/40 ring-offset-2',
    swatch: 'bg-[#1e3a5f]',
  },
  {
    key: 'wine',
    surface: 'bg-[#7a2e3a]',
    selected: 'ring-2 ring-[#7a2e3a]/40 ring-offset-2',
    swatch: 'bg-[#7a2e3a]',
  },
  {
    key: 'olive',
    surface: 'bg-[#4a5d3a]',
    selected: 'ring-2 ring-[#4a5d3a]/40 ring-offset-2',
    swatch: 'bg-[#4a5d3a]',
  },
] as const;

function getTicketTypeColor(index: number) {
  return TICKET_TYPE_COLORS[index % TICKET_TYPE_COLORS.length];
}

export interface UseTicketPurchaseOptions {
  event: Event;
  ticketTypes?: TicketType[];
  sponsors?: Pick<Sponsor, 'id' | 'name' | 'logo_url'>[];
  onPurchaseComplete?: () => void;
  /** When false, skip loading ticket types (e.g. closed dialog). */
  enabled?: boolean;
}

export function useTicketPurchase({
  event,
  ticketTypes,
  sponsors,
  onPurchaseComplete,
  enabled = true,
}: UseTicketPurchaseOptions) {
  const router = useRouter();
  const { user } = useAuth();
  const [ticketTypesState, setTicketTypesState] = useState<TicketType[]>(ticketTypes || []);
  const [sponsorsState, setSponsorsState] = useState<
    Array<{ id: string; name: string; logo_url?: string }>
  >(sponsors || []);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [hasFetchedSponsors, setHasFetchedSponsors] = useState(Boolean(sponsors?.length));
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  const currency = event.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  const resetTransientState = useCallback(() => {
    setSelectedQuantities({});
    setError('');
    setSuccess(false);
    setSuccessMessage('');
    setLoading(false);
    setGuestEmail('');
    setGuestName('');
  }, []);

  const fetchTicketTypes = useCallback(async () => {
    if ((ticketTypes && ticketTypes.length > 0) || ticketTypesState.length > 0) return;
    setTicketsLoading(true);
    setTicketsError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', event.id)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setTicketTypesState(data || []);
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : 'Failed to load ticket types');
    } finally {
      setTicketsLoading(false);
    }
  }, [event.id, ticketTypes, ticketTypesState.length]);

  const fetchSponsors = useCallback(async () => {
    if (sponsors && sponsors.length > 0) {
      setSponsorsState(sponsors);
      return;
    }
    if (sponsorsState.length > 0 || hasFetchedSponsors) return;
    setHasFetchedSponsors(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('sponsors')
        .select('id, name, logo_url')
        .eq('event_id', event.id)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setSponsorsState(data || []);
    } catch (err) {
      console.error('Failed to fetch sponsors:', err);
    }
  }, [event.id, hasFetchedSponsors, sponsors, sponsorsState.length]);

  useEffect(() => {
    if (!enabled) return;
    void fetchTicketTypes();
    void fetchSponsors();
  }, [enabled, fetchTicketTypes, fetchSponsors]);

  useEffect(() => {
    if (ticketTypes?.length) {
      setTicketTypesState(ticketTypes);
    }
  }, [ticketTypes]);

  const totalQuantity = Object.values(selectedQuantities).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = ticketTypesState.reduce((sum, tt) => {
    const qty = selectedQuantities[tt.id] || 0;
    return sum + qty * tt.price;
  }, 0);
  const selectedLineItems = ticketTypesState
    .map((ticketType) => ({
      ticketType,
      qty: selectedQuantities[ticketType.id] || 0,
    }))
    .filter(({ qty }) => qty > 0);
  const totalAvailableTickets = ticketTypesState.reduce(
    (sum, tt) => sum + tt.available_quantity,
    0
  );

  const updateQuantity = (ticketTypeId: string, newQuantity: number) => {
    const ticketType = ticketTypesState.find((tt) => tt.id === ticketTypeId);
    if (!ticketType) return;

    const clampedQuantity = Math.max(0, Math.min(newQuantity, ticketType.available_quantity));
    setSelectedQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: clampedQuantity,
    }));
    setError('');
  };

  const clearSelections = () => {
    setSelectedQuantities({});
    setError('');
    setSuccessMessage('');
  };

  const handlePurchase = async () => {
    setError('');
    setSuccess(false);
    setSuccessMessage('');
    setLoading(true);

    if (totalQuantity < 1) {
      setError('Please select at least 1 ticket');
      setLoading(false);
      return;
    }

    if (!user) {
      const email = guestEmail.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailPattern.test(email)) {
        setError('Please enter a valid email address for guest checkout.');
        setLoading(false);
        return;
      }
    }

    for (const ticketType of ticketTypesState) {
      const selectedQty = selectedQuantities[ticketType.id] || 0;
      if (selectedQty > ticketType.available_quantity) {
        setError(`Only ${ticketType.available_quantity} ${ticketType.name} tickets available`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/payments/paytota/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          selectedQuantities,
          customerEmail: user?.email || guestEmail.trim(),
          customerName: guestName.trim() || undefined,
          affiliateCode: event.affiliates_enabled ? getStoredAffiliateCode() || undefined : undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Failed to initialize payment');
        return;
      }

      if (!payload.redirectUrl) {
        if (payload.freeCheckout) {
          setSuccess(true);
          setSuccessMessage('Free tickets confirmed. Preparing your download...');
          onPurchaseComplete?.();
          return;
        }
        setError('No payment redirect URL was returned.');
        return;
      }

      onPurchaseComplete?.();
      setSuccess(true);

      if (payload.freeCheckout) {
        setSuccessMessage('Free tickets confirmed! Starting download...');
        if (payload.orderId && Array.isArray(payload.tickets)) {
          stashFreeCheckoutPayload({
            orderId: payload.orderId,
            tickets: payload.tickets,
            event: payload.event || null,
            order: payload.order,
          });
        }
        router.push(payload.redirectUrl);
        return;
      }

      setSuccessMessage('Redirecting you to secure checkout...');
      window.location.href = payload.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  const guestEmailValid =
    !user && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const canCheckout =
    totalQuantity >= 1 && !loading && !success && (user || guestEmailValid);

  const isSoldOut =
    ticketTypesState.length === 0 ||
    ticketTypesState.every((tt) => tt.available_quantity === 0) ||
    event.status !== 'approved';

  return {
    user,
    currency,
    currencySymbol,
    ticketTypesState,
    sponsorsState,
    selectedQuantities,
    loading,
    error,
    success,
    successMessage,
    ticketsLoading,
    ticketsError,
    guestEmail,
    setGuestEmail,
    guestName,
    setGuestName,
    totalQuantity,
    totalPrice,
    selectedLineItems,
    totalAvailableTickets,
    updateQuantity,
    clearSelections,
    handlePurchase,
    canCheckout,
    isSoldOut,
    resetTransientState,
    formatPrice,
  };
}

interface TicketPurchaseFormProps {
  event: Event;
  ticketTypes?: TicketType[];
  sponsors?: Sponsor[];
  onPurchaseComplete?: () => void;
  id?: string;
}

/** Desktop sticky sidebar — pair with TicketPurchaseMobileSection sharing the same purchase state. */
export function TicketPurchaseDesktopAside({
  purchase,
  id = 'purchase-tickets',
}: {
  purchase: ReturnType<typeof useTicketPurchase>;
  event?: Event;
  id?: string;
}) {
  const guestEmailId = useId();
  const guestNameId = useId();

  if (purchase.isSoldOut) {
    return (
      <aside className="sticky top-20">
        <div
          id={id}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
        >
          <p className="text-sm font-semibold text-slate-900">Sold out</p>
          <p className="mt-1 text-sm text-slate-500">No tickets are currently available.</p>
        </div>
      </aside>
    );
  }

  const startingPrice = purchase.ticketTypesState.reduce(
    (min, tt) => (tt.available_quantity > 0 ? Math.min(min, tt.price) : min),
    Number.POSITIVE_INFINITY
  );
  const displayFromPrice = Number.isFinite(startingPrice) ? startingPrice : 0;

  return (
    <aside className="sticky top-20">
      <div
        id={id}
        className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
      >
        <div className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/80 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Get tickets
              </p>
              <p className="mt-1 text-sm text-slate-600">Select quantities and pay securely.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">From</p>
              <p className="text-lg font-bold tracking-tight text-slate-900">
                {formatTicketAmount(purchase.currencySymbol, displayFromPrice, purchase.formatPrice)}
              </p>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TicketPurchaseFormBody
            purchase={purchase}
            showSponsors={false}
            guestEmailId={guestEmailId}
            guestNameId={guestNameId}
            compactTickets
          />
        </div>
        <TicketPurchaseCheckoutBar purchase={purchase} showCancel={false} />
      </div>
    </aside>
  );
}

/** Mobile in-page purchase section */
export function TicketPurchaseMobileSection({
  purchase,
  event,
  id = 'purchase-tickets-mobile',
}: {
  purchase: ReturnType<typeof useTicketPurchase>;
  event: Event;
  id?: string;
}) {
  const guestEmailId = useId();
  const guestNameId = useId();
  const { isSoldOut, success, totalQuantity, totalPrice, canCheckout, handlePurchase, loading } =
    purchase;

  if (isSoldOut) return null;

  return (
    <>
      <section id={id} className="scroll-mt-24 lg:hidden">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/80 px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Get tickets</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Select your tickets and checkout securely.
            </p>
          </div>
          <TicketPurchaseFormBody
            purchase={purchase}
            showSponsors={false}
            guestEmailId={guestEmailId}
            guestNameId={guestNameId}
          />
          <TicketPurchaseCheckoutBar purchase={purchase} showCancel={false} />
        </div>
      </section>

      {!success && totalQuantity > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total · {totalQuantity} ticket{totalQuantity === 1 ? '' : 's'}
              </p>
              <p className="text-lg font-bold text-slate-900">
                {formatDisplayPrice(event.currency, totalPrice)}
              </p>
            </div>
            <Button
              className="h-11 shrink-0 rounded-lg bg-slate-900 px-6 font-semibold hover:bg-slate-800 disabled:bg-slate-300"
              onClick={handlePurchase}
              disabled={!canCheckout}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFreePrice(totalPrice) ? (
                'Get free'
              ) : (
                'Pay'
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Inline purchase UI for the event details page — one shared cart across desktop sidebar and mobile. */
export function TicketPurchasePanel({
  event,
  ticketTypes,
  sponsors,
  onPurchaseComplete,
  id = 'purchase-tickets',
}: TicketPurchaseFormProps) {
  const purchase = useTicketPurchase({ event, ticketTypes, sponsors, onPurchaseComplete });

  return (
    <>
      <TicketPurchaseDesktopAside purchase={purchase} event={event} id={id} />
      <TicketPurchaseMobileSection purchase={purchase} event={event} id={`${id}-mobile`} />
    </>
  );
}

/** @deprecated Use TicketPurchasePanel on event details page */
export function TicketPurchaseForm({
  event,
  ticketTypes,
  sponsors,
  onPurchaseComplete,
  id = 'purchase-tickets',
  className,
  variant = 'section',
  showMobileStickyBar = true,
}: TicketPurchaseFormProps & {
  className?: string;
  variant?: 'sidebar' | 'section';
  showMobileStickyBar?: boolean;
}) {
  return (
    <TicketPurchasePanel
      event={event}
      ticketTypes={ticketTypes}
      sponsors={sponsors}
      onPurchaseComplete={onPurchaseComplete}
      id={id}
    />
  );
}

/** Shared body for dialog — reuses the same hook via props spread */
export function TicketPurchaseFormBody({
  purchase,
  showSponsors = true,
  guestEmailId = 'guest-email',
  guestNameId = 'guest-name',
  compactTickets = false,
}: {
  purchase: ReturnType<typeof useTicketPurchase>;
  showSponsors?: boolean;
  guestEmailId?: string;
  guestNameId?: string;
  compactTickets?: boolean;
}) {
  const {
    user,
    currencySymbol,
    ticketTypesState,
    sponsorsState,
    loading,
    error,
    success,
    successMessage,
    ticketsLoading,
    ticketsError,
    guestEmail,
    setGuestEmail,
    guestName,
    setGuestName,
    totalQuantity,
    totalPrice,
    selectedLineItems,
    totalAvailableTickets,
    updateQuantity,
    clearSelections,
    formatPrice,
  } = purchase;

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Secure checkout
        </span>
        <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
          {totalAvailableTickets} ticket{totalAvailableTickets === 1 ? '' : 's'} available
        </span>
      </div>

      {showSponsors && sponsorsState.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Sponsors
          </p>
          <div className="flex flex-wrap gap-2">
            {sponsorsState.map((sponsor) => (
              <div
                key={sponsor.id}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
              >
                <span className="text-xs font-medium text-slate-700">{sponsor.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage || 'Purchase successful!'}</span>
        </div>
      ) : null}

      {!success ? (
        <>
          <TicketTypeList
            ticketTypes={ticketTypesState}
            ticketsLoading={ticketsLoading}
            ticketsError={ticketsError}
            selectedQuantities={purchase.selectedQuantities}
            loading={loading}
            currencySymbol={currencySymbol}
            formatPrice={formatPrice}
            totalQuantity={totalQuantity}
            onClear={clearSelections}
            onUpdateQuantity={updateQuantity}
            compact={compactTickets}
          />

          {totalQuantity > 0 ? (
            <OrderSummary
              selectedLineItems={selectedLineItems}
              ticketTypes={ticketTypesState}
              totalQuantity={totalQuantity}
              totalPrice={totalPrice}
              currencySymbol={currencySymbol}
              formatPrice={formatPrice}
            />
          ) : null}

          {!user ? (
            <GuestCheckoutFields
              guestEmailId={guestEmailId}
              guestNameId={guestNameId}
              guestEmail={guestEmail}
              setGuestEmail={setGuestEmail}
              guestName={guestName}
              setGuestName={setGuestName}
              loading={loading}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function TicketTypeList({
  ticketTypes,
  ticketsLoading,
  ticketsError,
  selectedQuantities,
  loading,
  currencySymbol,
  formatPrice,
  totalQuantity,
  onClear,
  onUpdateQuantity,
  compact = false,
}: {
  ticketTypes: TicketType[];
  ticketsLoading: boolean;
  ticketsError: string;
  selectedQuantities: Record<string, number>;
  loading: boolean;
  currencySymbol: string;
  formatPrice: (price: number) => string;
  totalQuantity: number;
  onClear: () => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Ticket className="h-4 w-4 text-slate-400" />
          Select tickets
        </h3>
        {totalQuantity > 0 ? (
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="space-y-2.5">
        {ticketsLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tickets…
          </div>
        ) : ticketsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ticketsError}
          </div>
        ) : ticketTypes.length > 0 ? (
          ticketTypes.map((ticketType, index) => {
            const selectedQty = selectedQuantities[ticketType.id] || 0;
            const isSelected = selectedQty > 0;
            const soldOut = ticketType.available_quantity === 0;
            const color = getTicketTypeColor(index);

            return (
              <div
                key={ticketType.id}
                className={cn(
                  'rounded-xl text-white transition-[box-shadow,transform] duration-200',
                  color.surface,
                  isSelected && color.selected,
                  soldOut && 'opacity-60',
                  compact ? 'p-3' : 'p-4'
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                      <h4
                        className={cn(
                          'min-w-0 break-words font-semibold leading-snug text-white',
                          compact ? 'text-sm' : 'text-base'
                        )}
                      >
                        {ticketType.name}
                      </h4>
                      {soldOut ? (
                        <span className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                          Sold out
                        </span>
                      ) : null}
                    </div>
                    {ticketType.description && !compact ? (
                      <p className="mt-1 line-clamp-2 break-words text-sm text-white/75">
                        {ticketType.description}
                      </p>
                    ) : null}
                    {!soldOut ? (
                      <p className="mt-1.5 text-xs text-white/65">
                        <span className="font-medium text-white/90">
                          {ticketType.available_quantity}
                        </span>{' '}
                        left
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      'flex shrink-0 items-center justify-between gap-3',
                      !soldOut && 'border-t border-white/20 pt-3'
                    )}
                  >
                    <p
                      className={cn(
                        'shrink-0 whitespace-nowrap font-bold tracking-tight text-white',
                        compact ? 'text-base' : 'text-lg'
                      )}
                    >
                      {formatTicketAmount(currencySymbol, ticketType.price, formatPrice)}
                    </p>

                    {!soldOut ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 border-white/30 bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
                          onClick={() => onUpdateQuantity(ticketType.id, selectedQty - 1)}
                          disabled={loading || selectedQty <= 0}
                          aria-label={`Decrease ${ticketType.name} quantity`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <div
                          className="w-10 rounded-md border border-white/30 bg-white/15 py-1 text-center text-sm font-semibold text-white"
                          aria-live="polite"
                        >
                          {selectedQty}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 border-white/30 bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
                          onClick={() => onUpdateQuantity(ticketType.id, selectedQty + 1)}
                          disabled={loading || selectedQty >= ticketType.available_quantity}
                          aria-label={`Increase ${ticketType.name} quantity`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No ticket types available for this event.
          </div>
        )}
      </div>
    </div>
  );
}

function OrderSummary({
  selectedLineItems,
  ticketTypes,
  totalQuantity,
  totalPrice,
  currencySymbol,
  formatPrice,
}: {
  selectedLineItems: Array<{ ticketType: TicketType; qty: number }>;
  ticketTypes: TicketType[];
  totalQuantity: number;
  totalPrice: number;
  currencySymbol: string;
  formatPrice: (price: number) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <h4 className="text-sm font-semibold text-slate-900">Order summary</h4>
      <div className="mt-3 space-y-2">
        {selectedLineItems.map(({ ticketType, qty }) => {
          const colorIndex = ticketTypes.findIndex((tt) => tt.id === ticketType.id);
          const color = getTicketTypeColor(colorIndex >= 0 ? colorIndex : 0);

          return (
            <div
              key={ticketType.id}
              className="flex items-start justify-between gap-3 text-sm text-slate-600"
            >
              <span className="inline-flex min-w-0 items-start gap-2 break-words leading-snug">
                <span
                  aria-hidden
                  className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-sm', color.swatch)}
                />
                {ticketType.name} × {qty}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-slate-900">
                {formatTicketAmount(currencySymbol, ticketType.price * qty, formatPrice)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">
        <span className="text-sm font-semibold text-slate-900">
          Total ({totalQuantity} ticket{totalQuantity === 1 ? '' : 's'})
        </span>
        <span className="text-base font-bold text-slate-900">
          {formatTicketAmount(currencySymbol, totalPrice, formatPrice)}
        </span>
      </div>
    </div>
  );
}

function GuestCheckoutFields({
  guestEmailId,
  guestNameId,
  guestEmail,
  setGuestEmail,
  guestName,
  setGuestName,
  loading,
}: {
  guestEmailId: string;
  guestNameId: string;
  guestEmail: string;
  setGuestEmail: (value: string) => void;
  guestName: string;
  setGuestName: (value: string) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Guest checkout</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Use the same email when you create an account later to sync these tickets to your profile.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor={guestEmailId}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
          >
            Email *
          </label>
          <Input
            id={guestEmailId}
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            className="h-10 border-slate-200 bg-white"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={guestNameId}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
          >
            Full name (optional)
          </label>
          <Input
            id={guestNameId}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Jane Doe"
            disabled={loading}
            className="h-10 border-slate-200 bg-white"
            autoComplete="name"
          />
        </div>
      </div>
    </div>
  );
}

export function TicketPurchaseCheckoutBar({
  purchase,
  onCancel,
  showCancel = true,
}: {
  purchase: ReturnType<typeof useTicketPurchase>;
  onCancel?: () => void;
  showCancel?: boolean;
}) {
  const { totalQuantity, totalPrice, loading, success, canCheckout, handlePurchase, formatPrice, currencySymbol } =
    purchase;

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Total</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            {formatTicketAmount(currencySymbol, totalPrice, formatPrice)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Tickets</p>
          <p className="mt-0.5 text-lg font-semibold text-slate-900">{totalQuantity}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {showCancel && onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          className={cn(
            'h-11 bg-slate-900 font-semibold text-white shadow-none hover:bg-slate-800 disabled:bg-slate-300',
            showCancel && onCancel ? 'flex-[1.4]' : 'w-full'
          )}
          onClick={handlePurchase}
          disabled={!canCheckout}
          aria-label="Proceed to secure payment"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isFreePrice(totalPrice) ? 'Confirming…' : 'Redirecting…'}
            </span>
          ) : success ? (
            isFreePrice(totalPrice) ? 'Confirmed' : 'Redirecting…'
          ) : isFreePrice(totalPrice) ? (
            'Get free tickets'
          ) : (
            'Pay securely'
          )}
        </Button>
      </div>
      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-slate-400">
        {isFreePrice(totalPrice)
          ? 'No payment required. Your tickets will download after confirmation.'
          : 'By continuing, you agree to complete payment on our secure platform.'}
      </p>
    </div>
  );
}
