'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/supabase-auth-context'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { Event, TicketType } from '@/lib/supabase-client'

const supabase = getSupabaseBrowserClient()
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertCircle,
  CheckCircle2,
  Ticket,
  Minus,
  Plus,
  ShieldCheck,
  Calendar,
  MapPin,
  Loader2,
} from 'lucide-react'
import { getEventCategoryLabel } from '@/lib/event-categories'
import { getStoredAffiliateCode } from '@/components/affiliates/affiliate-ref-capture'
import { cn } from '@/lib/utils'

interface TicketPurchaseDialogProps {
  event: Event
  ticketTypes?: TicketType[]
  onPurchaseComplete?: () => void
  onDialogClose?: () => void
  trigger?: React.ReactNode
}

export function TicketPurchaseDialog({
  event,
  ticketTypes,
  onPurchaseComplete,
  onDialogClose,
  trigger,
}: TicketPurchaseDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [ticketTypesState, setTicketTypesState] = useState<TicketType[]>(ticketTypes || [])
  const [sponsorsState, setSponsorsState] = useState<
    Array<{ id: string; name: string; logo_url?: string }>
  >([])
  const [selectedQuantities, setSelectedQuantities] = useState<{
    [ticketTypeId: string]: number
  }>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState('')
  const [hasFetchedSponsors, setHasFetchedSponsors] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')

  const currency = event.currency || 'USD'

  const resetTransientState = useCallback(() => {
    setSelectedQuantities({})
    setError('')
    setSuccess(false)
    setSuccessMessage('')
    setLoading(false)
    setGuestEmail('')
    setGuestName('')
  }, [])

  const handleDialogClose = () => {
    resetTransientState()
    setOpen(false)
    onDialogClose?.()
  }

  useEffect(() => {
    if (trigger === null) {
      setOpen(true)
    }
  }, [trigger])

  const fetchTicketTypes = useCallback(async () => {
    if ((ticketTypes && ticketTypes.length > 0) || ticketTypesState.length > 0) return
    setTicketsLoading(true)
    setTicketsError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', event.id)
        .order('order_index', { ascending: true })

      if (fetchError) throw fetchError
      setTicketTypesState(data || [])
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : 'Failed to load ticket types')
    } finally {
      setTicketsLoading(false)
    }
  }, [event.id, ticketTypes, ticketTypesState.length])

  const fetchSponsors = useCallback(async () => {
    if (sponsorsState.length > 0 || hasFetchedSponsors) return
    setHasFetchedSponsors(true)

    try {
      const { data, error: fetchError } = await supabase
        .from('sponsors')
        .select('id, name, logo_url')
        .eq('event_id', event.id)
        .order('order_index', { ascending: true })

      if (fetchError) throw fetchError
      setSponsorsState(data || [])
    } catch (err) {
      console.error('Failed to fetch sponsors:', err)
    }
  }, [event.id, hasFetchedSponsors, sponsorsState.length])

  useEffect(() => {
    if (!open) return
    void fetchTicketTypes()
    void fetchSponsors()
  }, [open, fetchTicketTypes, fetchSponsors])

  const formatEventDateTime = () => {
    const date = new Date(event.date)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatPrice = (price: number) => Math.round(price).toLocaleString('en-US')

  const getCurrencySymbol = (currencyCode: string) => {
    const currencies: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      AUD: 'A$',
      CAD: 'C$',
      CHF: 'Fr',
      CNY: '¥',
      INR: '₹',
      NGN: '₦',
      ZAR: 'R',
      KES: 'KSh',
      UGX: 'USh',
    }
    return currencies[currencyCode] || currencyCode
  }

  const currencySymbol = getCurrencySymbol(currency)

  const totalQuantity = Object.values(selectedQuantities).reduce((sum, qty) => sum + qty, 0)
  const totalPrice = ticketTypesState.reduce((sum, tt) => {
    const qty = selectedQuantities[tt.id] || 0
    return sum + qty * tt.price
  }, 0)
  const selectedLineItems = ticketTypesState
    .map((ticketType) => ({
      ticketType,
      qty: selectedQuantities[ticketType.id] || 0,
    }))
    .filter(({ qty }) => qty > 0)
  const totalAvailableTickets = ticketTypesState.reduce(
    (sum, tt) => sum + tt.available_quantity,
    0
  )

  const updateQuantity = (ticketTypeId: string, newQuantity: number) => {
    const ticketType = ticketTypesState.find((tt) => tt.id === ticketTypeId)
    if (!ticketType) return

    const clampedQuantity = Math.max(0, Math.min(newQuantity, ticketType.available_quantity))
    setSelectedQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: clampedQuantity,
    }))
    setError('')
  }

  const clearSelections = () => {
    setSelectedQuantities({})
    setError('')
    setSuccessMessage('')
  }

  const handlePurchase = async () => {
    setError('')
    setSuccess(false)
    setSuccessMessage('')
    setLoading(true)

    if (totalQuantity < 1) {
      setError('Please select at least 1 ticket')
      setLoading(false)
      return
    }

    if (!user) {
      const email = guestEmail.trim()
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!email || !emailPattern.test(email)) {
        setError('Please enter a valid email address for guest checkout.')
        setLoading(false)
        return
      }
    }

    for (const ticketType of ticketTypesState) {
      const selectedQty = selectedQuantities[ticketType.id] || 0
      if (selectedQty > ticketType.available_quantity) {
        setError(`Only ${ticketType.available_quantity} ${ticketType.name} tickets available`)
        setLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/payments/paytota/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          selectedQuantities,
          customerEmail: user?.email || guestEmail.trim(),
          customerName: guestName.trim() || undefined,
          affiliateCode: event.affiliates_enabled ? getStoredAffiliateCode() || undefined : undefined,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Failed to initialize payment')
        return
      }

      if (!payload.redirectUrl) {
        if (payload.freeCheckout) {
          setSuccess(true)
          setSuccessMessage(
            'Free ticket order confirmed successfully. Your tickets are now available.'
          )
          onPurchaseComplete?.()
          return
        }
        setError('No payment redirect URL was returned.')
        return
      }

      onPurchaseComplete?.()
      setSuccess(true)
      setSuccessMessage(
        payload.freeCheckout
          ? 'Free ticket order confirmed! Preparing your ticket download...'
          : 'Redirecting you to secure checkout...'
      )
      setTimeout(() => {
        window.location.href = payload.redirectUrl
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled =
    ticketTypesState.length === 0 ||
    ticketTypesState.every((tt) => tt.available_quantity === 0) ||
    event.status !== 'approved'

  const guestEmailValid =
    !user && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())
  const canCheckout =
    totalQuantity >= 1 && !loading && !success && (user || guestEmailValid)

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
        {/* Scrollable content — header scrolls away with the body */}
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

          <div className="space-y-5 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Secure checkout
            </span>
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
              {totalAvailableTickets} ticket{totalAvailableTickets === 1 ? '' : 's'} available
            </span>
          </div>

          {sponsorsState.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Sponsors
              </p>
              <div className="flex flex-wrap gap-2">
                {sponsorsState.map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                  >
                    {sponsor.logo_url ? (
                      <div className="relative h-6 w-6 overflow-hidden rounded">
                        <Image
                          src={sponsor.logo_url}
                          alt=""
                          fill
                          className="object-contain"
                          sizes="24px"
                        />
                      </div>
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                        {sponsor.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-700">{sponsor.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMessage || 'Purchase successful!'}</span>
            </div>
          ) : null}

          {!success ? (
            <>
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Ticket className="h-4 w-4 text-slate-400" />
                    Select tickets
                  </h3>
                  {totalQuantity > 0 ? (
                    <button
                      type="button"
                      onClick={clearSelections}
                      disabled={loading}
                      className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
                    >
                      Clear selection
                    </button>
                  ) : null}
                </div>

                <div className="space-y-2.5">
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-10 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading tickets…
                    </div>
                  ) : ticketsError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {ticketsError}
                    </div>
                  ) : ticketTypesState.length > 0 ? (
                    ticketTypesState.map((ticketType) => {
                      const selectedQty = selectedQuantities[ticketType.id] || 0
                      const isSelected = selectedQty > 0
                      const soldOut = ticketType.available_quantity === 0

                      return (
                        <div
                          key={ticketType.id}
                          className={cn(
                            'rounded-xl border bg-white p-4 transition-[border-color,box-shadow] duration-200',
                            isSelected
                              ? 'border-slate-900 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300',
                            soldOut && 'opacity-70'
                          )}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-semibold text-slate-900">{ticketType.name}</h4>
                                {soldOut ? (
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Sold out
                                  </span>
                                ) : null}
                              </div>
                              {ticketType.description ? (
                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                  {ticketType.description}
                                </p>
                              ) : null}
                              {!soldOut ? (
                                <p className="mt-1.5 text-xs text-slate-400">
                                  <span className="font-medium text-slate-600">
                                    {ticketType.available_quantity}
                                  </span>{' '}
                                  remaining
                                  {ticketType.available_quantity < 10 ? (
                                    <span className="text-amber-700"> · Limited</span>
                                  ) : null}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                              <p className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                                {currencySymbol}
                                {formatPrice(ticketType.price)}
                              </p>

                              {!soldOut ? (
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 border-slate-200 p-0 text-slate-700 hover:bg-slate-50"
                                    onClick={() =>
                                      updateQuantity(ticketType.id, selectedQty - 1)
                                    }
                                    disabled={loading || selectedQty <= 0}
                                    aria-label={`Decrease ${ticketType.name} quantity`}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                  <div
                                    className="w-10 rounded-md border border-slate-200 bg-slate-50 py-1 text-center text-sm font-semibold text-slate-900"
                                    aria-live="polite"
                                  >
                                    {selectedQty}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 border-slate-200 p-0 text-slate-700 hover:bg-slate-50"
                                    onClick={() =>
                                      updateQuantity(ticketType.id, selectedQty + 1)
                                    }
                                    disabled={
                                      loading ||
                                      selectedQty >= ticketType.available_quantity
                                    }
                                    aria-label={`Increase ${ticketType.name} quantity`}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      No ticket types available for this event.
                    </div>
                  )}
                </div>
              </div>

              {totalQuantity > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Order summary</h4>
                  <div className="mt-3 space-y-2">
                    {selectedLineItems.map(({ ticketType, qty }) => (
                      <div
                        key={ticketType.id}
                        className="flex justify-between text-sm text-slate-600"
                      >
                        <span>
                          {ticketType.name} × {qty}
                        </span>
                        <span className="font-medium text-slate-900">
                          {currencySymbol}
                          {formatPrice(ticketType.price * qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">
                    <span className="text-sm font-semibold text-slate-900">
                      Total ({totalQuantity} ticket{totalQuantity === 1 ? '' : 's'})
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {currencySymbol}
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>
              ) : null}

              {!user ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Guest checkout</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Use the same email when you create an account later to sync these tickets
                    to your profile.
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="guest-email"
                        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                      >
                        Email *
                      </label>
                      <Input
                        id="guest-email"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="you@example.com"
                        disabled={loading}
                        className="h-10 border-slate-200 bg-white"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="guest-name"
                        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                      >
                        Full name (optional)
                      </label>
                      <Input
                        id="guest-name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Jane Doe"
                        disabled={loading}
                        className="h-10 border-slate-200 bg-white"
                        autoComplete="name"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Total
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                {currencySymbol}
                {formatPrice(totalPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Tickets
              </p>
              <p className="mt-0.5 text-lg font-semibold text-slate-900">{totalQuantity}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
              onClick={handleDialogClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 flex-[1.4] bg-slate-900 font-semibold text-white shadow-none hover:bg-slate-800 disabled:bg-slate-300"
              onClick={handlePurchase}
              disabled={!canCheckout}
              aria-label="Proceed to secure payment"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {totalPrice <= 0 ? 'Completing…' : 'Redirecting…'}
                </span>
              ) : success ? (
                totalPrice <= 0 ? 'Order completed' : 'Redirecting…'
              ) : totalPrice <= 0 ? (
                'Complete free checkout'
              ) : (
                'Pay'
              )}
            </Button>
          </div>
          <p className="mt-2.5 text-center text-[11px] leading-relaxed text-slate-400">
            {totalPrice <= 0
              ? 'By continuing, you confirm your ticket selection and contact details.'
              : 'By continuing, you agree to complete payment on our secure platform.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
