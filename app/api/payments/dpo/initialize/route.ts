import { NextRequest, NextResponse } from 'next/server';
import { createDpoToken, splitCustomerName } from '@/lib/dpo';
import {
  prepareCheckoutOrder,
  updateOrderAdmin,
  buildPaymentCompleteRedirectBase,
  getAppUrl,
  CheckoutOrderError,
} from '@/lib/checkout-order';

function formatDpoBookingDate(isoString: string) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    // Fall back to "now" to avoid breaking token creation.
    const now = new Date();
    return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(
      now.getUTCDate()
    ).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(
      now.getUTCMinutes()
    ).padStart(2, '0')}`;
  }

  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(
    d.getUTCDate()
  ).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(
    2,
    '0'
  )}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await prepareCheckoutOrder({
      eventId: body?.eventId as string,
      selectedQuantities: (body?.selectedQuantities || {}) as Record<string, number>,
      customerEmail: body?.customerEmail,
      customerName: body?.customerName,
      customerPhone: body?.customerPhone,
      affiliateCode: body?.affiliateCode,
      paidProvider: 'dpo',
    });

    if (result.kind === 'free') {
      return NextResponse.json({
        success: true,
        freeCheckout: true,
        orderId: result.orderId,
        status: 'completed',
        tickets: result.tickets,
        event: result.event,
        order: result.order,
        redirectUrl: result.redirectUrl,
      });
    }

    const { order, event, normalizedSelections, totalPrice, checkoutEmail, customerName, customerPhone, isGuest } = result;

    const redirectBase = buildPaymentCompleteRedirectBase({
      orderId: order.id,
      isGuest,
      customerEmail: checkoutEmail,
      provider: 'dpo',
    });

    const appUrl = getAppUrl();
    const { firstName, lastName } = splitCustomerName(customerName);
    const bookingDate = formatDpoBookingDate(event.date);
    const bookingRef = String(order.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);

    const dpoResult = await createDpoToken({
      companyRef: order.id,
      amount: totalPrice,
      currency: event.currency || 'UGX',
      redirectUrl: `${redirectBase}&status=success`,
      backUrl: `${appUrl}/api/payments/dpo/callback`,
      description: normalizedSelections
        .map((s) => `${s.quantity}x ${s.ticketTypeName}`)
        .join(', ')
        .slice(0, 200),
      customerEmail: checkoutEmail,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerPhone: customerPhone || undefined,
      ptl: 24,
      booking: {
        bookingRef,
        bookingDescription: normalizedSelections
          .map((s) => `${s.quantity}x ${s.ticketTypeName}`)
          .join(', ')
          .slice(0, 200),
        bookingDate,
      },
    });

    await updateOrderAdmin(order.id, {
      payment_merchant_reference: order.id,
      payment_tracking_id: dpoResult.transToken,
      payment_metadata: {
        ...(order.payment_metadata || {}),
        ticketSelections: normalizedSelections,
        dpoInit: {
          transToken: dpoResult.transToken,
          transRef: dpoResult.transRef,
          payUrl: dpoResult.payUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      redirectUrl: dpoResult.payUrl,
      purchaseId: dpoResult.transToken,
      merchantReference: order.id,
    });
  } catch (error: unknown) {
    if (error instanceof CheckoutOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DPO payment initialize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize card payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
