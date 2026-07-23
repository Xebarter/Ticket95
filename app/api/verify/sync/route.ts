import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { calendarDayUtc } from '@/lib/multi-day-events'
import { getCheckedInTicketIdsForDay, withCheckedInTodayFlag } from '@/lib/ticket-check-in'
import { VERIFIER_TICKET_SELECT } from '@/lib/verifier-auth'
import { getVerifierSession } from '@/lib/verifier-session'

export async function GET(request: NextRequest) {
  try {
    const session = await getVerifierSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const since = request.nextUrl.searchParams.get('since')?.trim() || ''
    let query = supabaseAdmin
      .from('tickets')
      .select(VERIFIER_TICKET_SELECT)
      .eq('event_id', session.eventId)
      .order('updated_at', { ascending: true })

    if (since) {
      query = query.gt('updated_at', since)
    }

    const { data: tickets, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const today = calendarDayUtc()
    const checkedInTodayIds = await getCheckedInTicketIdsForDay(session.eventId, today)

    return NextResponse.json({
      tickets: withCheckedInTodayFlag(tickets || [], checkedInTodayIds),
      syncedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
