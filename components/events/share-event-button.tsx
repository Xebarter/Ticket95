'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { shareEvent } from '@/lib/share-event'
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

  const isIconOnly = size === 'icon' || size === 'icon-sm' || !label

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    setBusy(true)
    try {
      const result = await shareEvent({
        eventId,
        eventName,
        ref: referralCode,
      })

      if (result === 'copied') {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
        toast({
          title: 'Link copied',
          description: 'Event link copied to clipboard — paste it anywhere to share.',
        })
      } else if (result === 'failed') {
        toast({
          title: 'Could not share',
          description: 'Copy the event URL from the address bar instead.',
          variant: 'destructive',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={(e) => void handleShare(e)}
      disabled={busy}
      aria-label={copied ? 'Link copied' : `Share ${eventName}`}
      title={copied ? 'Link copied' : 'Share event'}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {!isIconOnly ? <span>{copied ? 'Copied' : 'Share'}</span> : null}
    </Button>
  )
}
