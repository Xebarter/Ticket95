import { NextRequest, NextResponse } from 'next/server';
import { verifyDpoToken, isDpoPaymentSuccessful } from '@/lib/dpo';
import { completePaidOrder } from '@/lib/complete-paid-order';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * DPO Push Payments webhook — server-to-server JSON notification.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => ({}));
    const transactionId = String(payload?.transactionId || payload?.TransactionToken || '').trim();
    const merchantOrderId = String(payload?.merchantOrderId || payload?.CompanyRef || '').trim();
    const status = String(payload?.status || '').toUpperCase();

    if (!transactionId && !merchantOrderId) {
      return NextResponse.json({ received: true, skipped: 'missing identifiers' }, { status: 200 });
    }

    // Only process SUCCESS-like events
    if (status && status !== 'SUCCESS' && status !== 'APPROVED') {
      return NextResponse.json({ received: true, skipped: 'non-success status' }, { status: 200 });
    }

    // Find order
    let order;
    if (merchantOrderId) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('id, status, event_id, user_id, total_price, currency, affiliate_id, affiliate_referral_code, payment_tracking_id, payment_metadata')
        .eq('id', merchantOrderId)
        .single();
      order = data;
    }
    if (!order && transactionId) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('id, status, event_id, user_id, total_price, currency, affiliate_id, affiliate_referral_code, payment_tracking_id, payment_metadata')
        .eq('payment_tracking_id', transactionId)
        .single();
      order = data;
    }

    if (!order) {
      return NextResponse.json({ received: true, skipped: 'order not found' }, { status: 200 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ received: true, already: 'completed' }, { status: 200 });
    }

    // Verify with DPO before completing
    const verification = await verifyDpoToken({
      transactionToken: transactionId || String(order.payment_tracking_id || ''),
      companyRef: order.id,
    });

    if (!isDpoPaymentSuccessful(verification.result)) {
      return NextResponse.json({ received: true, skipped: 'unverified' }, { status: 200 });
    }

    await completePaidOrder(order);

    await supabaseAdmin
      .from('orders')
      .update({
        payment_metadata: {
          ...(order.payment_metadata || {}),
          dpoWebhook: {
            payload,
            verification: {
              result: verification.result,
              transactionRef: verification.transactionRef,
            },
            processedAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', order.id);

    return NextResponse.json({ received: true, completed: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('DPO webhook error:', error);
    return NextResponse.json({ received: true, error: 'processing failed' }, { status: 200 });
  }
}
