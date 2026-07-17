'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { getEventById } from '@/lib/supabase-db';
import { useAuth } from '@/lib/supabase-auth-context';
import { downloadTicketAsPdf } from '@/lib/ticket-download';

type VerifyState = 'loading' | 'success' | 'pending' | 'failed';

export default function PaymentCompletePage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><Clock3 className="h-8 w-8 animate-pulse text-primary" /></main>}>
      <PaymentCompletePageInner />
    </Suspense>
  );
}

function PaymentCompletePageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGuestOrder, setIsGuestOrder] = useState(false);
  const [guestCheckoutEmail, setGuestCheckoutEmail] = useState('');
  const hasAutoDownloadedRef = useRef(false);

  const downloadTickets = useCallback(async () => {
    if (!orderId) return;

    setIsDownloading(true);
    try {
      const orderTrackingId = searchParams.get('OrderTrackingId') || searchParams.get('orderTrackingId');
      const freeCheckoutParam = (searchParams.get('freeCheckout') || '').toLowerCase();
      const isFreeCheckout = freeCheckoutParam === '1' || freeCheckoutParam === 'true';

      const params = new URLSearchParams({ orderId });
      if (orderTrackingId) params.set('orderTrackingId', orderTrackingId);
      if (isFreeCheckout) params.set('freeCheckout', '1');

      const ticketsRes = await fetch(`/api/payments/tickets?${params.toString()}`);
      const ticketsPayload = await ticketsRes.json();
      if (!ticketsRes.ok) {
        throw new Error(ticketsPayload?.error || 'Failed to load tickets for download.');
      }

      const tickets = Array.isArray(ticketsPayload?.tickets) ? ticketsPayload.tickets : [];
      const orderContext = ticketsPayload?.order;
      if (orderContext && typeof orderContext === 'object') {
        setIsGuestOrder(Boolean(orderContext.isGuest));
        if (typeof orderContext.customerEmail === 'string' && orderContext.customerEmail.trim()) {
          setGuestCheckoutEmail(orderContext.customerEmail.trim());
        }
      }

      if (tickets.length === 0) {
        setMessage('Payment completed, but no tickets were found to download yet. Please try again in a moment.');
        return;
      }

      for (const ticket of tickets) {
        const event = await getEventById(ticket.event_id);
        await downloadTicketAsPdf(ticket, event);
      }

      setMessage(
        tickets.length > 1
          ? `${tickets.length} ticket PDFs downloaded successfully.`
          : 'Your ticket PDF has been downloaded successfully.'
      );
    } catch (error: any) {
      setMessage(error?.message || 'Payment completed, but ticket download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [orderId, searchParams]);

  useEffect(() => {
    const verify = async () => {
      const freeCheckoutParam = (searchParams.get('freeCheckout') || '').toLowerCase();
      const freeOrderId = searchParams.get('orderId');
      const guestCheckoutParam = (searchParams.get('guestCheckout') || '').toLowerCase();
      const customerEmailParam = (searchParams.get('customerEmail') || '').trim();
      const isFreeCheckout = freeCheckoutParam === '1' || freeCheckoutParam === 'true';
      const isGuestCheckout = guestCheckoutParam === '1' || guestCheckoutParam === 'true';

      if (isFreeCheckout && freeOrderId) {
        setState('success');
        setOrderId(freeOrderId);
        setIsGuestOrder(isGuestCheckout);
        if (customerEmailParam) {
          setGuestCheckoutEmail(customerEmailParam);
        }
        setMessage('Free checkout completed successfully. Your ticket is being prepared for download.');
        return;
      }

      const orderTrackingId = searchParams.get('OrderTrackingId') || searchParams.get('orderTrackingId');
      const orderMerchantReference =
        searchParams.get('OrderMerchantReference') || searchParams.get('orderMerchantReference');

      if (!orderTrackingId || !orderMerchantReference) {
        setState('failed');
        setMessage('Missing payment reference from Pesapal.');
        return;
      }

      try {
        const res = await fetch('/api/payments/pesapal/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderTrackingId,
            orderMerchantReference,
          }),
        });

        const payload = await res.json();
        if (!res.ok) {
          setState('failed');
          setMessage(payload?.error || 'Unable to verify payment.');
          return;
        }

        if (payload.success) {
          setState('success');
          setOrderId(payload.orderId || null);
          setIsGuestOrder(Boolean(payload?.isGuest));
          if (typeof payload?.customerEmail === 'string' && payload.customerEmail.trim()) {
            setGuestCheckoutEmail(payload.customerEmail.trim());
          }
          setMessage('Payment completed successfully. Your order has been confirmed.');
          return;
        }

        const status = String(payload.status || '').toLowerCase();
        if (status.includes('pending')) {
          setState('pending');
          setMessage('Your payment is still pending. Please check again shortly.');
        } else {
          setState('failed');
          setMessage(`Payment was not completed (${payload.status || 'unknown status'}).`);
        }
      } catch (error: any) {
        setState('failed');
        setMessage(error?.message || 'Unexpected error while verifying payment.');
      }
    };

    verify();
  }, [searchParams]);

  useEffect(() => {
    if (state !== 'success' || !orderId || hasAutoDownloadedRef.current) return;
    hasAutoDownloadedRef.current = true;
    void downloadTickets();
  }, [downloadTickets, orderId, state]);

  const profileHref =
    !user && isGuestOrder
      ? `/signup?email=${encodeURIComponent(guestCheckoutEmail || '')}`
      : '/profile';

  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-3 py-6 sm:items-center sm:p-4">
      <Card className="w-full max-w-lg rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Pesapal Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
            {state === 'loading' && (
              <div className="flex items-start gap-2 text-sm leading-relaxed sm:items-center">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 animate-pulse sm:mt-0" />
                <p className="break-words">{message}</p>
              </div>
            )}
            {state === 'success' && (
              <div className="flex items-start gap-2 text-sm leading-relaxed text-emerald-700 sm:items-center">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
                <p className="break-words">{message}</p>
              </div>
            )}
            {state === 'pending' && (
              <div className="flex items-start gap-2 text-sm leading-relaxed text-amber-700 sm:items-center">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
                <p className="break-words">{message}</p>
              </div>
            )}
            {state === 'failed' && (
              <div className="flex items-start gap-2 text-sm leading-relaxed text-destructive sm:items-center">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
                <p className="break-words">{message}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {state === 'success' && orderId ? (
              <Button
                variant="secondary"
                className="w-full sm:flex-1"
                onClick={() => void downloadTickets()}
                disabled={isDownloading}
              >
                {isDownloading ? 'Preparing Ticket...' : 'Download Ticket Again'}
              </Button>
            ) : null}
            <Button asChild className="w-full sm:flex-1">
              <Link href={profileHref}>{!user && isGuestOrder ? 'Create Account' : 'Go to Profile'}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:flex-1">
              <Link href="/events">Browse Events</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
