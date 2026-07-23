'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar, MapPin } from 'lucide-react'
import { getEventCategoryLabel } from '@/lib/event-categories'
import { formatEventDateRange } from '@/lib/event-display'
import type { Event, TicketType } from '@/lib/supabase-client'
import {
  TicketPurchaseCheckoutBar,
  TicketPurchaseFormBody,
  useTicketPurchase,
} from '@/components/events/ticket-purchase-form'

interface TicketPurchaseDialogProps {
  event: Event
  ticketTypes?: TicketType[]
  onPurchaseComplete?: () => void
  onDialogClose?: () => void
  trigger?: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TicketPurchaseDialog({
  event,
  ticketTypes,
  onPurchaseComplete,
  onDialogClose,
  trigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: TicketPurchaseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }

  const purchase = useTicketPurchase({
    event,
    ticketTypes,
    onPurchaseComplete,
    enabled: open,
  })

  const handleDialogClose = () => {
    purchase.resetTransientState()
    setOpen(false)
    onDialogClose?.()
  }

  useEffect(() => {
    if (trigger === null) {
      setOpen(true)
    }
  }, [trigger])

  useEffect(() => {
    if (defaultOpen && !isControlled) {
      setInternalOpen(true)
    }
  }, [defaultOpen, isControlled])

  const formatEventDateTime = () => formatEventDateRange(event, 'short')

  const isDisabled = purchase.isSoldOut

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleDialogClose()
        } else {
          setOpen(true)
        }
      }}
    >
      {trigger ? (
        isDisabled ? (
          <div className="cursor-not-allowed opacity-60">{trigger}</div>
        ) : (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        )
      ) : null}

      <DialogContent
        className="flex max-h-[min(92vh,880px)] w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:max-w-2xl [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-white/95 [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:text-slate-700 [&_[data-slot=dialog-close]]:shadow-sm [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:opacity-100"
        showCloseButton
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-slate-100">
            {event.image_url ? (
              <div className="relative h-36 w-full bg-slate-100 sm:h-44">
                <Image
                  src={event.image_url}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 672px) 100vw, 672px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  {event.category ? (
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
                      {getEventCategoryLabel(event.category)}
                    </p>
                  ) : null}
                  <DialogHeader className="space-y-1 text-left">
                    <DialogTitle className="line-clamp-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {event.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-white/80">
                      Hosted by {event.organizer_name}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>
            ) : (
              <div className="px-5 py-5">
                {event.category ? (
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A7B2F]">
                    {getEventCategoryLabel(event.category)}
                  </p>
                ) : null}
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                    {event.name}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-500">
                    Hosted by {event.organizer_name}
                  </DialogDescription>
                </DialogHeader>
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatEventDateTime()}
              </span>
              <span className="inline-flex min-w-0 items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{event.venue}</span>
              </span>
            </div>
          </div>

          <TicketPurchaseFormBody purchase={purchase} />
        </div>

        <TicketPurchaseCheckoutBar
          purchase={purchase}
          onCancel={handleDialogClose}
          showCancel
        />
      </DialogContent>
    </Dialog>
  )
}
