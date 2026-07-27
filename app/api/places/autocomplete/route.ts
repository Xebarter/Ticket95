import { NextRequest, NextResponse } from 'next/server'

type GoogleAutocompletePrediction = {
  description: string
  place_id: string
  structured_formatting?: {
    main_text?: string
    secondary_text?: string
  }
}

type GoogleAutocompleteResponse = {
  status: string
  error_message?: string
  predictions?: GoogleAutocompletePrediction[]
}

export async function GET(request: NextRequest) {
  const input = (request.nextUrl.searchParams.get('input') || '').trim()

  if (input.length < 2) {
    return NextResponse.json({ predictions: [] })
  }

  if (input.length > 200) {
    return NextResponse.json({ error: 'Input too long' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY is not configured')
    return NextResponse.json({ error: 'Places search is not configured' }, { status: 503 })
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', input)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('components', 'country:ug')
    url.searchParams.set('language', 'en')

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Places search failed' }, { status: 502 })
    }

    const data = (await response.json()) as GoogleAutocompleteResponse

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places autocomplete error:', data.status, data.error_message)
      return NextResponse.json(
        { error: data.error_message || 'Places search failed' },
        { status: 502 }
      )
    }

    const predictions = (data.predictions || []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text || p.description,
      secondaryText: p.structured_formatting?.secondary_text || '',
    }))

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error('Places autocomplete error:', error)
    return NextResponse.json({ error: 'Places search failed' }, { status: 502 })
  }
}
