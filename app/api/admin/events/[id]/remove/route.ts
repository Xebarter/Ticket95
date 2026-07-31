import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { softRemoveEvent } from '@/lib/event-removal';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const event = await softRemoveEvent({
      eventId: id,
      adminUserId: session.userId,
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error in POST /api/admin/events/[id]/remove:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove event';
    const status =
      message.includes('Admin') || message.includes('session')
        ? 403
        : message.includes('not found')
          ? 404
          : message.includes('already removed')
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
