import { NextRequest, NextResponse } from 'next/server';
import { completePaidOrder } from '@/lib/complete-paid-order';
import { getPaymentOrderTicketsPayload } from '@/lib/payment-order-tickets';
import { getPaytotaPurchaseStatus, isPaytotaPaymentSuccessful } from '@/lib/paytota';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function getOrderByIdAdmin(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

function getOrderCustomerEmail(order: { payment_metadata?: Record<string, unknown> | null }) {
  const metadata = (order.payment_metadata || {}) as {
    customer?: { email?: string | null };
  };
  return metadata.customer?.email || null;
}

async function ticketsResponseForOrder(order: {
  id: string;
  user_id: string | null;
  payment_provider?: string | null;
  payment_metadata?: Record<string, unknown> | null;
  event_id: string;
}) {
  return getPaymentOrderTicketsPayload({
    orderId: order.id,
    userId: order.user_id,
    paymentProvider: order.payment_provider,
    paymentMetadata: order.payment_metadata as Record<string, unknown> | null,
    eventId: order.event_id,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const purchaseId = String(body?.purchaseId || body?.orderTrackingId || '').trim();
    const orderId = String(body?.orderId || body?.orderMerchantReference || '').trim();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing verification details' }, { status: 400 });
    }

    const order = await getOrderByIdAdmin(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed') {
      const ticketsPayload = await ticketsResponseForOrder(order);
      return NextResponse.json({
        success: true,
        status: 'completed',
        orderId: order.id,
        isGuest: !order.user_id,
        customerEmail: getOrderCustomerEmail(order),
        tickets: ticketsPayload.tickets,
        event: ticketsPayload.event,
        order: ticketsPayload.order,
      });
    }

    const trackingId = purchaseId || String(order.payment_tracking_id || '').trim();
    if (!trackingId) {
      return NextResponse.json({ error: 'Missing payment reference' }, { status: 400 });
    }

    if (order.payment_tracking_id && order.payment_tracking_id !== trackingId) {
      return NextResponse.json({ error: 'Purchase reference mismatch' }, { status: 403 });
    }

    const purchaseStatus = await getPaytotaPurchaseStatus(trackingId);
    const status = String(purchaseStatus?.status || 'unknown');
    const paid = isPaytotaPaymentSuccessful(status);

    if (!paid) {
      await supabaseAdmin
        .from('orders')
        .update({
          status: status.toLowerCase().includes('pending') ? 'pending' : 'failed',
          payment_tracking_id: trackingId,
        })
        .eq('id', order.id);

      return NextResponse.json({
        success: false,
        status,
        orderId: order.id,
      });
    }

    if (purchaseStatus.reference && purchaseStatus.reference !== order.id) {
      return NextResponse.json({ error: 'Purchase reference mismatch' }, { status: 403 });
    }

    await completePaidOrder(order);

    const [, ticketsPayload] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .update({
          payment_tracking_id: trackingId,
          payment_merchant_reference: order.id,
          payment_metadata: {
            ...(order.payment_metadata || {}),
            verification: purchaseStatus,
          },
        })
        .eq('id', order.id),
      ticketsResponseForOrder({
        ...order,
        payment_provider: order.payment_provider,
      }),
    ]);

    return NextResponse.json({
      success: true,
      status,
      orderId: order.id,
      isGuest: !order.user_id,
      customerEmail: getOrderCustomerEmail(order),
      tickets: ticketsPayload.tickets,
      event: ticketsPayload.event,
      order: ticketsPayload.order,
    });
  } catch (error: unknown) {
    console.error('Payment verify error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
