import { NextRequest, NextResponse } from 'next/server';
import {
  findPayoutByPaytotaIdOrReference,
  markPayoutFailed,
  markPayoutSuccess,
  syncPayoutFromPaytota,
} from '@/lib/payouts';
import { getPaytotaPayoutStatus, isPaytotaPayoutFailed, isPaytotaPayoutSuccessful } from '@/lib/paytota';

type PaytotaPayoutWebhookPayload = {
  id?: string;
  reference?: string;
  status?: string;
  event_type?: string;
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as PaytotaPayoutWebhookPayload;
    const eventType = String(payload?.event_type || '').toLowerCase();
    const payoutId = String(payload?.id || '').trim();
    const reference = String(payload?.reference || '').trim();
    const status = String(payload?.status || '').toLowerCase();

    if (!payoutId && !reference) {
      return NextResponse.json({ received: true, skipped: 'missing identifiers' }, { status: 200 });
    }

    const payout = await findPayoutByPaytotaIdOrReference({
      paytotaId: payoutId || undefined,
      reference: reference || undefined,
    });

    if (!payout) {
      return NextResponse.json({ received: true, skipped: 'payout not found' }, { status: 200 });
    }

    // Verify with Paytota when we have a remote id
    if (payout.paytota_payout_id) {
      try {
        await syncPayoutFromPaytota(payout.id);
        return NextResponse.json({ received: true, synced: true }, { status: 200 });
      } catch (err) {
        console.warn('Payout webhook sync failed, falling back to event type:', err);
      }
    }

    const successEvents = ['payout.success'];
    const failedEvents = ['payout.failed'];

    if (successEvents.includes(eventType) || isPaytotaPayoutSuccessful(status)) {
      if (payout.paytota_payout_id) {
        const remote = await getPaytotaPayoutStatus(payout.paytota_payout_id);
        if (!isPaytotaPayoutSuccessful(remote.status)) {
          return NextResponse.json({ received: true, skipped: 'unverified success' }, { status: 200 });
        }
      }
      await markPayoutSuccess(payout.id, { webhook: payload });
      return NextResponse.json({ received: true, completed: true }, { status: 200 });
    }

    if (failedEvents.includes(eventType) || isPaytotaPayoutFailed(status)) {
      await markPayoutFailed(payout.id, 'Paytota payout failed');
      return NextResponse.json({ received: true, failed: true }, { status: 200 });
    }

    // pending / created — keep processing
    return NextResponse.json({ received: true, skipped: 'non-terminal event' }, { status: 200 });
  } catch (error: unknown) {
    console.error('Paytota payout webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
