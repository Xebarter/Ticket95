import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { resolveEventDeactivationRequest } from '@/lib/event-deactivation';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action === 'deny' ? 'deny' : body?.action === 'approve' ? 'approve' : null;

    if (!action) {
      return NextResponse.json(
        { error: 'action must be "approve" or "deny"' },
        { status: 400 }
      );
    }

    const event = await resolveEventDeactivationRequest({ eventId: id, action });
    return NextResponse.json({ success: true, event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve request';
    const status = message.includes('Admin') || message.includes('session') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
