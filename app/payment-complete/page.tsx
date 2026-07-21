'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Ticket, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type TicketRecord = {
  id: string;
  ticket_type_id: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  price_paid?: number | null;
  status?: string | null;
};

function PaymentCompleteContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);

  const orderId = searchParams.get('orderId') || searchParams.get('OrderMerchantReference') || '';
  const purchaseId =
    searchParams.get('purchaseId') ||
    searchParams.get('orderTrackingId') ||
    searchParams.get('OrderTrackingId') ||
    '';
  const freeCheckout = searchParams.get('freeCheckout') === '1';
  const redirectStatus = (searchParams.get('status') || '').toLowerCase();
  const customerEmailParam = searchParams.get('customerEmail') || '';
  const guestCheckoutParam = searchParams.get('guestCheckout') === '1';

  const verifyEndpoint = useMemo(
    () => (freeCheckout ? null : '/api/payments/paytota/verify'),
    [freeCheckout]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!orderId) {
        setStatus('failed');
        setMessage('Missing order reference in payment callback.');
        return;
      }

      if (redirectStatus === 'failed' || redirectStatus === 'cancelled') {
        setStatus('failed');
        setMessage(
          redirectStatus === 'cancelled'
            ? 'Payment was cancelled. You can try again from the event page.'
            : 'Payment was not completed. Please try again.'
        );
        return;
      }

      try {
        if (verifyEndpoint) {
          const res = await fetch(verifyEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              purchaseId: purchaseId || undefined,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (res.status === 409) {
              setStatus('pending');
              setMessage('Payment is still processing. Please refresh in a moment.');
              return;
            }
            throw new Error(data?.error || 'Payment verification failed');
          }
        }

        const ticketRes = await fetch(
          `/api/payments/tickets?orderId=${encodeURIComponent(orderId)}${
            purchaseId ? `&orderTrackingId=${encodeURIComponent(purchaseId)}` : ''
          }${freeCheckout ? '&freeCheckout=1' : ''}`
        );
        const ticketData = await ticketRes.json().catch(() => ({}));

        if (!ticketRes.ok) {
          throw new Error(ticketData?.error || 'Could not load tickets');
        }

        if (cancelled) return;

        setTickets(Array.isArray(ticketData.tickets) ? ticketData.tickets : []);
        setCustomerEmail(ticketData?.order?.customerEmail || customerEmailParam || null);
        setIsGuestCheckout(Boolean(ticketData?.order?.isGuest || guestCheckoutParam));
        setStatus('success');
        setMessage(freeCheckout ? 'Your free tickets are ready.' : 'Payment successful. Your tickets are ready.');
      } catch (error: unknown) {
        if (cancelled) return;
        setStatus('failed');
        setMessage(error instanceof Error ? error.message : 'Something went wrong while verifying payment.');
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [orderId, purchaseId, verifyEndpoint, freeCheckout, redirectStatus, customerEmailParam, guestCheckoutParam]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          {status === 'loading' || status === 'pending' ? (
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
          ) : status === 'success' ? (
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" />
          ) : (
            <XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
          )}
          <CardTitle>
            {status === 'loading'
              ? 'Processing payment'
              : status === 'pending'
                ? 'Payment pending'
                : status === 'success'
                  ? 'Tickets confirmed'
                  : 'Payment issue'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>

        {status === 'success' && tickets.length > 0 && (
          <CardContent className="space-y-4">
            {customerEmail && (
              <p className="text-sm text-muted-foreground">
                Confirmation sent to <span className="font-medium text-foreground">{customerEmail}</span>
              </p>
            )}

            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Ticket #{ticket.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.attendee_name || 'Guest'} · {ticket.status || 'valid'}
                      </p>
                    </div>
                  </div>
                  {typeof ticket.price_paid === 'number' && (
                    <p className="text-sm font-medium">{ticket.price_paid.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <Link href={isGuestCheckout ? '/' : '/profile'}>
                  {isGuestCheckout ? 'Browse events' : 'View my tickets'}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/events">Back to events</Link>
              </Button>
            </div>
          </CardContent>
        )}

        {status === 'failed' && (
          <CardContent>
            <Button asChild>
              <Link href="/events">Return to events</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <Card>
            <CardHeader className="text-center">
              <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
              <CardTitle>Processing payment</CardTitle>
              <CardDescription>Verifying your payment...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  );
}
