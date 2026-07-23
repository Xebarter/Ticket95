import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPaymentOrderTicketsPayload } from '@/lib/payment-order-tickets';

async function getOrderAdmin(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, status, payment_provider, payment_tracking_id, user_id, payment_metadata, event_id')
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = (searchParams.get('orderId') || '').trim();
    const orderTrackingId = (
      searchParams.get('orderTrackingId') ||
      searchParams.get('purchaseId') ||
      ''
    ).trim();
    const freeCheckoutParam = (searchParams.get('freeCheckout') || '').toLowerCase();
    const isFreeCheckout = freeCheckoutParam === '1' || freeCheckoutParam === 'true';

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const order = await getOrderAdmin(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'completed') {
      return NextResponse.json({ error: 'Order payment is not completed yet' }, { status: 409 });
    }

    const isFreeProvider = String(order.payment_provider || '').toLowerCase() === 'free';
    if (!isFreeProvider) {
      if (!orderTrackingId || !order.payment_tracking_id || orderTrackingId !== order.payment_tracking_id) {
        return NextResponse.json({ error: 'Invalid payment tracking reference' }, { status: 403 });
      }
    } else if (!isFreeCheckout) {
      return NextResponse.json({ error: 'Missing free checkout context' }, { status: 403 });
    }

    const payload = await getPaymentOrderTicketsPayload({
      orderId: order.id,
      userId: order.user_id,
      paymentProvider: order.payment_provider,
      paymentMetadata: order.payment_metadata as Record<string, unknown> | null,
      eventId: order.event_id,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    console.error('Get payment tickets error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load payment tickets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
