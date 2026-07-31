import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { resubmitEventForVerification } from '@/lib/event-removal';

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const event = await resubmitEventForVerification({
      eventId: id,
      organizerId: session.userId,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resubmit event';
    const status =
      message.includes('Unauthorized') || message.includes('own events')
        ? 403
        : message.includes('not found')
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
