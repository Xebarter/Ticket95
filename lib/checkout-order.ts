import { getAffiliateByReferralCode, getAffiliateSettings } from '@/lib/affiliates';
import { completePaidOrder } from '@/lib/complete-paid-order';
import { getPaymentOrderTicketsPayload } from '@/lib/payment-order-tickets';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type CheckoutPaymentProvider = 'paytota' | 'dpo' | 'free';

export type TicketSelection = {
  ticketTypeId: string;
  ticketTypeName: string;
  ticketPrice: number;
  quantity: number;
};

export type CheckoutOrderInput = {
  eventId: string;
  selectedQuantities: Record<string, number>;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  affiliateCode?: string;
  /** Paid provider when total > 0. Free path always uses `free`. */
  paidProvider: 'paytota' | 'dpo';
};

export type CheckoutOrderResult =
  | {
      kind: 'free';
      orderId: string;
      checkoutEmail: string;
      isGuest: boolean;
      tickets: unknown[];
      event: unknown;
      order: unknown;
      redirectUrl: string;
    }
  | {
      kind: 'paid';
      order: Record<string, unknown> & {
        id: string;
        event_id: string;
        user_id: string | null;
        total_price: number;
        currency: string | null;
        payment_metadata: Record<string, unknown> | null;
      };
      event: Record<string, unknown> & {
        id: string;
        name: string;
        currency?: string | null;
        status: string;
        affiliates_enabled?: boolean | null;
      };
      normalizedSelections: TicketSelection[];
      totalPrice: number;
      checkoutEmail: string;
      customerName: string;
      customerPhone: string;
      isGuest: boolean;
    };

export class CheckoutOrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CheckoutOrderError';
    this.status = status;
  }
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function getEventByIdAdmin(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

async function getTicketTypesByEventAdmin(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createOrderAdmin(orderData: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderAdmin(orderId: string, orderData: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(orderData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Validate checkout payload, create a pending order, and complete free checkouts.
 * Paid providers continue with their own gateway initialization.
 */
export async function prepareCheckoutOrder(input: CheckoutOrderInput): Promise<CheckoutOrderResult> {
  const session = await getSession();
  const {
    eventId,
    selectedQuantities,
    paidProvider,
  } = input;

  const rawCustomerEmail = typeof input.customerEmail === 'string' ? input.customerEmail.trim() : '';
  const rawCustomerName = typeof input.customerName === 'string' ? input.customerName.trim() : '';
  const rawCustomerPhone = typeof input.customerPhone === 'string' ? input.customerPhone.trim() : '';
  const rawAffiliateCode =
    typeof input.affiliateCode === 'string' ? input.affiliateCode.trim().toUpperCase() : '';

  if (!eventId || !selectedQuantities || typeof selectedQuantities !== 'object') {
    throw new CheckoutOrderError('Invalid checkout payload');
  }

  const checkoutEmail = session?.email || rawCustomerEmail;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!checkoutEmail || !emailPattern.test(checkoutEmail)) {
    throw new CheckoutOrderError('A valid email address is required to continue checkout.');
  }

  const [event, ticketTypes] = await Promise.all([
    getEventByIdAdmin(eventId),
    getTicketTypesByEventAdmin(eventId),
  ]);

  if (!event || event.status !== 'approved') {
    throw new CheckoutOrderError('Event not available for purchase');
  }

  if (!ticketTypes.length) {
    throw new CheckoutOrderError('No ticket types available for this event');
  }

  const normalizedSelections = ticketTypes
    .map((ticketType) => ({
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      ticketPrice: ticketType.price,
      quantity: Number(selectedQuantities[ticketType.id] || 0),
    }))
    .filter((selection) => selection.quantity > 0);

  if (!normalizedSelections.length) {
    throw new CheckoutOrderError('Please select at least one ticket');
  }

  for (const selection of normalizedSelections) {
    const ticketType = ticketTypes.find((ticket) => ticket.id === selection.ticketTypeId);
    if (!ticketType || selection.quantity > ticketType.available_quantity) {
      throw new CheckoutOrderError(`Not enough availability for ${selection.ticketTypeName}`);
    }
  }

  const totalQuantity = normalizedSelections.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = normalizedSelections.reduce(
    (sum, item) => sum + item.quantity * item.ticketPrice,
    0
  );

  let affiliateId: string | null = null;
  let affiliateReferralCode: string | null = null;
  if (rawAffiliateCode && event.affiliates_enabled) {
    const settings = await getAffiliateSettings();
    if (settings.programEnabled) {
      const affiliate = await getAffiliateByReferralCode(rawAffiliateCode);
      if (affiliate && affiliate.user_id !== session?.userId) {
        affiliateId = affiliate.id;
        affiliateReferralCode = affiliate.referral_code;
      }
    }
  }

  const paymentProvider: CheckoutPaymentProvider =
    totalPrice <= 0 ? 'free' : paidProvider;

  const order = await createOrderAdmin({
    event_id: eventId,
    user_id: session?.userId || null,
    quantity: totalQuantity,
    total_price: totalPrice,
    currency: event.currency || 'USD',
    status: 'pending',
    payment_provider: paymentProvider,
    affiliate_id: affiliateId,
    affiliate_referral_code: affiliateReferralCode,
    payment_metadata: {
      ticketSelections: normalizedSelections,
      customer: {
        email: checkoutEmail,
        name: rawCustomerName || null,
        phone: rawCustomerPhone || null,
        userId: session?.userId || null,
      },
      ...(affiliateReferralCode
        ? { affiliateCode: affiliateReferralCode, affiliateId }
        : {}),
    },
  });

  const isGuest = !session?.userId;

  if (totalPrice <= 0) {
    await completePaidOrder({
      id: order.id,
      status: order.status,
      event_id: order.event_id,
      user_id: order.user_id,
      total_price: order.total_price,
      currency: order.currency,
      affiliate_id: order.affiliate_id,
      affiliate_referral_code: order.affiliate_referral_code,
      payment_metadata: order.payment_metadata,
    });

    const freeMetadata = {
      ...(order.payment_metadata || {}),
      checkoutMode: 'free',
      completedAt: new Date().toISOString(),
    };

    const [, ticketsPayload] = await Promise.all([
      updateOrderAdmin(order.id, { payment_metadata: freeMetadata }),
      getPaymentOrderTicketsPayload({
        orderId: order.id,
        userId: order.user_id,
        paymentProvider: 'free',
        paymentMetadata: freeMetadata,
        eventId: order.event_id,
      }),
    ]);

    return {
      kind: 'free',
      orderId: order.id,
      checkoutEmail,
      isGuest,
      tickets: ticketsPayload.tickets,
      event: ticketsPayload.event,
      order: ticketsPayload.order,
      redirectUrl: `/payment-complete?freeCheckout=1&guestCheckout=${isGuest ? '1' : '0'}&orderId=${encodeURIComponent(order.id)}&customerEmail=${encodeURIComponent(checkoutEmail)}`,
    };
  }

  return {
    kind: 'paid' as const,
    order,
    event,
    normalizedSelections,
    totalPrice,
    checkoutEmail,
    customerName: rawCustomerName,
    customerPhone: rawCustomerPhone,
    isGuest,
  };
}

export function buildPaymentCompleteRedirectBase(options: {
  orderId: string;
  isGuest: boolean;
  customerEmail: string;
  provider: 'paytota' | 'dpo';
}) {
  const appUrl = getAppUrl();
  const params = new URLSearchParams({
    orderId: options.orderId,
    guestCheckout: options.isGuest ? '1' : '0',
    customerEmail: options.customerEmail,
    provider: options.provider,
  });
  return `${appUrl}/payment-complete?${params.toString()}`;
}
