import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  cancelEventDeactivationRequest,
  requestEventDeactivation,
} from '@/lib/event-deactivation';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : '';

    const event = await requestEventDeactivation({
      eventId: id,
      organizerId: session.userId,
      reason,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to request deactivation';
    const status =
      message.includes('Unauthorized') || message.includes('own events')
        ? 403
        : message.includes('not found')
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const event = await cancelEventDeactivationRequest({
      eventId: id,
      organizerId: session.userId,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel request';
    const status =
      message.includes('Unauthorized') || message.includes('own events')
        ? 403
        : message.includes('not found')
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
