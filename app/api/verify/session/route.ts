import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  accessCodesMatch,
  newTokenJti,
  sessionExpiresAt,
  signVerifierJwt,
} from '@/lib/verifier-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const slug = String(body?.slug || '').trim().toLowerCase()
    const code = String(body?.code || '').trim()
    const deviceName = String(body?.deviceName || 'Door device').trim().slice(0, 80) || 'Door device'

    if (!slug || !code) {
      return NextResponse.json({ error: 'Slug and access code are required' }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, name, date, venue, image_url, status, verify_slug, verifier_code_hash')
      .eq('verify_slug', slug)
      .maybeSingle()

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }
    if (!event) {
      return NextResponse.json({ error: 'Verifier link not found' }, { status: 404 })
    }
    if (event.status !== 'approved') {
      return NextResponse.json({ error: 'This event is not active for verification' }, { status: 403 })
    }
    if (!event.verifier_code_hash) {
      return NextResponse.json(
        { error: 'Verifier access has not been set up for this event yet' },
        { status: 403 }
      )
    }
    if (!accessCodesMatch(code, event.verifier_code_hash)) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    const jti = newTokenJti()
    const expiresAt = sessionExpiresAt()

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('verifier_sessions')
      .insert({
        event_id: event.id,
        device_name: deviceName,
        token_jti: jti,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, device_name, expires_at')
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: sessionError?.message || 'Failed to create verifier session' },
        { status: 500 }
      )
    }

    const token = signVerifierJwt({
      verifierId: session.id,
      eventId: event.id,
      jti,
      exp: Math.floor(expiresAt.getTime() / 1000),
    })

    return NextResponse.json({
      token,
      expiresAt: session.expires_at,
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        slug: event.verify_slug,
        imageUrl: event.image_url || null,
      },
      session: {
        id: session.id,
        deviceName: session.device_name,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
