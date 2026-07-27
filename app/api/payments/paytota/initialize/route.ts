import { NextRequest, NextResponse } from 'next/server';
import { createPaytotaPurchase } from '@/lib/paytota';
import {
  prepareCheckoutOrder,
  updateOrderAdmin,
  buildPaymentCompleteRedirectBase,
  CheckoutOrderError,
} from '@/lib/checkout-order';
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
      paidProvider: 'paytota',
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
      provider: 'paytota',
    });

    const paytotaPurchase = await createPaytotaPurchase({
      reference: order.id,
      currency: event.currency || 'USD',
      totalAmount: totalPrice,
      products: normalizedSelections.map((selection) => ({
        name: `${event.name} - ${selection.ticketTypeName}`,
        price: selection.ticketPrice * selection.quantity,
      })),
      email: checkoutEmail,
      phone: customerPhone || undefined,
      fullName: customerName || undefined,
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
    if (error instanceof CheckoutOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payment initialize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
