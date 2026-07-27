import { NextRequest, NextResponse } from 'next/server';
import { verifyDpoToken, isDpoPaymentSuccessful } from '@/lib/dpo';
import { completePaidOrder } from '@/lib/complete-paid-order';
import { getPaymentOrderTicketsPayload } from '@/lib/payment-order-tickets';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = String(body?.orderId || '').trim();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
    }

    const order = await getOrderByIdAdmin(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'completed') {
      const ticketsPayload = await getPaymentOrderTicketsPayload({
        orderId: order.id,
        userId: order.user_id,
        paymentProvider: order.payment_provider,
        paymentMetadata: order.payment_metadata as Record<string, unknown> | null,
        eventId: order.event_id,
      });

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

    const transToken = String(order.payment_tracking_id || '').trim();
    if (!transToken) {
      return NextResponse.json({ error: 'Missing DPO transaction token' }, { status: 400 });
    }

    const verification = await verifyDpoToken({
      transactionToken: transToken,
      companyRef: order.id,
    });

    const paid = isDpoPaymentSuccessful(verification.result);

    if (!paid) {
      const failStatus =
        verification.result === '900' ? 'pending' :
        verification.result === '904' ? 'failed' : 'failed';

      await supabaseAdmin
        .from('orders')
        .update({ status: failStatus })
        .eq('id', order.id);

      return NextResponse.json({
        success: false,
        status: verification.result === '900' ? 'pending' : 'failed',
        orderId: order.id,
        resultExplanation: verification.resultExplanation,
      });
    }

    await completePaidOrder(order);

    await supabaseAdmin
      .from('orders')
      .update({
        payment_metadata: {
          ...(order.payment_metadata || {}),
          dpoVerification: {
            result: verification.result,
            resultExplanation: verification.resultExplanation,
            transactionAmount: verification.transactionAmount,
            transactionCurrency: verification.transactionCurrency,
            transactionRef: verification.transactionRef,
          },
        },
      })
      .eq('id', order.id);

    const ticketsPayload = await getPaymentOrderTicketsPayload({
      orderId: order.id,
      userId: order.user_id,
      paymentProvider: order.payment_provider,
      paymentMetadata: order.payment_metadata as Record<string, unknown> | null,
      eventId: order.event_id,
    });

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
  } catch (error: unknown) {
    console.error('DPO payment verify error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify card payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
