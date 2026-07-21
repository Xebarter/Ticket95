import { NextRequest, NextResponse } from 'next/server';
import { completePaidOrder } from '@/lib/complete-paid-order';
import { getPaytotaPurchaseStatus, isPaytotaPaymentSuccessful } from '@/lib/paytota';
import { supabaseAdmin } from '@/lib/supabase-admin';

type PaytotaWebhookPayload = {
  id?: string;
  reference?: string;
  status?: string;
  event_type?: string;
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as PaytotaWebhookPayload;
    const eventType = String(payload?.event_type || '').toLowerCase();
    const purchaseId = String(payload?.id || '').trim();
    const reference = String(payload?.reference || '').trim();

    if (!purchaseId || !reference) {
      return NextResponse.json({ received: true, skipped: 'missing identifiers' }, { status: 200 });
    }

    const paidEvents = ['purchase.paid', 'purchase.captured'];
    const status = String(payload?.status || '').toLowerCase();
    const isPaidEvent = paidEvents.includes(eventType) || isPaytotaPaymentSuccessful(status);

    if (!isPaidEvent) {
      return NextResponse.json({ received: true, skipped: 'non-paid event' }, { status: 200 });
    }

    const purchaseStatus = await getPaytotaPurchaseStatus(purchaseId);
    if (!isPaytotaPaymentSuccessful(purchaseStatus?.status)) {
      return NextResponse.json({ received: true, skipped: 'unverified status' }, { status: 200 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(
        'id, status, event_id, user_id, total_price, currency, affiliate_id, affiliate_referral_code, payment_tracking_id, payment_metadata'
      )
      .eq('id', reference)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ received: true, skipped: 'order not found' }, { status: 200 });
    }

    if (order.payment_tracking_id && order.payment_tracking_id !== purchaseId) {
      return NextResponse.json({ error: 'Purchase reference mismatch' }, { status: 403 });
    }

    await completePaidOrder(order);

    return NextResponse.json({ received: true, completed: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Paytota webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
