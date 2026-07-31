import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { permanentlyDeleteRemovedEvent } from '@/lib/event-removal';

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
    const result = await permanentlyDeleteRemovedEvent({
      eventId: id,
      organizerId: session.userId,
    });

    if (!result.ok) {
      const status =
        result.error === 'Event not found'
          ? 404
          : result.error.includes('own events') || result.error.includes('Only events')
            ? 403
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/events/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
