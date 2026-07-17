'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase-auth-context';
import { supabase } from '@/lib/supabase-client';
import type { Event, TicketType } from '@/lib/supabase-client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, ShoppingCart, CheckCircle2, Ticket, Minus, Plus, ShieldCheck, Calendar, MapPin } from 'lucide-react';

interface TicketPurchaseDialogProps {
  event: Event;
  /**
   * If the parent already knows the ticket types (e.g. admin dashboard), it can
   * pass them in.  On the public landing page we usually don't so the dialog
   * will fetch them when opened.
   */
  ticketTypes?: TicketType[];
  onPurchaseComplete?: () => void;
  onDialogClose?: () => void;
  trigger?: React.ReactNode;
}


export function TicketPurchaseDialog({ event, ticketTypes, onPurchaseComplete, onDialogClose, trigger }: TicketPurchaseDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [ticketTypesState, setTicketTypesState] = useState<TicketType[]>(ticketTypes || []);
  const [sponsorsState, setSponsorsState] = useState<Array<{ id: string; name: string; logo_url?: string }>>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<{ [ticketTypeId: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [typingLoading, setTypingLoading] = useState(false);
  const [typingError, setTypingError] = useState('');
  const [hasFetchedSponsors, setHasFetchedSponsors] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');

  const currency = event.currency || 'USD';

  const handleDialogClose = () => {
    // Reset all state so each open starts clean.
    setSelectedQuantities({});
    setError('');
    setSuccess(false);
    setSuccessMessage('');
    setLoading(false);
    setOpen(false);
    onDialogClose?.();
  };

  // Auto-open dialog when trigger is null (programmatic usage)
  useEffect(() => {
    if (trigger === null) {
      setOpen(true);
    }
  }, [trigger]);

  // Auto-fetch ticket types and sponsors when dialog is programmatically opened (trigger={null})
  useEffect(() => {
    // Only fetch if we don't already have ticket types and the dialog should be open
    if (trigger === null && open) {
      // Check if we need to fetch ticket types (don't have data yet)
      const hasTicketData = ticketTypes && ticketTypes.length > 0;
      if (!hasTicketData && ticketTypesState.length === 0) {
        fetchTicketTypes();
      }
      // Check if we need to fetch sponsors (don't have data yet and haven't fetched)
      if (!hasFetchedSponsors && sponsorsState.length === 0) {
        fetchSponsors();
      }
    }
  }, [open, trigger, hasFetchedSponsors]);

  // fetch ticket types if we don't already have them when the dialog opens
  const fetchTicketTypes = async () => {
    if (ticketTypesState.length > 0) return; // already have data
    setTypingLoading(true);
    setTypingError('');

    try {
      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', event.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setTicketTypesState(data || []);
    } catch (err) {
      setTypingError(err instanceof Error ? err.message : 'Failed to load ticket types');
    } finally {
      setTypingLoading(false);
    }
  };

  // fetch sponsors if we don't already have them when the dialog opens
  const fetchSponsors = async () => {
    if (sponsorsState.length > 0 || hasFetchedSponsors) return; // already have data or already fetched
    setHasFetchedSponsors(true);
    setTypingLoading(true);
    setTypingError('');

    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('id, name, logo_url')
        .eq('event_id', event.id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setSponsorsState(data || []);
    } catch (err) {
      console.error('Failed to fetch sponsors:', err);
      // Don't show error to user, sponsors are optional
    } finally {
      setTypingLoading(false);
    }
  };

  // Format event date and time
  const formatEventDateTime = () => {
    const date = new Date(event.date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleString('en-US', options);
  };

  // Format price with commas and no decimal places
  const formatPrice = (price: number) => {
    return Math.round(price).toLocaleString('en-US');
  };

  // Get modern, professional color scheme for ticket type based on name/tier
  const getTicketTypeColor = (ticketTypeName: string) => {
    const normalizedName = ticketTypeName.toLowerCase();

    // Premium/VIP tiers
    if (normalizedName.includes('vip') || normalizedName.includes('premium')) {
      return {
        bg: 'from-amber-50 to-orange-50',
        border: 'border-amber-200/60',
        icon: 'bg-amber-100',
        iconText: 'text-amber-600',
        accent: 'text-amber-700',
        badge: 'bg-amber-500',
        gradient: 'from-amber-500/10 to-orange-500/10'
      };
    }

    // Early Bird tier
    if (normalizedName.includes('early') || normalizedName.includes('bird')) {
      return {
        bg: 'from-emerald-50 to-teal-50',
        border: 'border-emerald-200/60',
        icon: 'bg-emerald-100',
        iconText: 'text-emerald-600',
        accent: 'text-emerald-700',
        badge: 'bg-emerald-500',
        gradient: 'from-emerald-500/10 to-teal-500/10'
      };
    }

    // Standard/Regular tier
    if (normalizedName.includes('standard') || normalizedName.includes('regular') || normalizedName.includes('general')) {
      return {
        bg: 'from-blue-50 to-indigo-50',
        border: 'border-blue-200/60',
        icon: 'bg-blue-100',
        iconText: 'text-blue-600',
        accent: 'text-blue-700',
        badge: 'bg-blue-500',
        gradient: 'from-blue-500/10 to-indigo-500/10'
      };
    }

    // Student tier
    if (normalizedName.includes('student')) {
      return {
        bg: 'from-purple-50 to-fuchsia-50',
        border: 'border-purple-200/60',
        icon: 'bg-purple-100',
        iconText: 'text-purple-600',
        accent: 'text-purple-700',
        badge: 'bg-purple-500',
        gradient: 'from-purple-500/10 to-fuchsia-500/10'
      };
    }

    // Group tier
    if (normalizedName.includes('group') || normalizedName.includes('family')) {
      return {
        bg: 'from-rose-50 to-pink-50',
        border: 'border-rose-200/60',
        icon: 'bg-rose-100',
        iconText: 'text-rose-600',
        accent: 'text-rose-700',
        badge: 'bg-rose-500',
        gradient: 'from-rose-500/10 to-pink-500/10'
      };
    }

    // Default color scheme for any other ticket type
    return {
      bg: 'from-slate-50 to-gray-50',
      border: 'border-slate-200/60',
      icon: 'bg-slate-100',
      iconText: 'text-slate-600',
      accent: 'text-slate-700',
      badge: 'bg-slate-500',
      gradient: 'from-slate-500/10 to-gray-500/10'
    };
  };

  // Get currency symbol
  const getCurrencySymbol = (currencyCode: string) => {
    const currencies: { [key: string]: string } = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
      'CHF': 'Fr', 'CNY': '¥', 'INR': '₹', 'NGN': '₦', 'ZAR': 'R', 'KES': 'KSh', 'UGX': 'USh'
    };
    return currencies[currencyCode] || currencyCode;
  };

  const currencySymbol = getCurrencySymbol(currency);

  // Calculate totals
  const totalQuantity = Object.values(selectedQuantities).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = ticketTypesState.reduce((sum, tt) => {
    const qty = selectedQuantities[tt.id] || 0;
    return sum + (qty * tt.price);
  }, 0);
  const selectedLineItems = ticketTypesState
    .map((ticketType) => ({
      ticketType,
      qty: selectedQuantities[ticketType.id] || 0,
    }))
    .filter(({ qty }) => qty > 0);
  const totalAvailableTickets = ticketTypesState.reduce((sum, tt) => sum + tt.available_quantity, 0);

  const updateQuantity = (ticketTypeId: string, newQuantity: number) => {
    const ticketType = ticketTypesState.find(tt => tt.id === ticketTypeId);
    if (!ticketType) return;

    const clampedQuantity = Math.max(0, Math.min(newQuantity, ticketType.available_quantity));
    setSelectedQuantities(prev => ({
      ...prev,
      [ticketTypeId]: clampedQuantity
    }));
  };

  const clearSelections = () => {
    setSelectedQuantities({});
    setError('');
    setSuccessMessage('');
  };

  const handlePurchase = async () => {
    setError('');
    setSuccess(false);
    setSuccessMessage('');
    setLoading(true);

    if (totalQuantity < 1) {
      setError('Please select at least 1 ticket');
      setLoading(false);
      return;
    }

    if (!user) {
      const email = guestEmail.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailPattern.test(email)) {
        setError('Please enter a valid email address for guest checkout.');
        setLoading(false);
        return;
      }
    }

    // Validate individual ticket type quantities
    for (const ticketType of ticketTypesState) {
      const selectedQty = selectedQuantities[ticketType.id] || 0;
      if (selectedQty > ticketType.available_quantity) {
        setError(`Only ${ticketType.available_quantity} ${ticketType.name} tickets available`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/payments/pesapal/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          selectedQuantities,
          customerEmail: user?.email || guestEmail.trim(),
          customerName: guestName.trim() || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Failed to initialize payment');
        return;
      }

      if (!payload.redirectUrl) {
        if (payload.freeCheckout) {
          setSuccess(true);
          setSuccessMessage('Free ticket order confirmed successfully. Your tickets are now available.');
          onPurchaseComplete?.();
          return;
        }
        setError('No payment redirect URL returned by Pesapal.');
        return;
      }

      onPurchaseComplete?.();
      setSuccess(true);
      setSuccessMessage(
        payload.freeCheckout
          ? 'Free ticket order confirmed! Preparing your ticket download...'
          : 'Purchase successful! Redirecting you to Pesapal...'
      );
      setTimeout(() => {
        window.location.href = payload.redirectUrl;
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = ticketTypesState.length === 0 || ticketTypesState.every(tt => tt.available_quantity === 0) || event.status !== 'approved';

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleDialogClose();
        } else {
          setOpen(true);
          fetchTicketTypes();
        }
      }}
    >
      {trigger ? (
        isDisabled ? (
          <div className="opacity-60 cursor-not-allowed">{trigger}</div>
        ) : (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        )
      ) : null}
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col rounded-2xl border border-border/70 bg-background shadow-2xl">
        {/* Scrollable content area - includes header and image */}
        <div className="px-0 py-0 space-y-0 overflow-y-auto flex-1 min-h-0">
          {/* Event Image - Hero section */}
          {event.image_url && (
            <div className="relative w-full h-48 sm:h-56 bg-muted">
              <Image
                src={event.image_url}
                alt={event.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="text-2xl sm:text-3xl font-bold text-white line-clamp-2 drop-shadow-lg mb-2">
                  {event.name}
                </h2>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="font-medium">Hosted by {event.organizer_name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Header and content */}
          <div className="px-5 py-4 space-y-4">
            {/* Event Details Card */}
            <Card className="border-border/70 bg-card">
              <CardContent className="p-4 space-y-3">
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date & Time</p>
                    <p className="text-sm font-medium mt-0.5">{formatEventDateTime()}</p>
                  </div>
                </div>

                {/* Venue */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Venue</p>
                    <p className="text-sm font-medium mt-0.5">{event.venue}</p>
                  </div>
                </div>

                {/* Sponsors */}
                {typingLoading && sponsorsState.length === 0 ? (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sponsors</p>
                      <p className="text-sm text-muted-foreground mt-1">Loading sponsors...</p>
                    </div>
                  </div>
                ) : sponsorsState.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sponsors</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {sponsorsState.map((sponsor) => (
                          <div
                            key={sponsor.id}
                            className="inline-flex items-center gap-2 bg-background/60 hover:bg-background/80 transition-colors rounded-md px-2.5 py-1.5 border border-border/40"
                          >
                            {sponsor.logo_url ? (
                              <div className="relative w-8 h-8">
                                <Image
                                  src={sponsor.logo_url}
                                  alt={sponsor.name}
                                  fill
                                  className="object-contain rounded"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {sponsor.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium whitespace-nowrap">{sponsor.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogHeader>
              <DialogTitle className="text-xl">Purchase Tickets</DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                {totalPrice <= 0
                  ? 'Select free ticket quantities and complete your order instantly.'
                  : 'Select ticket types and quantities to proceed to secure Pesapal checkout.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                Secure checkout by Pesapal
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {totalAvailableTickets} tickets currently available
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {totalPrice <= 0
                ? 'No payment is required for this selection. Confirm your email and complete checkout instantly.'
                : 'Payments are encrypted and processed by Pesapal. You receive confirmation and ticket records immediately after successful payment.'}
            </div>
          </div>

          {/* Ticket types and errors */}
          {error && (
            <div className="px-5">
              <div role="alert" aria-live="assertive" className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="px-5">
              <div role="status" aria-live="polite" className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {successMessage || 'Purchase successful!'}
              </div>
            </div>
          )}

          {!success && (
            <>
              <div className="px-5">
                <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-primary" />
                  Available Tickets
                </label>
                <div className="space-y-3">
                  {typingLoading ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Loading ticket types…
                    </p>
                  ) : ticketTypesState.length > 0 ? (
                    ticketTypesState.map((ticketType) => {
                      const colors = getTicketTypeColor(ticketType.name);
                      const selectedQty = selectedQuantities[ticketType.id] || 0;
                      const isSelected = selectedQty > 0;

                      return (
                        <Card
                          key={ticketType.id}
                          className={`overflow-hidden border ${colors.border} bg-gradient-to-br ${colors.bg} transition-all ${isSelected ? 'ring-1 ring-primary/40 shadow-sm' : 'hover:shadow-md'}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-lg ${colors.icon} flex items-center justify-center shrink-0 shadow-sm`}>
                                    <Ticket className={`w-5 h-5 ${colors.iconText}`} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className={`font-bold text-base ${colors.accent}`}>{ticketType.name}</h4>
                                      {ticketType.available_quantity === 0 && (
                                        <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                                      )}
                                      {isSelected && (
                                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                                      )}
                                    </div>
                                    {ticketType.description && (
                                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{ticketType.description}</p>
                                    )}
                                    {/* Available quantity indicator */}
                                    {ticketType.available_quantity > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        <span className="font-medium text-foreground">{ticketType.available_quantity}</span> tickets remaining
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3">
                                <div className="text-right">
                                  <p className={`font-bold text-xl ${colors.accent} whitespace-nowrap`}>
                                    {currencySymbol}{formatPrice(ticketType.price)}
                                  </p>
                                  {ticketType.available_quantity > 0 && ticketType.available_quantity < 10 && (
                                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                                      Only {ticketType.available_quantity} left!
                                    </p>
                                  )}
                                </div>

                                {ticketType.available_quantity > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={`h-8 w-8 p-0 border-2 ${colors.border} hover:bg-background/80`}
                                      onClick={() => updateQuantity(ticketType.id, selectedQty - 1)}
                                      disabled={loading || selectedQty <= 0}
                                      aria-label={`Decrease ${ticketType.name} quantity`}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </Button>
                                    <div
                                      className={`w-12 text-center font-bold text-base ${colors.accent} bg-background/50 rounded-md py-1 border ${colors.border}`}
                                      aria-live="polite"
                                      aria-label={`${ticketType.name} quantity`}
                                    >
                                      {selectedQty}
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={`h-8 w-8 p-0 border-2 ${colors.border} hover:bg-background/80`}
                                      onClick={() => updateQuantity(ticketType.id, selectedQty + 1)}
                                      disabled={loading || selectedQty >= ticketType.available_quantity}
                                      aria-label={`Increase ${ticketType.name} quantity`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground text-center px-3 font-medium">
                                    Sold Out
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">
                      No ticket types available
                    </p>
                  )}
                </div>
              </div>

              {totalQuantity > 0 && (
                <div className="p-4 bg-muted/50 border border-border/60 rounded-xl space-y-2">
                  <h4 className="font-semibold text-sm">Order summary</h4>
                  {selectedLineItems.map(({ ticketType, qty }) => (
                    <div key={ticketType.id} className="flex justify-between text-sm">
                      <span>{ticketType.name} x {qty}</span>
                      <span className="font-medium">{currencySymbol}{formatPrice(ticketType.price * qty)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total ({totalQuantity} ticket{totalQuantity === 1 ? '' : 's'})</span>
                    <span className="font-bold text-lg">{currencySymbol}{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              )}

              {!user && (
                <div className="p-4 border border-border/60 bg-card rounded-xl text-sm space-y-3">
                  <p className="font-medium text-foreground">Guest checkout</p>
                  <p className="text-xs text-muted-foreground">
                    Use the same email when creating an account later to automatically sync these tickets to your profile.
                  </p>
                  <div className="space-y-2">
                    <label htmlFor="guest-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Email for payment receipt and confirmation
                    </label>
                    <Input
                      id="guest-email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={loading}
                      className="bg-background h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="guest-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Full name (optional)
                    </label>
                    <Input
                      id="guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Jane Doe"
                      disabled={loading}
                      className="bg-background h-10"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Persistent footer with total and actions */}
        <div className="px-5 py-4 border-t border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-primary">
                {totalQuantity > 0 ? `${currencySymbol}${formatPrice(totalPrice)}` : `${currencySymbol}0`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tickets</p>
              <p className="text-lg font-semibold">{totalQuantity}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 h-11"
              variant="outline"
              onClick={handleDialogClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11"
              variant="outline"
              onClick={clearSelections}
              disabled={loading || totalQuantity === 0}
            >
              Clear
            </Button>
            <Button
              className="flex-1 h-11 font-semibold"
              onClick={handlePurchase}
              disabled={loading || success || totalQuantity < 1 || (!user && !guestEmail.trim())}
              aria-label="Proceed to secure payment"
            >
              {loading
                ? totalPrice <= 0
                  ? 'Completing Order...'
                  : 'Redirecting...'
                : success
                ? totalPrice <= 0
                  ? 'Order Completed'
                  : 'Opening Pesapal...'
                : totalPrice <= 0
                ? 'Complete Free Checkout'
                : 'Pay with Pesapal'}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            {totalPrice <= 0
              ? 'By continuing, you confirm your ticket selection and contact details.'
              : 'By continuing, you agree to complete payment on Pesapal&apos;s secure platform.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
