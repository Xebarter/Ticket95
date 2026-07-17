import { NextRequest, NextResponse } from 'next/server';
import { getTicketsByUser, getTicketsByOrder } from '@/lib/supabase-db';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    let tickets;
    if (orderId) {
      tickets = await getTicketsByOrder(orderId);
    } else {
      tickets = await getTicketsByUser(session.userId);
    }

    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
