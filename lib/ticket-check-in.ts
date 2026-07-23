import { supabaseAdmin } from '@/lib/supabase-admin'
import { calendarDayUtc, evaluateEventAccessWindow } from '@/lib/multi-day-events'
import { VERIFIER_TICKET_SELECT, type VerifierTicketRow } from '@/lib/verifier-auth'

export type TicketCheckInFailureReason =
  | 'ticket_not_found'
  | 'wrong_event'
  | 'invalid_status'
  | 'already_used'
  | 'already_checked_in_today'
  | 'too_early'
  | 'event_ended'
  | 'conflict'

export type TicketForCheckIn = {
  id: string
  event_id: string
  status: 'valid' | 'used' | 'expired' | 'refunded'
  ticket_type_name?: string | null
  checked_in_at?: string | null
  updated_at?: string
  event_name?: string
  qr_code?: string
  checked_in_by?: string | null
}

export type EventForCheckIn = {
  id: string
  date: string
  end_date?: string | null
  name?: string
}

export type EvaluateTicketEntryResult =
  | {
      ok: true
      today: string
      isMultiDay: boolean
      isLastDay: boolean
      checkedInToday: boolean
    }
  | {
      ok: false
      reason: TicketCheckInFailureReason
      message: string
      today: string
      checkedInToday: boolean
    }

export async function hasCheckInOnDay(
  ticketId: string,
  checkInDay: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('ticket_check_ins')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('check_in_day', checkInDay)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function getCheckedInTicketIdsForDay(
  eventId: string,
  checkInDay: string
): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from('ticket_check_ins')
    .select('ticket_id')
    .eq('event_id', eventId)
    .eq('check_in_day', checkInDay)

  if (error) throw new Error(error.message)
  return new Set((data || []).map((row) => row.ticket_id as string))
}

export async function evaluateTicketEntry(
  ticket: TicketForCheckIn,
  event: EventForCheckIn,
  now: Date = new Date()
): Promise<EvaluateTicketEntryResult> {
  if (ticket.event_id !== event.id) {
    return {
      ok: false,
      reason: 'wrong_event',
      message: 'This ticket belongs to a different event.',
      today: '',
      checkedInToday: false,
    }
  }

  if (ticket.status === 'refunded' || ticket.status === 'expired') {
    return {
      ok: false,
      reason: 'invalid_status',
      message: `Ticket is not valid for entry (${ticket.status}).`,
      today: '',
      checkedInToday: false,
    }
  }

  const window = evaluateEventAccessWindow(event, now)

  // Date window is enforced for multi-day events. Single-day keeps legacy
  // behavior (status-based only) so doors are not blocked by UTC day edges.
  if (window.ok === false && window.isMultiDay) {
    return {
      ok: false,
      reason: window.reason,
      message: window.message,
      today: window.today,
      checkedInToday: false,
    }
  }

  const today = window.ok ? window.today : calendarDayUtc(now)
  const isMultiDay = window.ok ? window.isMultiDay : false
  const isLastDay = window.ok ? window.isLastDay : true

  const checkedInToday = await hasCheckInOnDay(ticket.id, today)

  if (checkedInToday) {
    return {
      ok: false,
      reason: 'already_checked_in_today',
      message: isMultiDay
        ? 'Already checked in today. This ticket can be used again on another event day.'
        : 'Ticket already checked in.',
      today,
      checkedInToday: true,
    }
  }

  // Single-day (or final day already consumed): legacy used status blocks entry.
  if (ticket.status === 'used') {
    return {
      ok: false,
      reason: 'already_used',
      message: 'Ticket already used.',
      today,
      checkedInToday: false,
    }
  }

  if (ticket.status !== 'valid') {
    return {
      ok: false,
      reason: 'invalid_status',
      message: `Ticket is not valid for entry (${ticket.status}).`,
      today,
      checkedInToday: false,
    }
  }

  return {
    ok: true,
    today,
    isMultiDay,
    isLastDay,
    checkedInToday: false,
  }
}

export type PerformCheckInResult =
  | {
      success: true
      ticket: VerifierTicketRow & { checked_in_today: boolean }
      checkInDay: string
      markedUsed: boolean
    }
  | {
      success: false
      reason: TicketCheckInFailureReason
      message: string
      ticket?: VerifierTicketRow & { checked_in_today?: boolean }
      statusCode: number
    }

export async function performTicketCheckIn(options: {
  ticketId: string
  eventId: string
  verifierSessionId?: string | null
  now?: Date
}): Promise<PerformCheckInResult> {
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, date, end_date, name')
    .eq('id', options.eventId)
    .maybeSingle<EventForCheckIn>()

  if (eventError) {
    return { success: false, reason: 'conflict', message: eventError.message, statusCode: 500 }
  }
  if (!event) {
    return { success: false, reason: 'ticket_not_found', message: 'Event not found.', statusCode: 404 }
  }

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .select('id, event_id, status, ticket_type_name, checked_in_at, checked_in_by, updated_at, qr_code')
    .eq('id', options.ticketId)
    .maybeSingle<TicketForCheckIn>()

  if (ticketError) {
    return { success: false, reason: 'conflict', message: ticketError.message, statusCode: 500 }
  }
  if (!ticket) {
    return { success: false, reason: 'ticket_not_found', message: 'Ticket not found.', statusCode: 404 }
  }

  const evaluation = await evaluateTicketEntry(ticket, event, now)
  if (!evaluation.ok) {
    const { data: existing } = await supabaseAdmin
      .from('tickets')
      .select(VERIFIER_TICKET_SELECT)
      .eq('id', options.ticketId)
      .eq('event_id', options.eventId)
      .maybeSingle()

    const statusCode =
      evaluation.reason === 'wrong_event'
        ? 400
        : evaluation.reason === 'too_early' || evaluation.reason === 'event_ended'
          ? 400
          : 409

    return {
      success: false,
      reason: evaluation.reason,
      message: evaluation.message,
      ticket: existing
        ? { ...existing, checked_in_today: evaluation.checkedInToday }
        : undefined,
      statusCode,
    }
  }

  const { error: insertError } = await supabaseAdmin.from('ticket_check_ins').insert({
    ticket_id: ticket.id,
    event_id: options.eventId,
    check_in_day: evaluation.today,
    checked_in_at: nowIso,
    checked_in_by: options.verifierSessionId || null,
  })

  if (insertError) {
    // Unique violation = race: already checked in today
    if (insertError.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('tickets')
        .select(VERIFIER_TICKET_SELECT)
        .eq('id', options.ticketId)
        .eq('event_id', options.eventId)
        .maybeSingle()

      return {
        success: false,
        reason: 'already_checked_in_today',
        message: evaluation.isMultiDay
          ? 'Already checked in today. This ticket can be used again on another event day.'
          : 'Ticket was already checked in.',
        ticket: existing ? { ...existing, checked_in_today: true } : undefined,
        statusCode: 409,
      }
    }
    return { success: false, reason: 'conflict', message: insertError.message, statusCode: 500 }
  }

  // Mark permanently used on single-day events or on the last day of a multi-day event.
  const markUsed = !evaluation.isMultiDay || evaluation.isLastDay

  const updatePayload: Record<string, unknown> = {
    checked_in_at: nowIso,
    checked_in_by: options.verifierSessionId || null,
  }
  if (markUsed) {
    updatePayload.status = 'used'
  }

  let updateQuery = supabaseAdmin
    .from('tickets')
    .update(updatePayload)
    .eq('id', ticket.id)
    .eq('event_id', options.eventId)

  if (markUsed) {
    updateQuery = updateQuery.eq('status', 'valid')
  } else {
    updateQuery = updateQuery.eq('status', 'valid')
  }

  const { data: updated, error: updateError } = await updateQuery
    .select(VERIFIER_TICKET_SELECT)
    .maybeSingle()

  if (updateError) {
    return { success: false, reason: 'conflict', message: updateError.message, statusCode: 500 }
  }

  if (!updated) {
    const { data: existing } = await supabaseAdmin
      .from('tickets')
      .select(VERIFIER_TICKET_SELECT)
      .eq('id', options.ticketId)
      .eq('event_id', options.eventId)
      .maybeSingle()

    return {
      success: false,
      reason: 'conflict',
      message: 'Ticket was already checked in or is not valid',
      ticket: existing ? { ...existing, checked_in_today: true } : undefined,
      statusCode: 409,
    }
  }

  return {
    success: true,
    ticket: { ...updated, checked_in_today: true },
    checkInDay: evaluation.today,
    markedUsed: markUsed,
  }
}

export function withCheckedInTodayFlag<T extends { id: string }>(
  tickets: T[],
  checkedInIds: Set<string>
): Array<T & { checked_in_today: boolean }> {
  return tickets.map((ticket) => ({
    ...ticket,
    checked_in_today: checkedInIds.has(ticket.id),
  }))
}
