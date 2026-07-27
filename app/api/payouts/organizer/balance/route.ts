import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getOrganizerBalance } from '@/lib/payouts';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const balance = await getOrganizerBalance(session.userId);
    return NextResponse.json(balance);
  } catch (error: unknown) {
    console.error('Organizer payout balance error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load balance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
