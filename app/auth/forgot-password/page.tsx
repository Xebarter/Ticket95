'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase-auth-context';
import { AuthPageShell, authInputClassName, authPrimaryButtonClassName } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Reset your password"
      description="Enter the email linked to your account and we'll send you a secure reset link."
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-medium text-slate-700 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      }
    >
      {success ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            <strong>Check your email.</strong> We sent a reset link to <strong>{email}</strong>.
            Open the link in that message to choose a new password.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
              className={authInputClassName}
            />
          </div>

          <Button type="submit" className={authPrimaryButtonClassName} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      )}

      {success ? (
        <p className="mt-4 text-center text-sm text-slate-500">
          Didn&apos;t receive the email?{' '}
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="font-medium text-slate-900 hover:underline"
          >
            Try again
          </button>
        </p>
      ) : null}
    </AuthPageShell>
  );
}
