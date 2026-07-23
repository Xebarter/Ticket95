import { NextRequest, NextResponse } from 'next/server'
import { performTicketCheckIn } from '@/lib/ticket-check-in'
import { broadcastTicketUpdate, getVerifierSession } from '@/lib/verifier-session'

export async function POST(request: NextRequest) {
  try {
    const session = await getVerifierSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const ticketId = String(body?.ticketId || '').trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
    }

    const result = await performTicketCheckIn({
      ticketId,
      eventId: session.eventId,
      verifierSessionId: session.sessionId,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          reason: result.reason,
          conflict:
            result.reason === 'already_checked_in_today' ||
            result.reason === 'already_used' ||
            result.reason === 'conflict',
          ticket: result.ticket,
        },
        { status: result.statusCode }
      )
    }

    void broadcastTicketUpdate(session.eventId, result.ticket)

    return NextResponse.json({
      success: true,
      ticket: result.ticket,
      checkInDay: result.checkInDay,
      markedUsed: result.markedUsed,
      checkedInBy: session.deviceName,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
