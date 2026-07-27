import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { getCampaign } from '@/lib/newsletter';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const data = await getCampaign(id);
    if (!data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load campaign';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
