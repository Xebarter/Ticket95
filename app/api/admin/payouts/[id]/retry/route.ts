import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { retryPayout } from '@/lib/payouts';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing payout id' }, { status: 400 });
    }

    const payout = await retryPayout(id);
    return NextResponse.json({ payout });
  } catch (error: unknown) {
    console.error('Admin payout retry error:', error);
    const message = error instanceof Error ? error.message : 'Retry failed';
    const status =
      message.includes('Admin') || message.includes('session')
        ? 403
        : message.includes('Only failed')
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
