'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Link2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import {
  buildEventShareUrl,
  canUseNativeShare,
  copyEventLink,
  shareEventNative,
} from '@/lib/share-event'
import { cn } from '@/lib/utils'

type ShareEventButtonProps = {
  eventId: string
  eventName: string
  /** Affiliate referral code to preserve on the shared URL. */
  referralCode?: string | null
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm'
  /** Show "Share" label next to the icon (ignored for icon sizes). */
  label?: boolean
  className?: string
}

function ShareActionIcon({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode
  tone?: 'slate' | 'gold' | 'success'
}) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
        tone === 'gold' && 'border-[#9A7B2F]/20 bg-[#9A7B2F]/10 text-[#7a6224]',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'slate' && 'border-slate-200 bg-slate-50 text-slate-600'
      )}
    >
      {children}
    </span>
  )
}

export function ShareEventButton({
  eventId,
  eventName,
  referralCode,
  variant = 'outline',
  size = 'sm',
  label = true,
  className,
}: ShareEventButtonProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [nativeShare, setNativeShare] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(`/events/${eventId}`)

  const isIconOnly = size === 'icon' || size === 'icon-sm' || !label

  useEffect(() => {
    setNativeShare(canUseNativeShare())
    setPreviewUrl(
      buildEventShareUrl(eventId, {
        ref: referralCode,
      })
    )
  }, [eventId, referralCode])

  const shareInput = {
    eventId,
    eventName,
    ref: referralCode,
  }

  const handleCopyLink = async () => {
    if (busy) return
    setBusy(true)
    try {
      const ok = await copyEventLink(shareInput)
      if (ok) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
        toast({
          title: 'Link copied',
          description: 'Event link copied to clipboard — paste it anywhere to share.',
        })
      } else {
        toast({
          title: 'Could not copy link',
          description: 'Copy the event URL from the address bar instead.',
          variant: 'destructive',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const handleNativeShare = async () => {
    if (busy) return
    setBusy(true)
    try {
      const result = await shareEventNative(shareInput)
      if (result === 'failed') {
        toast({
          title: 'Could not share',
          description: 'Try Copy link instead.',
          variant: 'destructive',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  const displayPath = (() => {
    try {
      const parsed = new URL(previewUrl, 'https://ticket95.com')
      return `${parsed.host}${parsed.pathname}${parsed.search}`
    } catch {
      return previewUrl
    }
  })()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn(className)}
          disabled={busy}
          aria-label={copied ? 'Link copied' : `Share ${eventName}`}
          title={copied ? 'Link copied' : 'Share event'}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {!isIconOnly ? <span>{copied ? 'Copied' : 'Share'}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(18.5rem,calc(100vw-1.5rem))] rounded-xl border-slate-200/80 p-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="rounded-lg bg-slate-50/90 px-2.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Share event
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{eventName}</p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
            <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{displayPath}</span>
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem
          disabled={busy}
          className="cursor-pointer gap-3 rounded-lg px-2 py-2.5"
          onSelect={() => {
            void handleCopyLink()
          }}
        >
          <ShareActionIcon tone={copied ? 'success' : 'slate'}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </ShareActionIcon>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              {copied ? 'Link copied' : 'Copy link'}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">
              {copied ? 'Ready to paste anywhere' : 'Copy the event URL to clipboard'}
            </span>
          </span>
        </DropdownMenuItem>

        {nativeShare ? (
          <DropdownMenuItem
            disabled={busy}
            className="cursor-pointer gap-3 rounded-lg px-2 py-2.5"
            onSelect={() => {
              void handleNativeShare()
            }}
          >
            <ShareActionIcon tone="gold">
              <Share2 className="h-4 w-4" />
            </ShareActionIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">Share via…</span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                WhatsApp, Messages, and more
              </span>
            </span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
