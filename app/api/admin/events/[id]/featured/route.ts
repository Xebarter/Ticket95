// PATCH /api/admin/events/[id]/featured
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const { is_featured } = body;

    if (typeof is_featured !== 'boolean') {
      return NextResponse.json(
        { error: 'is_featured must be a boolean' },
        { status: 400 }
      );
    }

    // Update the event's featured status
    const { data, error } = await supabaseAdmin
      .from('events')
      .update({ is_featured })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating featured status:', error);
      return NextResponse.json(
        { error: 'Failed to update featured status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  } catch (error) {
    console.error('Error in featured toggle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
