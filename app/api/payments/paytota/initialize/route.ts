import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createPaytotaPurchase } from '@/lib/paytota';
import { completePaidOrder } from '@/lib/complete-paid-order';
import { getPaymentOrderTicketsPayload } from '@/lib/payment-order-tickets';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAffiliateByReferralCode, getAffiliateSettings } from '@/lib/affiliates';

function getAppUrl() {
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

async function createOrderAdmin(orderData: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert([orderData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateOrderAdmin(orderId: string, orderData: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(orderData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();

    const eventId = body?.eventId as string;
    const selectedQuantities = (body?.selectedQuantities || {}) as Record<string, number>;
    const rawCustomerEmail = typeof body?.customerEmail === 'string' ? body.customerEmail.trim() : '';
    const rawCustomerName = typeof body?.customerName === 'string' ? body.customerName.trim() : '';
    const rawCustomerPhone = typeof body?.customerPhone === 'string' ? body.customerPhone.trim() : '';
    const rawAffiliateCode =
      typeof body?.affiliateCode === 'string' ? body.affiliateCode.trim().toUpperCase() : '';

    if (!eventId || !selectedQuantities || typeof selectedQuantities !== 'object') {
      return NextResponse.json({ error: 'Invalid checkout payload' }, { status: 400 });
    }

    const checkoutEmail = session?.email || rawCustomerEmail;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!checkoutEmail || !emailPattern.test(checkoutEmail)) {
      return NextResponse.json(
        { error: 'A valid email address is required to continue checkout.' },
        { status: 400 }
      );
    }

    const [event, ticketTypes] = await Promise.all([
      getEventByIdAdmin(eventId),
      getTicketTypesByEventAdmin(eventId),
    ]);
    if (!event || event.status !== 'approved') {
      return NextResponse.json({ error: 'Event not available for purchase' }, { status: 400 });
    }

    if (!ticketTypes.length) {
      return NextResponse.json({ error: 'No ticket types available for this event' }, { status: 400 });
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
      return NextResponse.json({ error: 'Please select at least one ticket' }, { status: 400 });
    }

    for (const selection of normalizedSelections) {
      const ticketType = ticketTypes.find((ticket) => ticket.id === selection.ticketTypeId);
      if (!ticketType || selection.quantity > ticketType.available_quantity) {
        return NextResponse.json(
          { error: `Not enough availability for ${selection.ticketTypeName}` },
          { status: 400 }
        );
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

    const order = await createOrderAdmin({
      event_id: eventId,
      user_id: session?.userId || null,
      quantity: totalQuantity,
      total_price: totalPrice,
      currency: event.currency || 'USD',
      status: 'pending',
      payment_provider: totalPrice <= 0 ? 'free' : 'paytota',
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

      return NextResponse.json({
        success: true,
        freeCheckout: true,
        orderId: order.id,
        status: 'completed',
        tickets: ticketsPayload.tickets,
        event: ticketsPayload.event,
        order: ticketsPayload.order,
        redirectUrl: `/payment-complete?freeCheckout=1&guestCheckout=${session?.userId ? '0' : '1'}&orderId=${encodeURIComponent(order.id)}&customerEmail=${encodeURIComponent(checkoutEmail)}`,
      });
    }

    const appUrl = getAppUrl();
    const redirectBase = `${appUrl}/payment-complete?orderId=${encodeURIComponent(order.id)}&guestCheckout=${session?.userId ? '0' : '1'}&customerEmail=${encodeURIComponent(checkoutEmail)}`;

    const paytotaPurchase = await createPaytotaPurchase({
      reference: order.id,
      currency: event.currency || 'USD',
      totalAmount: totalPrice,
      products: normalizedSelections.map((selection) => ({
        name: `${event.name} - ${selection.ticketTypeName}`,
        price: selection.ticketPrice * selection.quantity,
      })),
      email: checkoutEmail,
      phone: rawCustomerPhone || undefined,
      fullName: rawCustomerName || undefined,
      successRedirect: `${redirectBase}&status=success`,
      failureRedirect: `${redirectBase}&status=failed`,
      cancelRedirect: `${redirectBase}&status=cancelled`,
    });

    await updateOrderAdmin(order.id, {
      payment_merchant_reference: paytotaPurchase.reference || order.id,
      payment_tracking_id: paytotaPurchase.id,
      payment_metadata: {
        ...(order.payment_metadata || {}),
        ticketSelections: normalizedSelections,
        paytotaInit: paytotaPurchase,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      redirectUrl: paytotaPurchase.checkout_url,
      purchaseId: paytotaPurchase.id,
      merchantReference: paytotaPurchase.reference || order.id,
    });
  } catch (error: unknown) {
    console.error('Payment initialize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
