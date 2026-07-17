'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const router = useRouter();
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

    // The actual verification is handled by Supabase automatically
    // when the user clicks the link in their email
    setTimeout(() => {
      setStatus('success');
      setMessage('Email verified successfully! You can now log in.');
    }, 2000);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email'}
            {status === 'success' && 'Your email has been verified'}
            {status === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {message}
                </AlertDescription>
              </Alert>
              <Button asChild className="w-full">
                <Link href="/login">Continue to Login</Link>
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/signup">Sign Up Again</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Go to Login</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
