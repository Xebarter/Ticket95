import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ensureAffiliateForUser } from '@/lib/affiliates';
import { requestAffiliatePayout } from '@/lib/payouts';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureAffiliateForUser(session.userId, session.email);

    const body = (await request.json().catch(() => ({}))) as {
      amount?: number;
      phone?: string;
    };

    const phone = String(body.phone || '').trim();
    if (!phone) {
      return NextResponse.json({ error: 'Mobile money phone number is required.' }, { status: 400 });
    }

    const result = await requestAffiliatePayout({
      userId: session.userId,
      amount: body.amount != null ? Number(body.amount) : undefined,
      phone,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Affiliate payout request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to request payout';
    const status =
      message.includes('Minimum') ||
      message.includes('exceeds') ||
      message.includes('valid Uganda') ||
      message.includes('Selected commissions')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
