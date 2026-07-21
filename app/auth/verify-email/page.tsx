'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { authPrimaryButtonClassName } from '@/components/auth/auth-page-shell';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token || type !== 'signup') {
      setStatus('error');
      setMessage('Invalid or expired verification link.');
      return;
    }

    setTimeout(() => {
      setStatus('success');
      setMessage('Email verified successfully. You can now sign in.');
    }, 2000);
  }, [searchParams]);

  return (
    <AuthPageShell
      title="Email verification"
      description={
        status === 'loading'
          ? 'Please wait while we confirm your email address.'
          : status === 'success'
            ? 'Your email has been verified.'
            : 'We could not verify your email.'
      }
    >
      {status === 'loading' ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">{message}</p>
        </div>
      ) : null}

      {status === 'success' ? (
        <div className="space-y-4">
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <Button asChild className={authPrimaryButtonClassName}>
            <Link href="/login">Continue to sign in</Link>
          </Button>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="space-y-4">
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <div className="grid gap-3">
            <Button asChild className={authPrimaryButtonClassName}>
              <Link href="/signup">Create a new account</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 border-slate-200">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </AuthPageShell>
  );
}
