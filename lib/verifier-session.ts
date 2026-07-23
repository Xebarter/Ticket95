import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  verifyVerifierJwt,
  type VerifierJwtPayload,
} from '@/lib/verifier-auth'

export type VerifierSessionContext = {
  payload: VerifierJwtPayload
  sessionId: string
  eventId: string
  deviceName: string
}

export async function getVerifierSession(
  request: NextRequest
): Promise<VerifierSessionContext | null> {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) return null

  const payload = verifyVerifierJwt(token)
  if (!payload) return null

  const { data: session, error } = await supabaseAdmin
    .from('verifier_sessions')
    .select('id, event_id, device_name, expires_at, revoked_at, token_jti')
    .eq('id', payload.verifierId)
    .eq('token_jti', payload.jti)
    .maybeSingle()

  if (error || !session) return null
  if (session.revoked_at) return null
  if (new Date(session.expires_at).getTime() < Date.now()) return null
  if (session.event_id !== payload.eventId) return null

  // Soft touch last_seen (fire-and-forget)
  void supabaseAdmin
    .from('verifier_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', session.id)

  return {
    payload,
    sessionId: session.id,
    eventId: session.event_id,
    deviceName: session.device_name || 'Door device',
  }
}

export async function broadcastTicketUpdate(
  eventId: string,
  ticket: Record<string, unknown>
) {
  try {
    const channel = supabaseAdmin.channel(`verify:${eventId}`)
    await channel.subscribe()
    await channel.send({
      type: 'broadcast',
      event: 'ticket_update',
      payload: { ticket },
    })
    await supabaseAdmin.removeChannel(channel)
  } catch (error) {
    console.warn('Verifier broadcast failed:', error)
  }
}
