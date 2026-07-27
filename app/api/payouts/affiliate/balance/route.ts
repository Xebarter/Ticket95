import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ensureAffiliateForUser } from '@/lib/affiliates';
import { getAffiliateBalance } from '@/lib/payouts';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureAffiliateForUser(session.userId, session.email);
    const balance = await getAffiliateBalance(session.userId);
    return NextResponse.json(balance);
  } catch (error: unknown) {
    console.error('Affiliate payout balance error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load balance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
