'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authInputClassName, authPrimaryButtonClassName } from '@/components/auth/auth-page-shell';
import { AuthDivider, GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const redirect = searchParams.get('redirect') || '/profile';
  const oauthError = searchParams.get('error');

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const sessionSyncResponse = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!sessionSyncResponse.ok) {
          throw new Error('Signed in, but failed to initialize secure session. Please try again.');
        }
      }
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <GoogleSignInButton
        onClick={handleGoogleSignIn}
        loading={googleLoading}
        disabled={loading}
      />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5">
      {(error || oauthError) ? (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || oauthError}</AlertDescription>
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
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={loading || googleLoading}
          autoComplete="email"
          className={authInputClassName}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={loading || googleLoading}
            autoComplete="current-password"
            className={cn(authInputClassName, 'pr-11')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
            disabled={loading || googleLoading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className={authPrimaryButtonClassName} disabled={loading || googleLoading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
    </div>
  );
}
