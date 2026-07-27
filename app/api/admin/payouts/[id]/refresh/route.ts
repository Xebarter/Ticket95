import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { syncPayoutFromPaytota } from '@/lib/payouts';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    const result = await syncPayoutFromPaytota(id);

    const { data: payout } = await supabaseAdmin.from('payouts').select('*').eq('id', id).single();

    return NextResponse.json({ ...result, payout });
  } catch (error: unknown) {
    console.error('Admin payout refresh error:', error);
    const message = error instanceof Error ? error.message : 'Refresh failed';
    const status = message.includes('Admin') || message.includes('session') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
