'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { normalizeQrValue } from '@/lib/ticket-verification'
import {
  buildTicketMaps,
  clearSession,
  enqueuePending,
  listPending,
  loadSession,
  loadTickets,
  removePending,
  replaceTickets,
  saveSession,
  upsertTickets,
  type CachedVerifierTicket,
  type VerifierLocalSession,
} from '@/lib/verifier-cache'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Download,
  Keyboard,
  Loader2,
  ScanLine,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'

type BarcodeCandidate = { rawValue?: string }
type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeCandidate[]>
}
type BarcodeDetectorConstructor = new (options?: {
  formats?: string[]
}) => BarcodeDetectorInstance
type JsQrResult = { data?: string } | null
type JsQrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => JsQrResult

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type ScanFlash =
  | {
      kind: 'valid' | 'used' | 'invalid' | 'cancelled' | 'refunded' | 'conflict'
      title: string
      subtitle?: string
      at: number
    }
  | null

type EventMeta = {
  name: string
  venue?: string | null
  imageUrl?: string | null
  date?: string | null
}

const LAST_SLUG_KEY = 'ticket95.lastVerifySlug'

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  // iOS Safari
  const ios = Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || ios
}

function rememberSlug(slug: string) {
  try {
    localStorage.setItem(LAST_SLUG_KEY, slug)
  } catch {
    // ignore
  }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SET_LAST_SLUG', slug })
  }
}

function createScanAudio() {
  let ctx: AudioContext | null = null

  const ensure = async () => {
    if (!ctx) {
      ctx = new AudioContext()
    }
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    return ctx
  }

  const tone = async (
    frequencies: number[],
    opts: { duration: number; peak: number; type?: OscillatorType }
  ) => {
    try {
      const audio = await ensure()
      const now = audio.currentTime
      const master = audio.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(opts.peak, now + 0.02)
      master.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration)
      master.connect(audio.destination)

      frequencies.forEach((freq, index) => {
        const osc = audio.createOscillator()
        const gain = audio.createGain()
        osc.type = opts.type || (index === 0 ? 'sine' : 'triangle')
        osc.frequency.setValueAtTime(freq, now)
        gain.gain.setValueAtTime(index === 0 ? 1 : 0.35, now)
        osc.connect(gain)
        gain.connect(master)
        osc.start(now + index * 0.07)
        osc.stop(now + opts.duration)
      })
    } catch {
      // ignore audio failures
    }
  }

  return {
    unlock: () => void ensure(),
    playValid: () =>
      void tone([660, 880], { duration: 0.32, peak: 0.48, type: 'sine' }),
    playInvalid: () =>
      void tone([320, 180], { duration: 0.4, peak: 0.42, type: 'sine' }),
  }
}

export function VerifierApp({ slug }: { slug: string }) {
  const router = useRouter()
  const safeSlug = slug.toLowerCase().trim()

  const [phase, setPhase] = useState<'boot' | 'login' | 'loading' | 'ready'>('boot')
  const [code, setCode] = useState('')
  const [deviceName, setDeviceName] = useState('Door device')
  const [session, setSession] = useState<VerifierLocalSession | null>(null)
  const [tickets, setTickets] = useState<CachedVerifierTicket[]>([])
  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [flash, setFlash] = useState<ScanFlash>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [switchSlug, setSwitchSlug] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<number | null>(null)
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null)
  const jsQrDecoderRef = useRef<JsQrDecoder | null>(null)
  const lastScannedValueRef = useRef('')
  const lastScannedAtRef = useRef(0)
  const mapsRef = useRef(buildTicketMaps([]))
  const sessionRef = useRef<VerifierLocalSession | null>(null)
  const flushingRef = useRef(false)
  const audioRef = useRef(createScanAudio())
  const cameraStartedRef = useRef(false)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    mapsRef.current = buildTicketMaps(tickets)
  }, [tickets])

  const checkedIn = useMemo(
    () => tickets.filter((t) => t.status === 'used').length,
    [tickets]
  )

  const heroImage =
    session?.eventImageUrl || eventMeta?.imageUrl || null
  const heroName = session?.eventName || eventMeta?.name || 'Ticket95 Verifier'
  const heroVenue = session?.eventVenue || eventMeta?.venue || null

  const applyTickets = useCallback((next: CachedVerifierTicket[]) => {
    setTickets(next)
    mapsRef.current = buildTicketMaps(next)
  }, [])

  const refreshPendingCount = useCallback(async () => {
    const pending = await listPending(safeSlug)
    setPendingCount(pending.length)
  }, [safeSlug])

  const flushPending = useCallback(
    async (active: VerifierLocalSession) => {
      if (flushingRef.current || !navigator.onLine) return
      flushingRef.current = true
      try {
        const pending = await listPending(safeSlug)
        for (const item of pending) {
          const res = await fetch('/api/verify/check-in', {
            method: 'POST',
            headers: authHeaders(active.token),
            body: JSON.stringify({ ticketId: item.ticketId }),
          })
          if (res.ok || res.status === 409) {
            const data = await res.json().catch(() => ({}))
            if (data?.ticket) {
              await upsertTickets(safeSlug, [data.ticket])
              setTickets((prev) => {
                const map = new Map(prev.map((t) => [t.id, t]))
                map.set(data.ticket.id, data.ticket)
                return Array.from(map.values())
              })
            }
            await removePending(item.ticketId)
          }
        }
        await refreshPendingCount()
      } finally {
        flushingRef.current = false
      }
    },
    [refreshPendingCount, safeSlug]
  )

  const pullSync = useCallback(
    async (active: VerifierLocalSession) => {
      const since = active.syncedAt || ''
      const url = since
        ? `/api/verify/sync?since=${encodeURIComponent(since)}`
        : '/api/verify/sync'
      const res = await fetch(url, { headers: authHeaders(active.token) })
      if (!res.ok) return
      const data = await res.json()
      const rows = (data.tickets || []) as CachedVerifierTicket[]
      if (rows.length) {
        await upsertTickets(safeSlug, rows)
        setTickets((prev) => {
          const map = new Map(prev.map((t) => [t.id, t]))
          for (const row of rows) map.set(row.id, row)
          return Array.from(map.values())
        })
      }
      const nextSession = {
        ...active,
        syncedAt: data.syncedAt || new Date().toISOString(),
      }
      setSession(nextSession)
      sessionRef.current = nextSession
      await saveSession(nextSession)
    },
    [safeSlug]
  )

  const bootstrap = useCallback(
    async (active: VerifierLocalSession) => {
      setPhase('loading')
      setError(null)
      const res = await fetch('/api/verify/tickets', {
        headers: authHeaders(active.token),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to download tickets')
      }
      const data = await res.json()
      const rows = (data.tickets || []) as CachedVerifierTicket[]
      await replaceTickets(safeSlug, rows)
      applyTickets(rows)
      const nextSession: VerifierLocalSession = {
        ...active,
        eventName: data.event?.name || active.eventName,
        eventImageUrl: data.event?.imageUrl ?? active.eventImageUrl ?? null,
        eventVenue: data.event?.venue ?? active.eventVenue ?? null,
        syncedAt: data.syncedAt || new Date().toISOString(),
      }
      await saveSession(nextSession)
      setSession(nextSession)
      sessionRef.current = nextSession
      rememberSlug(safeSlug)
      await refreshPendingCount()
      setPhase('ready')
    },
    [applyTickets, refreshPendingCount, safeSlug]
  )

  // Standalone: if somehow on wrong path, bounce to last slug
  useEffect(() => {
    if (!isStandaloneDisplay()) return
    const path = window.location.pathname
    if (path.startsWith('/verify/')) {
      rememberSlug(safeSlug)
      return
    }
    const last = localStorage.getItem(LAST_SLUG_KEY)
    if (last) {
      window.location.replace(`/verify/${last}?source=pwa`)
    }
  }, [safeSlug])

  // Public event meta for lock-screen hero
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/verify/meta/${encodeURIComponent(safeSlug)}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setEventMeta({
          name: data.name,
          venue: data.venue,
          imageUrl: data.imageUrl,
          date: data.date,
        })
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [safeSlug])

  // Boot session
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        rememberSlug(safeSlug)
        const stored = await loadSession(safeSlug)
        if (cancelled) return
        if (stored && new Date(stored.expiresAt).getTime() > Date.now()) {
          setSession(stored)
          sessionRef.current = stored
          const cached = await loadTickets(safeSlug)
          if (cached.length) {
            applyTickets(cached)
            setPhase('ready')
            void bootstrap(stored).catch(() => undefined)
          } else {
            await bootstrap(stored)
          }
        } else {
          if (stored) await clearSession(safeSlug)
          setPhase('login')
        }
      } catch {
        if (!cancelled) setPhase('login')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyTickets, bootstrap, safeSlug])

  // Online / install / SW
  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      const active = sessionRef.current
      if (active) void flushPending(active)
    }
    const onOffline = () => setOnline(false)
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const onBip = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    const ua = navigator.userAgent || ''
    const isIos = /iphone|ipad|ipod/i.test(ua)
    setIosHint(isIos && !isStandaloneDisplay())

    if ('serviceWorker' in navigator) {
      void (async () => {
        try {
          // Retire legacy root-scoped SW that redirected the whole origin to /verify/...
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(
            registrations.map(async (registration) => {
              const scriptUrl =
                registration.active?.scriptURL ||
                registration.waiting?.scriptURL ||
                registration.installing?.scriptURL ||
                ''
              if (scriptUrl.endsWith('/verify-sw.js')) {
                await registration.unregister()
              }
            })
          )
          await navigator.serviceWorker.register('/verify/sw.js', { scope: '/verify/' })
          rememberSlug(safeSlug)
        } catch {
          // ignore
        }
      })()
    }

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VERIFIER_SW_RETIRED' && !isStandaloneDisplay()) {
        // Drop legacy controller without yanking door staff out of the PWA
        if (navigator.serviceWorker?.controller) {
          window.location.reload()
        }
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSwMessage)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onBip)
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
    }
  }, [flushPending, safeSlug])

  // Sync poll + realtime
  useEffect(() => {
    if (phase !== 'ready' || !session) return

    const interval = window.setInterval(() => {
      if (!navigator.onLine) return
      void pullSync(sessionRef.current!).catch(() => undefined)
      void flushPending(sessionRef.current!).catch(() => undefined)
    }, 4000)

    const channel = supabase
      .channel(`verify:${session.eventId}`)
      .on('broadcast', { event: 'ticket_update' }, (payload) => {
        const ticket = (payload.payload as { ticket?: CachedVerifierTicket })?.ticket
        if (!ticket?.id) return
        void upsertTickets(safeSlug, [ticket])
        setTickets((prev) => {
          const map = new Map(prev.map((t) => [t.id, t]))
          map.set(ticket.id, ticket)
          return Array.from(map.values())
        })
      })
      .subscribe()

    return () => {
      window.clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [flushPending, phase, pullSync, safeSlug, session])

  const playTone = (ok: boolean) => {
    if (ok) audioRef.current.playValid()
    else audioRef.current.playInvalid()
    // Valid: one pulse. Invalid: two distinct pulses.
    if (navigator.vibrate) {
      navigator.vibrate(ok ? 140 : [120, 90, 120])
    }
  }

  const showFlash = (next: Exclude<ScanFlash, null>) => {
    setFlash(next)
    window.setTimeout(() => {
      setFlash((current) => (current?.at === next.at ? null : current))
    }, 2200)
  }

  const handlePayload = useCallback(
    async (raw: string) => {
      const payload = normalizeQrValue(raw)
      if (!payload) return

      const now = Date.now()
      if (
        payload === lastScannedValueRef.current &&
        now - lastScannedAtRef.current < 2500
      ) {
        return
      }
      lastScannedValueRef.current = payload
      lastScannedAtRef.current = now

      const ticket =
        mapsRef.current.byQr.get(payload) ||
        mapsRef.current.byId.get(payload) ||
        null

      if (!ticket) {
        playTone(false)
        showFlash({
          kind: 'invalid',
          title: 'INVALID TICKET',
          subtitle: 'Not found for this event',
          at: now,
        })
        return
      }

      if (ticket.status === 'used') {
        playTone(false)
        showFlash({
          kind: 'used',
          title: 'ALREADY CHECKED IN',
          subtitle: ticket.checked_in_at
            ? new Date(ticket.checked_in_at).toLocaleTimeString()
            : ticket.ticket_type_name || undefined,
          at: now,
        })
        return
      }

      if (ticket.status === 'refunded') {
        playTone(false)
        showFlash({ kind: 'refunded', title: 'REFUNDED', at: now })
        return
      }

      if (ticket.status !== 'valid') {
        playTone(false)
        showFlash({
          kind: 'cancelled',
          title: ticket.status.toUpperCase(),
          at: now,
        })
        return
      }

      const optimistic: CachedVerifierTicket = {
        ...ticket,
        status: 'used',
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mapsRef.current.byId.set(optimistic.id, optimistic)
      mapsRef.current.byQr.set(optimistic.qr_code, optimistic)
      setTickets((prev) => prev.map((t) => (t.id === optimistic.id ? optimistic : t)))
      await upsertTickets(safeSlug, [optimistic])

      playTone(true)
      showFlash({
        kind: 'valid',
        title: 'VALID',
        subtitle: ticket.ticket_type_name || ticket.id.slice(0, 8),
        at: now,
      })

      const active = sessionRef.current
      if (!active) return

      if (!navigator.onLine) {
        await enqueuePending(safeSlug, {
          ticketId: ticket.id,
          qr_code: ticket.qr_code,
          scannedAt: new Date().toISOString(),
        })
        await refreshPendingCount()
        return
      }

      try {
        const res = await fetch('/api/verify/check-in', {
          method: 'POST',
          headers: authHeaders(active.token),
          body: JSON.stringify({ ticketId: ticket.id }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          if (data?.ticket) {
            await upsertTickets(safeSlug, [data.ticket])
            setTickets((prev) =>
              prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
            )
          }
          showFlash({
            kind: 'conflict',
            title: 'CONFLICT',
            subtitle: 'Already checked in elsewhere',
            at: Date.now(),
          })
          return
        }
        if (!res.ok) {
          await enqueuePending(safeSlug, {
            ticketId: ticket.id,
            qr_code: ticket.qr_code,
            scannedAt: new Date().toISOString(),
          })
          await refreshPendingCount()
          return
        }
        if (data?.ticket) {
          await upsertTickets(safeSlug, [data.ticket])
          setTickets((prev) =>
            prev.map((t) => (t.id === data.ticket.id ? data.ticket : t))
          )
        }
      } catch {
        await enqueuePending(safeSlug, {
          ticketId: ticket.id,
          qr_code: ticket.qr_code,
          scannedAt: new Date().toISOString(),
        })
        await refreshPendingCount()
      }
    },
    [refreshPendingCount, safeSlug]
  )

  const stopScanner = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraActive(false)
    cameraStartedRef.current = false
  }, [])

  const startScanner = useCallback(async () => {
    setError(null)
    void audioRef.current.unlock()
    try {
      if (!barcodeDetectorRef.current && 'BarcodeDetector' in window) {
        const Detector = (
          window as unknown as { BarcodeDetector: BarcodeDetectorConstructor }
        ).BarcodeDetector
        barcodeDetectorRef.current = new Detector({ formats: ['qr_code'] })
      }
      if (!jsQrDecoderRef.current) {
        const mod = await import('jsqr')
        jsQrDecoderRef.current = mod.default as JsQrDecoder
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      cameraStartedRef.current = true

      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState < 2) return
        const w = video.videoWidth
        const h = video.videoHeight
        if (!w || !h) return
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(video, 0, 0, w, h)

        let value = ''
        if (barcodeDetectorRef.current) {
          try {
            const codes = await barcodeDetectorRef.current.detect(canvas)
            value = codes[0]?.rawValue || ''
          } catch {
            // fall through
          }
        }
        if (!value && jsQrDecoderRef.current) {
          const image = ctx.getImageData(0, 0, w, h)
          const result = jsQrDecoderRef.current(image.data, image.width, image.height)
          value = result?.data || ''
        }
        if (value) void handlePayload(value)
      }, 250)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Camera unavailable'
      setError(message)
      setCameraActive(false)
      cameraStartedRef.current = false
    }
  }, [handlePayload])

  useEffect(() => () => stopScanner(), [stopScanner])

  // Auto-start camera when ready
  useEffect(() => {
    if (phase !== 'ready' || cameraStartedRef.current) return
    const t = window.setTimeout(() => {
      void startScanner()
    }, 350)
    return () => window.clearTimeout(t)
  }, [phase, startScanner])

  const onLogin = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    void audioRef.current.unlock()
    try {
      const res = await fetch('/api/verify/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: safeSlug,
          code: code.trim(),
          deviceName: deviceName.trim() || 'Door device',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Login failed')

      const next: VerifierLocalSession = {
        slug: safeSlug,
        token: data.token,
        eventId: data.event.id,
        eventName: data.event.name,
        eventImageUrl: data.event.imageUrl || null,
        eventVenue: data.event.venue || null,
        deviceName: data.session.deviceName,
        expiresAt: data.expiresAt,
        syncedAt: null,
      }
      await saveSession(next)
      setSession(next)
      sessionRef.current = next
      rememberSlug(safeSlug)
      await bootstrap(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setPhase('login')
    } finally {
      setBusy(false)
    }
  }

  const onInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      setInstallPrompt(null)
      return
    }
    setIosHint(true)
  }

  const onSwitchEvent = async (e: FormEvent) => {
    e.preventDefault()
    let next = switchSlug.trim().toLowerCase()
    try {
      if (next.includes('/verify/')) {
        const url = new URL(next, window.location.origin)
        next = url.pathname.split('/verify/')[1]?.split(/[?#]/)[0] || ''
      }
    } catch {
      // treat as raw slug
    }
    next = next.replace(/[^a-z0-9-]/g, '')
    if (!next) return
    await clearSession(safeSlug)
    rememberSlug(next)
    router.push(`/verify/${next}`)
  }

  const lockOut = async () => {
    stopScanner()
    await clearSession(safeSlug)
    setSession(null)
    sessionRef.current = null
    setTickets([])
    setPhase('login')
    setCode('')
  }

  if (phase === 'boot') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4b46a]" />
      </div>
    )
  }

  if (phase === 'login') {
    const showCenteredInstall = !isStandaloneDisplay()

    return (
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col overflow-hidden">
        <div className="absolute inset-0">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,#1e293b,transparent_55%),linear-gradient(160deg,#0a0e1a,#111827_50%,#0a0e1a)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#0a0e1a]/88 to-[#0a0e1a]" />
        </div>

        <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
          <div className="shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4b46a]">
              Door verifier
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white drop-shadow">
              {heroName}
            </h1>
            {heroVenue ? (
              <p className="mt-1 text-sm text-white/70">{heroVenue}</p>
            ) : (
              <p className="mt-1 text-sm text-white/60">
                {showCenteredInstall
                  ? 'Install this verifier on your phone for the door'
                  : 'Enter the organizer access code'}
              </p>
            )}
          </div>

          {showCenteredInstall ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-5">
              <div className="pointer-events-auto flex w-full max-w-xs flex-col items-center">
                <button
                  type="button"
                  onClick={() => void onInstall()}
                  className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#d4b46a] px-8 text-base font-semibold text-slate-950 shadow-[0_18px_50px_rgba(212,180,106,0.35)] transition active:scale-[0.98]"
                >
                  <Download className="h-5 w-5" />
                  Install verifier
                </button>
                {iosHint && !installPrompt ? (
                  <p className="mt-4 text-center text-sm text-white/70">
                    iPhone: tap Share, then{' '}
                    <span className="text-white">Add to Home Screen</span>
                  </p>
                ) : (
                  <p className="mt-4 text-center text-sm text-white/55">
                    Add to your home screen, then unlock with the access code below
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-auto shrink-0 pt-[min(42vh,18rem)]">
            <form
              onSubmit={onLogin}
              className="space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md"
            >
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Access code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-14 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-center text-2xl tracking-[0.45em] text-white outline-none focus:border-[#d4b46a]"
                  placeholder="••••••"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Device name</span>
                <input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none focus:border-[#d4b46a]"
                  placeholder="Gate A"
                />
              </label>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <button
                type="submit"
                disabled={busy || code.length < 6}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-900 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Start verifying'}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-white/55">
              <button
                type="button"
                onClick={() => setSwitchOpen((v) => !v)}
                className="underline-offset-2 hover:text-white hover:underline"
              >
                Switch event
              </button>
            </div>

            {switchOpen ? (
              <form
                onSubmit={(e) => void onSwitchEvent(e)}
                className="mt-3 flex gap-2 rounded-xl border border-white/10 bg-black/30 p-2"
              >
                <input
                  value={switchSlug}
                  onChange={(e) => setSwitchSlug(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-[#d4b46a]"
                  placeholder="Paste verifier link or slug"
                />
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-white px-3 text-sm font-semibold text-slate-900"
                >
                  Go
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : null}
        <div className="absolute inset-0 bg-[#0a0e1a]/80" />
        <div className="relative z-10">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#d4b46a]" />
          <p className="mt-3 text-lg font-medium">Preparing verifier…</p>
          <p className="mt-1 text-sm text-slate-400">{heroName}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col">
      <header className="border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ScanLine className="h-5 w-5 text-[#d4b46a]" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4b46a]">
                {online ? 'Live' : 'Offline'}
              </p>
              {online ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              )}
            </div>
            <h1 className="truncate text-base font-semibold leading-tight">{heroName}</h1>
            <p className="truncate text-xs text-slate-400">
              {checkedIn} checked in
              {session?.deviceName ? ` · ${session.deviceName}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {(installPrompt || iosHint) && (
              <button
                type="button"
                onClick={() => void onInstall()}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 px-2 text-[11px] font-medium"
              >
                <Download className="h-3 w-3" />
                Install
              </button>
            )}
            <button
              type="button"
              onClick={() => void lockOut()}
              className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      {pendingCount > 0 ? (
        <p className="px-4 pt-2 text-xs text-amber-300">
          {pendingCount} check-in{pendingCount === 1 ? '' : 's'} pending sync
        </p>
      ) : null}

      <div className="relative mx-4 mt-3 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full object-cover sm:aspect-[4/3]"
          muted
          playsInline
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(0,0,0,0.5)_100%)]" />
        {!cameraActive && !flash ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-6 text-center">
            <div>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-white/70" />
              <p className="mt-2 text-sm text-white/80">Starting camera…</p>
            </div>
          </div>
        ) : null}
        {flash ? (
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center px-6 text-center',
              flash.kind === 'valid' ? 'bg-emerald-600/92' : 'bg-rose-700/93'
            )}
          >
            {flash.kind === 'valid' ? (
              <CheckCircle2 className="mb-2 h-16 w-16" />
            ) : (
              <XCircle className="mb-2 h-16 w-16" />
            )}
            <p className="text-3xl font-bold tracking-wide">{flash.title}</p>
            {flash.subtitle ? (
              <p className="mt-1 text-sm text-white/90">{flash.subtitle}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => (cameraActive ? stopScanner() : void startScanner())}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-slate-900"
        >
          <ScanLine className="h-4 w-4" />
          {cameraActive ? 'Stop' : 'Scan'}
        </button>
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 text-sm font-medium"
        >
          <Keyboard className="h-4 w-4" />
          Manual
        </button>
      </div>

      {manualOpen ? (
        <form
          className="flex gap-2 px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault()
            void handlePayload(manualValue)
            setManualValue('')
          }}
        >
          <input
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-[#d4b46a]"
            placeholder="Paste QR payload"
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-[#d4b46a] px-4 text-sm font-semibold text-slate-950"
          >
            Check
          </button>
        </form>
      ) : null}

      {error ? <p className="px-4 pb-4 text-sm text-rose-400">{error}</p> : null}
    </div>
  )
}
