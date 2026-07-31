'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import {
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

  const isIconOnly = size === 'icon' || size === 'icon-sm' || !label

  useEffect(() => {
    setNativeShare(canUseNativeShare())
  }, [])

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
        className="w-44"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          disabled={busy}
          onSelect={() => {
            void handleCopyLink()
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? 'Copied' : 'Copy link'}</span>
        </DropdownMenuItem>
        {nativeShare ? (
          <DropdownMenuItem
            disabled={busy}
            onSelect={() => {
              void handleNativeShare()
            }}
          >
            <Share2 className="h-4 w-4" />
            <span>Share via…</span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
