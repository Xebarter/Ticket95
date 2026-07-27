import { NextRequest, NextResponse } from 'next/server';
import { verifyDpoToken, isDpoPaymentSuccessful, getXmlTagValue } from '@/lib/dpo';
import { completePaidOrder } from '@/lib/complete-paid-order';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * DPO BackURL callback — DPO POSTs or GETs here after payment.
 * We always verify via verifyToken before completing.
 * Must return 200 quickly.
 */
export async function POST(request: NextRequest) {
  return handleCallback(request);
}

export async function GET(request: NextRequest) {
  return handleCallback(request);
}

async function handleCallback(request: NextRequest) {
  try {
    // DPO may send data as query params or body (XML or form)
    let transToken = '';
    let companyRef = '';

    // Try query params first
    const url = new URL(request.url);
    transToken = url.searchParams.get('TransactionToken') || url.searchParams.get('TransToken') || '';
    companyRef = url.searchParams.get('CompanyRef') || '';

    // Try body if not in params
    if (!transToken && !companyRef) {
      const text = await request.text().catch(() => '');
      if (text) {
        // Try XML
        const xmlTransToken = getXmlTagValue(text, 'TransactionToken') || getXmlTagValue(text, 'TransToken');
        const xmlCompanyRef = getXmlTagValue(text, 'CompanyRef');
        transToken = xmlTransToken || transToken;
        companyRef = xmlCompanyRef || companyRef;

        // Try form/JSON
        if (!transToken && !companyRef) {
          try {
            const json = JSON.parse(text);
            transToken = json.TransactionToken || json.TransToken || '';
            companyRef = json.CompanyRef || json.merchantOrderId || '';
          } catch {
            // Not JSON
          }
        }
      }
    }

    if (!transToken && !companyRef) {
      return NextResponse.json({ received: true, skipped: 'missing identifiers' }, { status: 200 });
    }

    // Find order
    let order;
    if (companyRef) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('id, status, event_id, user_id, total_price, currency, affiliate_id, affiliate_referral_code, payment_tracking_id, payment_metadata')
        .eq('id', companyRef)
        .single();
      order = data;
    }
    if (!order && transToken) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('id, status, event_id, user_id, total_price, currency, affiliate_id, affiliate_referral_code, payment_tracking_id, payment_metadata')
        .eq('payment_tracking_id', transToken)
        .single();
      order = data;
    }

    if (!order) {
      return NextResponse.json({ received: true, skipped: 'order not found' }, { status: 200 });
    }

    if (order.status === 'completed') {
      return NextResponse.json({ received: true, already: 'completed' }, { status: 200 });
    }

    // Verify with DPO
    const verification = await verifyDpoToken({
      transactionToken: transToken || String(order.payment_tracking_id || ''),
      companyRef: order.id,
    });

    if (!isDpoPaymentSuccessful(verification.result)) {
      return NextResponse.json({ received: true, skipped: 'not paid', result: verification.result }, { status: 200 });
    }

    await completePaidOrder(order);

    await supabaseAdmin
      .from('orders')
      .update({
        payment_metadata: {
          ...(order.payment_metadata || {}),
          dpoCallback: {
            result: verification.result,
            transactionRef: verification.transactionRef,
            verifiedAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', order.id);

    return NextResponse.json({ received: true, completed: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('DPO callback error:', error);
    return NextResponse.json({ received: true, error: 'processing failed' }, { status: 200 });
  }
}
