'use client'

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
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

export function VerifierSharePanel({
  eventId,
  eventName,
  className,
}: {
  eventId: string
  eventName: string
  className?: string
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
        const qr = await QRCode.toDataURL(data.url, { width: 220, margin: 1 })
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
        const qr = await QRCode.toDataURL(data.url, { width: 220, margin: 1 })
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
    window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500)
  }

  const copyText = async (text: string, kind: 'link' | 'code' | 'all') => {
    await navigator.clipboard.writeText(text)
    flashCopied(kind)
  }

  const share = async () => {
    if (!info?.url) return
    const codeLine = revealedCode ? `\nAccess code: ${revealedCode}` : info.hasCode ? '' : ''
    const text = `Ticket95 door verifier for ${eventName}\n${info.url}${codeLine}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Verify: ${eventName}`,
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
      <div className={cn('flex items-center gap-2 rounded-xl border border-border/70 p-4 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparing shareable verifier…
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl border border-border/70 bg-card p-4 shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7B2F]">
            Share with door staff
          </p>
          <h3 className="mt-1 text-base font-semibold tracking-tight">Installable verifier</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff open the link, enter the code, then Install for one-tap scanning. No login required.
          </p>
        </div>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Verifier link QR"
            className="h-24 w-24 rounded-lg border border-border/60 bg-white p-1"
          />
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Link</p>
          <p className="mt-0.5 break-all text-sm font-medium">{info?.url || '—'}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Access code
            </p>
            {revealedCode ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowCode((v) => !v)}
              >
                {showCode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showCode ? 'Hide' : 'Show'}
              </button>
            ) : null}
          </div>
          <p className="mt-0.5 font-mono text-xl tracking-[0.25em]">
            {revealedCode
              ? showCode
                ? revealedCode
                : '••••••'
              : info?.hasCode
                ? 'Code set (generate again to reveal)'
                : 'Not set yet'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" className="rounded-xl" onClick={() => void share()} disabled={!info?.url}>
          <Share2 className="mr-1.5 h-4 w-4" />
          {copied === 'all' ? 'Copied' : 'Share verifier'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => info?.url && void copyText(info.url, 'link')}
          disabled={!info?.url}
        >
          <Copy className="mr-1.5 h-4 w-4" />
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </Button>
        {revealedCode ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => void copyText(revealedCode, 'code')}
          >
            <Copy className="mr-1.5 h-4 w-4" />
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => void rotate()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}
          {info?.hasCode || revealedCode ? 'Rotate code' : 'Generate code'}
        </Button>
      </div>
    </div>
  )
}
