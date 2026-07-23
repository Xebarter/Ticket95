import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat')
  const lon = request.nextUrl.searchParams.get('lon')

  const latNum = lat != null ? Number(lat) : NaN
  const lonNum = lon != null ? Number(lon) : NaN

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 })
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(latNum))
    url.searchParams.set('lon', String(lonNum))
    url.searchParams.set('zoom', '10')
    url.searchParams.set('addressdetails', '1')

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Ticket95/1.0 (event discovery; near-me filter)',
      },
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocode failed' }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Reverse geocode error:', error)
    return NextResponse.json({ error: 'Geocode failed' }, { status: 502 })
  }
}
