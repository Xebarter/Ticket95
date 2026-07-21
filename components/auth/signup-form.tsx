'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authInputClassName, authPrimaryButtonClassName } from '@/components/auth/auth-page-shell';
import { AuthDivider, GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { AlertCircle, CheckCircle2, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SignupForm() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <SignupFormInner />
    </Suspense>
  );
}

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const prefilledEmail = (searchParams.get('email') || '').trim();
    if (!prefilledEmail) return;

    setFormData((prev) => {
      if (prev.email) return prev;
      return { ...prev, email: prefilledEmail };
    });
  }, [searchParams]);

  const passwordsMatch =
    formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await signup(formData.email, formData.password, 'customer');
      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription>
          Registration complete. Redirecting to your dashboard...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <GoogleSignInButton
        onClick={handleGoogleSignIn}
        loading={googleLoading}
        disabled={loading}
      />

      <AuthDivider />

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
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={loading || googleLoading}
          autoComplete="email"
          className={authInputClassName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={loading || googleLoading}
            autoComplete="new-password"
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
          Confirm password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            disabled={loading || googleLoading}
            autoComplete="new-password"
            className={cn(authInputClassName, 'pr-11')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
            disabled={loading || googleLoading}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {formData.confirmPassword ? (
          <p className={passwordsMatch ? 'text-xs text-emerald-600' : 'text-xs text-red-600'}>
            {passwordsMatch ? (
              <>
                <Check className="mr-1 inline h-3 w-3" />
                Passwords match
              </>
            ) : (
              'Passwords do not match'
            )}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        className={authPrimaryButtonClassName}
        disabled={loading || googleLoading || !passwordsMatch}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating profile...
          </>
        ) : (
          'Create profile'
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-slate-400">
        By continuing, you agree to our terms of service and privacy policy.
      </p>
    </form>
    </div>
  );
}
