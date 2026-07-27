'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export default function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const token = (searchParams.get('token') || '').trim();
  const successParam = searchParams.get('success') === '1';
  const emailParam = searchParams.get('email') || '';
  const errorParam = searchParams.get('error');

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    successParam ? 'done' : errorParam ? 'error' : token ? 'idle' : 'error'
  );
  const [email, setEmail] = useState(emailParam);
  const [message, setMessage] = useState(
    errorParam ? 'This unsubscribe link is invalid or has expired.' : ''
  );

  useEffect(() => {
    if (!token || successParam || errorParam) return;

    let cancelled = false;
    const run = async () => {
      setStatus('loading');
      try {
        const res = await fetch('/api/newsletter/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Unsubscribe failed');
        if (cancelled) return;
        setEmail(payload.email || '');
        setStatus('done');
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : 'Unsubscribe failed');
        setStatus('error');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, successParam, errorParam]);

  return (
    <StaticPageLayout
      title="Unsubscribe"
      description="Manage your Ticket95 marketing email preferences."
    >
      <div className="mx-auto max-w-lg rounded-xl border border-border/70 p-6 text-center">
        {status === 'loading' || status === 'idle' ? (
          <p className="text-sm text-muted-foreground">Updating your preferences…</p>
        ) : null}

        {status === 'done' ? (
          <>
            <p className="text-base font-medium text-foreground">You’re unsubscribed</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {email
                ? `${email} will no longer receive Ticket95 marketing emails.`
                : 'You will no longer receive Ticket95 marketing emails.'}
            </p>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <p className="text-base font-medium text-foreground">Couldn’t unsubscribe</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {message || 'This link is invalid. Contact support@ticket95.com if you need help.'}
            </p>
          </>
        ) : null}

        <Button asChild className="mt-6 rounded-xl">
          <Link href="/">Back to Ticket95</Link>
        </Button>
      </div>
    </StaticPageLayout>
  );
}
