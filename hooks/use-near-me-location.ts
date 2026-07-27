'use client'

import { useCallback, useEffect, useState } from 'react'
import type { NearMeContext } from '@/lib/event-discovery-filters'

const STORAGE_KEY = 'ticket95.nearMePlace'

type NearMeStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'unavailable' | 'error'

type StoredPlace = {
  placeTokens: string[]
  label: string
  lat: number
  lng: number
}

function readStoredPlace(): StoredPlace | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPlace>
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number' ||
      !Number.isFinite(parsed.lat) ||
      !Number.isFinite(parsed.lng)
    ) {
      // Invalidate legacy cache entries that lack coordinates
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (typeof parsed.label !== 'string' || !parsed.label) return null
    return {
      placeTokens: Array.isArray(parsed.placeTokens) ? parsed.placeTokens : [],
      label: parsed.label,
      lat: parsed.lat,
      lng: parsed.lng,
    }
  } catch {
    return null
  }
}

function writeStoredPlace(place: StoredPlace) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(place))
  } catch {
    // Ignore quota / private mode failures
  }
}

function uniqueTokens(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (!value) continue
    const cleaned = value.trim()
    if (cleaned.length < 2) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cleaned)
  }
  return out
}

async function reverseGeocode(
  lat: number,
  lon: number
): Promise<Omit<StoredPlace, 'lat' | 'lng'>> {
  const url = new URL('/api/geo/reverse', window.location.origin)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Reverse geocode failed')
  }

  const data = (await response.json()) as {
    address?: Record<string, string>
    display_name?: string
  }

  const address = data.address ?? {}
  const placeTokens = uniqueTokens([
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county,
    address.state,
    address.suburb,
    address.city_district,
  ])

  const label =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    data.display_name?.split(',')[0]?.trim() ||
    'Your area'

  return { placeTokens, label }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 5 * 60 * 1000,
    })
  })
}

export function useNearMeLocation(active: boolean) {
  const [status, setStatus] = useState<NearMeStatus>('idle')
  const [context, setContext] = useState<NearMeContext | null>(null)
  const [label, setLabel] = useState<string | null>(null)

  const applyPlace = useCallback((place: StoredPlace) => {
    setContext({
      placeTokens: place.placeTokens,
      lat: place.lat,
      lng: place.lng,
    })
    setLabel(place.label)
    setStatus('ready')
  }, [])

  const resolveLocation = useCallback(async () => {
    const cached = readStoredPlace()
    if (cached) {
      applyPlace(cached)
      return
    }

    setStatus('loading')

    try {
      const position = await getCurrentPosition()
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const place = await reverseGeocode(lat, lng)
      const stored: StoredPlace = { ...place, lat, lng }
      writeStoredPlace(stored)
      applyPlace(stored)
    } catch (error) {
      const geoError = error as GeolocationPositionError | Error
      if (
        typeof geoError === 'object' &&
        geoError &&
        'code' in geoError &&
        geoError.code === 1
      ) {
        setStatus('denied')
      } else if (
        (geoError instanceof Error && geoError.message === 'unsupported') ||
        (typeof geoError === 'object' &&
          geoError &&
          'code' in geoError &&
          geoError.code === 2)
      ) {
        setStatus('unavailable')
      } else {
        setStatus('error')
      }
      setContext(null)
      setLabel(null)
    }
  }, [applyPlace])

  useEffect(() => {
    if (!active) return
    void resolveLocation()
  }, [active, resolveLocation])

  return {
    status,
    context,
    label,
    retry: resolveLocation,
  }
}
