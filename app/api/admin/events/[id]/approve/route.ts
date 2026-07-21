import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/session';
import { notifyUsersOfNewEvent } from '@/lib/notifications';

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

    const { data: event, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !event) {
      console.error('Error fetching event:', fetchError);
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const wasAlreadyApproved = event.status === 'approved';

    const updateData: Record<string, unknown> = {
      status: approved ? 'approved' : 'rejected',
    };

    if (note) {
      updateData.rejection_reason = note;
    }

    const { data: updatedEvent, error: updateError } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating event status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event status', details: updateError.message },
        { status: 500 }
      );
    }

    if (approved && !wasAlreadyApproved && updatedEvent) {
      void notifyUsersOfNewEvent({
        id: updatedEvent.id,
        name: updatedEvent.name,
        venue: updatedEvent.venue,
        date: updatedEvent.date,
        organizer_name: updatedEvent.organizer_name,
        image_url: updatedEvent.image_url,
      }).catch((err) => {
        console.error('Failed to fan-out new event notifications:', err);
      });
    }

    return NextResponse.json(
      { success: true, status: updatedEvent.status },
      { status: 200 }
    );
  } catch (error) {
    console.error('Approval error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
