import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { sendCampaign } from '@/lib/newsletter';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const result = await sendCampaign(id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send campaign';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
