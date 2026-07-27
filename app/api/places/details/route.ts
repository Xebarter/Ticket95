import { NextRequest, NextResponse } from 'next/server'

type GooglePlaceDetailsResponse = {
  status: string
  error_message?: string
  result?: {
    place_id?: string
    name?: string
    formatted_address?: string
    geometry?: {
      location?: {
        lat?: number
        lng?: number
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const placeId = (request.nextUrl.searchParams.get('place_id') || '').trim()

  if (!placeId || placeId.length > 300) {
    return NextResponse.json({ error: 'Invalid place_id' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY is not configured')
    return NextResponse.json({ error: 'Places search is not configured' }, { status: 503 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('fields', 'place_id,name,formatted_address,geometry')
    url.searchParams.set('key', apiKey)
    url.searchParams.set('language', 'en')

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Place details failed' }, { status: 502 })
    }

    const data = (await response.json()) as GooglePlaceDetailsResponse

    if (data.status !== 'OK' || !data.result) {
      console.error('Google Places details error:', data.status, data.error_message)
      return NextResponse.json(
        { error: data.error_message || 'Place details failed' },
        { status: 502 }
      )
    }

    const lat = data.result.geometry?.location?.lat
    const lng = data.result.geometry?.location?.lng

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Place has no coordinates' }, { status: 502 })
    }

    const name = data.result.name?.trim() || ''
    const formattedAddress = data.result.formatted_address?.trim() || ''
    const venue = name
      ? formattedAddress && !formattedAddress.startsWith(name)
        ? `${name}, ${formattedAddress}`
        : name
      : formattedAddress

    return NextResponse.json({
      placeId: data.result.place_id || placeId,
      name,
      formattedAddress,
      venue: venue || formattedAddress || name,
      lat,
      lng,
    })
  } catch (error) {
    console.error('Place details error:', error)
    return NextResponse.json({ error: 'Place details failed' }, { status: 502 })
  }
}
