import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  generateAccessCode,
  generateVerifySlug,
  hashAccessCode,
} from '@/lib/verifier-auth'

async function assertEventOwner(eventId: string, userId: string, role: string) {
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select(
      'id, name, date, venue, organizer_id, verify_slug, verifier_code_hash, verifier_code_rotated_at, status'
    )
    .eq('id', eventId)
    .maybeSingle()

  if (error || !event) return { error: 'Event not found' as const, status: 404 as const }
  if (role !== 'admin' && event.organizer_id !== userId) {
    return { error: 'Forbidden' as const, status: 403 as const }
  }
  return { event }
}

function buildVerifyUrl(request: NextRequest, slug: string) {
  const origin = request.nextUrl.origin
  return `${origin}/verify/${slug}`
}

/** GET current verifier access info (code never returned — only whether set). */
export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuthUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = request.nextUrl.searchParams.get('eventId')?.trim() || ''
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const owned = await assertEventOwner(eventId, auth.userId, auth.role)
    if ('error' in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.status })
    }
    const event = owned.event

    let slug = event.verify_slug
    if (!slug) {
      slug = generateVerifySlug()
      await supabaseAdmin.from('events').update({ verify_slug: slug }).eq('id', event.id)
    }

    return NextResponse.json({
      eventId: event.id,
      eventName: event.name,
      slug,
      url: buildVerifyUrl(request, slug),
      hasCode: Boolean(event.verifier_code_hash),
      rotatedAt: event.verifier_code_rotated_at,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST create or rotate access code. Returns plaintext code once. */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuthUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const eventId = String(body?.eventId || '').trim()
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    const owned = await assertEventOwner(eventId, auth.userId, auth.role)
    if ('error' in owned) {
      return NextResponse.json({ error: owned.error }, { status: owned.status })
    }
    const event = owned.event

    let slug = event.verify_slug
    if (!slug) {
      slug = generateVerifySlug()
    }

    const code = generateAccessCode()
    const nowIso = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        verify_slug: slug,
        verifier_code_hash: hashAccessCode(code),
        verifier_code_rotated_at: nowIso,
      })
      .eq('id', event.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Revoke existing door sessions when code rotates
    await supabaseAdmin
      .from('verifier_sessions')
      .update({ revoked_at: nowIso })
      .eq('event_id', event.id)
      .is('revoked_at', null)

    const url = buildVerifyUrl(request, slug)

    return NextResponse.json({
      eventId: event.id,
      eventName: event.name,
      slug,
      url,
      code,
      rotatedAt: nowIso,
      message: 'Share this link and code with door staff. The code is shown once.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
