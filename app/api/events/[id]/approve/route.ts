import { NextRequest, NextResponse } from 'next/server';
import { updateEventStatus, getEventById } from '@/lib/supabase-db';
import { requireAdmin } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { approved, note } = body;

    if (approved === undefined) {
      return NextResponse.json(
        { error: 'Approval status required' },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Update event status
    const updatedEvent = await updateEventStatus(id, approved ? 'approved' : 'rejected', note || undefined);

    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Failed to update event status' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, status: updatedEvent.status },
      { status: 200 }
    );
  } catch (error) {
    console.error('Approval error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
