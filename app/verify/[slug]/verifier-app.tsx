'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export function VerifierApp({ slug }: { slug: string }) {
  const safeSlug = slug.toLowerCase().trim()

  const [phase, setPhase] = useState<'boot' | 'login' | 'loading' | 'ready'>('boot')
  const [code, setCode] = useState('')
  const [deviceName, setDeviceName] = useState('Door device')
  const [session, setSession] = useState<VerifierLocalSession | null>(null)
  const [tickets, setTickets] = useState<CachedVerifierTicket[]>([])
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

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    mapsRef.current = buildTicketMaps(tickets)
  }, [tickets])

  const stats = useMemo(() => {
    const checkedIn = tickets.filter((t) => t.status === 'used').length
    const remaining = tickets.filter((t) => t.status === 'valid').length
    return { loaded: tickets.length, checkedIn, remaining }
  }, [tickets])

  const applyTickets = useCallback((next: CachedVerifierTicket[]) => {
    setTickets(next)
    mapsRef.current = buildTicketMaps(next)
  }, [])

  const refreshPendingCount = useCallback(async () => {
    const pending = await listPending(safeSlug)
    setPendingCount(pending.length)
  }, [safeSlug])

  const flushPending = useCallback(async (active: VerifierLocalSession) => {
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
  }, [refreshPendingCount, safeSlug])

  const pullSync = useCallback(async (active: VerifierLocalSession) => {
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
    const nextSession = { ...active, syncedAt: data.syncedAt || new Date().toISOString() }
    setSession(nextSession)
    sessionRef.current = nextSession
    await saveSession(nextSession)
  }, [safeSlug])

  const bootstrap = useCallback(async (active: VerifierLocalSession) => {
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
      syncedAt: data.syncedAt || new Date().toISOString(),
    }
    await saveSession(nextSession)
    setSession(nextSession)
    sessionRef.current = nextSession
    await refreshPendingCount()
    setPhase('ready')
  }, [applyTickets, refreshPendingCount, safeSlug])

  // Boot: restore session or show login
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
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
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari
      navigator.standalone === true
    setIosHint(isIos && !isStandalone)

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/verify-sw.js').catch(() => undefined)
    }

    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = `/api/verify/manifest/${encodeURIComponent(safeSlug)}`
    document.head.appendChild(link)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onBip)
      link.remove()
    }
  }, [flushPending, safeSlug])

  // Sync poll + realtime broadcast
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
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = ok ? 880 : 220
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      window.setTimeout(() => {
        osc.stop()
        void ctx.close()
      }, 120)
    } catch {
      // ignore
    }
    if (navigator.vibrate) navigator.vibrate(ok ? 40 : [40, 40, 40])
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

      // Optimistic local mark
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
  }, [])

  const startScanner = useCallback(async () => {
    setError(null)
    try {
      if (!barcodeDetectorRef.current && 'BarcodeDetector' in window) {
        const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorConstructor })
          .BarcodeDetector
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
            // fall through to jsqr
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
    }
  }, [handlePayload])

  useEffect(() => () => stopScanner(), [stopScanner])

  const onLogin = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
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
        deviceName: data.session.deviceName,
        expiresAt: data.expiresAt,
        syncedAt: null,
      }
      await saveSession(next)
      setSession(next)
      sessionRef.current = next
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

  if (phase === 'boot') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4b46a]" />
      </div>
    )
  }

  if (phase === 'login') {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5 py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4b46a]">
          Ticket95 Verifier
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Enter access code</h1>
        <p className="mt-2 text-sm text-slate-400">
          Use the code from the organizer. No Ticket95 account needed.
        </p>
        <form onSubmit={onLogin} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-400">6-digit code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-center text-2xl tracking-[0.4em] text-white outline-none focus:border-[#d4b46a]"
              placeholder="••••••"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Device name</span>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-[#d4b46a]"
              placeholder="Gate A"
            />
          </label>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || code.length < 6}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Unlock verifier'}
          </button>
        </form>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4b46a]" />
        <p className="text-lg font-medium">Downloading tickets…</p>
        <p className="text-sm text-slate-400">One-time load, then scans stay local and fast.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col">
      <header className="border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4b46a]">
              {online ? 'Connected' : 'Offline'}
              {online ? ' · Realtime' : ' · Queueing'}
            </p>
            <h1 className="truncate text-lg font-semibold leading-tight">
              {session?.eventName || 'Event'}
            </h1>
            <p className="truncate text-xs text-slate-400">{session?.deviceName}</p>
          </div>
          <div className="flex items-center gap-2">
            {online ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-400" />
            )}
            {(installPrompt || iosHint) && (
              <button
                type="button"
                onClick={() => void onInstall()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
            )}
          </div>
        </div>
        {iosHint && !installPrompt ? (
          <p className="mt-2 text-[11px] text-slate-400">
            iPhone: Share → Add to Home Screen for one-tap open.
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <Stat label="Loaded" value={stats.loaded} />
        <Stat label="Checked in" value={stats.checkedIn} />
        <Stat label="Remaining" value={stats.remaining} />
      </div>

      {pendingCount > 0 ? (
        <p className="px-4 pb-2 text-xs text-amber-300">
          {pendingCount} check-in{pendingCount === 1 ? '' : 's'} pending sync
        </p>
      ) : null}

      <div className="relative mx-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full object-cover sm:aspect-[4/3]"
          muted
          playsInline
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.45)_100%)]" />
        {flash ? (
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center px-6 text-center',
              flash.kind === 'valid' ? 'bg-emerald-600/90' : 'bg-rose-700/92'
            )}
          >
            {flash.kind === 'valid' ? (
              <CheckCircle2 className="mb-2 h-14 w-14" />
            ) : (
              <XCircle className="mb-2 h-14 w-14" />
            )}
            <p className="text-3xl font-bold tracking-wide">{flash.title}</p>
            {flash.subtitle ? (
              <p className="mt-1 text-sm text-white/90">{flash.subtitle}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 px-4">
        <button
          type="button"
          onClick={() => (cameraActive ? stopScanner() : void startScanner())}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-slate-900"
        >
          <ScanLine className="h-4 w-4" />
          {cameraActive ? 'Stop camera' : 'Scan QR'}
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
          className="mt-3 flex gap-2 px-4"
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

      {error ? <p className="px-4 pt-3 text-sm text-rose-400">{error}</p> : null}

      <div className="mt-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-[11px] text-slate-500">
        Scans resolve from this device. Sync keeps every gate aligned.
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
