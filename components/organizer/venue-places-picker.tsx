'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Loader2, MapPin, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type VenuePlaceValue = {
  venue: string
  venue_lat: number | null
  venue_lng: number | null
  venue_place_id: string | null
  formattedAddress?: string | null
}

type Prediction = {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

type VenuePlacesPickerProps = {
  id?: string
  value: VenuePlaceValue
  onChange: (value: VenuePlaceValue) => void
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

const emptyValue = (): VenuePlaceValue => ({
  venue: '',
  venue_lat: null,
  venue_lng: null,
  venue_place_id: null,
  formattedAddress: null,
})

export function VenuePlacesPicker({
  id,
  value,
  onChange,
  invalid,
  disabled,
  placeholder = 'Search for a venue or address',
  className,
}: VenuePlacesPickerProps) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [query, setQuery] = useState(value.venue || '')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasSelection =
    value.venue_lat != null &&
    value.venue_lng != null &&
    Number.isFinite(value.venue_lat) &&
    Number.isFinite(value.venue_lng)

  // Keep input in sync when parent resets (e.g. edit load)
  useEffect(() => {
    setQuery(value.venue || '')
  }, [value.venue, value.venue_place_id])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const fetchPredictions = useCallback(async (input: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const url = new URL('/api/places/autocomplete', window.location.origin)
      url.searchParams.set('input', input)
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      const data = (await response.json()) as {
        predictions?: Prediction[]
        error?: string
      }
      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }
      setPredictions(data.predictions || [])
      setOpen(true)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setPredictions([])
      setError((err as Error).message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (next: string) => {
    setQuery(next)
    setError(null)

    // Typing clears a prior Places selection until a suggestion is chosen
    if (hasSelection || value.venue) {
      onChange({
        venue: next,
        venue_lat: null,
        venue_lng: null,
        venue_place_id: null,
        formattedAddress: null,
      })
    } else {
      onChange({
        ...emptyValue(),
        venue: next,
      })
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = next.trim()
    if (trimmed.length < 2) {
      setPredictions([])
      setOpen(false)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      void fetchPredictions(trimmed)
    }, 300)
  }

  const selectPrediction = async (prediction: Prediction) => {
    setSelecting(true)
    setError(null)
    setOpen(false)

    try {
      const url = new URL('/api/places/details', window.location.origin)
      url.searchParams.set('place_id', prediction.placeId)
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      })
      const data = (await response.json()) as {
        venue?: string
        name?: string
        formattedAddress?: string
        placeId?: string
        lat?: number
        lng?: number
        error?: string
      }
      if (!response.ok || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
        throw new Error(data.error || 'Could not load place details')
      }

      const venue = (data.venue || data.name || prediction.mainText).trim()
      setQuery(venue)
      setPredictions([])
      onChange({
        venue,
        venue_lat: data.lat,
        venue_lng: data.lng,
        venue_place_id: data.placeId || prediction.placeId,
        formattedAddress: data.formattedAddress || prediction.secondaryText || null,
      })
    } catch (err) {
      setError((err as Error).message || 'Could not load place details')
    } finally {
      setSelecting(false)
    }
  }

  const clearSelection = () => {
    setQuery('')
    setPredictions([])
    setOpen(false)
    setError(null)
    onChange(emptyValue())
  }

  return (
    <div ref={containerRef} className={cn('relative space-y-2', className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled || selecting}
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (predictions.length > 0) setOpen(true)
          }}
          aria-invalid={invalid}
          className={cn('pr-10 pl-9', invalid ? 'border-destructive' : '')}
        />
        {(loading || selecting) && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!loading && !selecting && query && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear venue"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && predictions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          {predictions.map((prediction) => (
            <li key={prediction.placeId} role="option">
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void selectPrediction(prediction)}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{prediction.mainText}</span>
                  {prediction.secondaryText ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {prediction.secondaryText}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasSelection && value.formattedAddress ? (
        <p className="text-xs text-muted-foreground">{value.formattedAddress}</p>
      ) : hasSelection ? (
        <p className="text-xs text-muted-foreground">Location selected</p>
      ) : query.trim().length >= 2 && !loading ? (
        <p className="text-xs text-muted-foreground">Pick a place from the suggestions</p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
