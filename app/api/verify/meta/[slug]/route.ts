import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Public event meta for the verifier lock screen (no tickets, no secrets). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const safeSlug = String(slug || '').trim().toLowerCase()
    if (!safeSlug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 })
    }

    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select('id, name, date, end_date, venue, image_url, verify_slug, status, verifier_code_hash')
      .eq('verify_slug', safeSlug)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!event || event.status !== 'approved') {
      return NextResponse.json({ error: 'Verifier not found' }, { status: 404 })
    }

    return NextResponse.json({
      slug: event.verify_slug,
      name: event.name,
      date: event.date,
      endDate: event.end_date || null,
      venue: event.venue,
      imageUrl: event.image_url || null,
      hasCode: Boolean(event.verifier_code_hash),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
