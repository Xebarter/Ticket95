'use client'

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Share2,
} from 'lucide-react'

type AccessInfo = {
  eventId: string
  eventName: string
  slug: string
  url: string
  hasCode: boolean
  rotatedAt?: string | null
  code?: string
}

function shortVerifierHost(url: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/$/, '')
    return `${parsed.host}${path}`
  } catch {
    return url
  }
}

export function VerifierSharePanel({
  eventId,
  eventName,
  className,
  embedded = false,
}: {
  eventId: string
  eventName: string
  className?: string
  /** Flat layout when already inside a parent surface — no nested boxes. */
  embedded?: boolean
}) {
  const [info, setInfo] = useState<AccessInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revealedCode, setRevealedCode] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(true)
  const [copied, setCopied] = useState<'link' | 'code' | 'all' | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/profile/verify/access?eventId=${encodeURIComponent(eventId)}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load verifier access')
      setInfo(data)
      if (data.url) {
        const qr = await QRCode.toDataURL(data.url, {
          width: 240,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        })
        setQrDataUrl(qr)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const rotate = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/verify/access', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to generate code')
      setInfo(data)
      setRevealedCode(data.code)
      setShowCode(true)
      if (data.url) {
        const qr = await QRCode.toDataURL(data.url, {
          width: 240,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        })
        setQrDataUrl(qr)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setBusy(false)
    }
  }

  const flashCopied = (kind: 'link' | 'code' | 'all') => {
    setCopied(kind)
    window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1600)
  }

  const copyText = async (text: string, kind: 'link' | 'code' | 'all') => {
    await navigator.clipboard.writeText(text)
    flashCopied(kind)
  }

  const share = async () => {
    if (!info?.url) return
    const codeLine = revealedCode ? `\nAccess code: ${revealedCode}` : ''
    const text = `Door verifier — ${eventName}\n${info.url}${codeLine}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${eventName} verifier`,
          text,
          url: info.url,
        })
        return
      } catch {
        // fall through to copy
      }
    }
    await copyText(text, 'all')
  }

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2.5 py-3 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing staff access…
      </div>
    )
  }

  const hasRevealed = Boolean(revealedCode)
  const needsGenerate = !info?.hasCode && !hasRevealed
  const codeReady = info?.hasCode || hasRevealed

  return (
    <div
      className={cn(
        embedded ? 'space-y-5' : 'space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A7B2F]">
            Staff access
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Installable verifier for door staff. No Ticket95 login required.
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
            codeReady
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-amber-500/10 text-amber-800'
          )}
        >
          {codeReady ? 'Active' : 'Setup'}
        </span>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Access code
            </p>
            {hasRevealed ? (
              <button
                type="button"
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowCode((v) => !v)}
              >
                <span className="inline-flex items-center gap-1">
                  {showCode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showCode ? 'Hide' : 'Show'}
                </span>
              </button>
            ) : null}
          </div>

          {needsGenerate ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Create a one-time code to authorize door devices.
            </p>
          ) : hasRevealed ? (
            <p className="mt-2 font-mono text-[2rem] font-medium leading-none tracking-[0.32em] text-foreground tabular-nums">
              {showCode ? revealedCode : '······'}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              A code is already active. Generate again only if you need to reveal or replace it.
            </p>
          )}
        </div>

        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Verifier QR code"
            className="h-16 w-16 shrink-0 ring-1 ring-border/80 sm:h-[4.5rem] sm:w-[4.5rem]"
          />
        ) : null}
      </div>

      {info?.url ? (
        <div className="flex items-center gap-3 border-y border-border/50 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Verifier link
            </p>
            <p className="mt-1 truncate text-[13px] text-foreground/85">
              {shortVerifierHost(info.url)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyText(info.url, 'link')}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#9A7B2F] transition-colors hover:bg-[#9A7B2F]/10"
          >
            {copied === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === 'link' ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}

      <div className="space-y-2">
        {needsGenerate || !hasRevealed ? (
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-[#9A7B2F] text-sm font-medium tracking-wide text-white hover:bg-[#8a6e2a]"
            onClick={() => void rotate()}
            disabled={busy || !info?.url}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {info?.hasCode ? 'Reveal new code' : 'Generate access code'}
          </Button>
        ) : null}

        <Button
          type="button"
          variant={needsGenerate || !hasRevealed ? 'outline' : 'default'}
          className={cn(
            'h-11 w-full rounded-lg text-sm font-medium tracking-wide',
            !(needsGenerate || !hasRevealed) &&
              'bg-[#9A7B2F] text-white hover:bg-[#8a6e2a]'
          )}
          onClick={() => void share()}
          disabled={!info?.url}
        >
          <Share2 className="mr-2 h-4 w-4" />
          {copied === 'all' ? 'Copied' : 'Share with staff'}
        </Button>

        {hasRevealed ? (
          <div className="flex items-center justify-center gap-5 pt-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => void copyText(revealedCode!, 'code')}
            >
              {copied === 'code' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied === 'code' ? 'Code copied' : 'Copy code'}
            </button>
            <span className="h-3 w-px bg-border" aria-hidden />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              onClick={() => void rotate()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Rotate code
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
