'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/supabase-auth-context';
import { AuthPageShell, authInputClassName, authPrimaryButtonClassName } from '@/components/auth/auth-page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updatePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    if (!accessToken) {
      setError('Invalid or expired reset link. Please request a new one.');
    }
  }, [searchParams]);

  const passwordValidations = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);
  const passwordsMatch =
    formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await updatePassword(formData.password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Set a new password"
      description="Choose a strong password to secure your Ticket95 account."
      footer={
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Return to sign in
        </Link>
      }
    >
      {success ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            Password updated successfully. Redirecting you to sign in...
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
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter a new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                autoComplete="new-password"
                autoFocus
                className={cn(authInputClassName, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {formData.password ? (
              <div className="mt-2 space-y-1 text-xs">
                <p className={passwordValidations.length ? 'text-emerald-600' : 'text-slate-400'}>
                  {passwordValidations.length ? <Check className="mr-1 inline h-3 w-3" /> : '○'} At least 8 characters
                </p>
                <p className={passwordValidations.uppercase ? 'text-emerald-600' : 'text-slate-400'}>
                  {passwordValidations.uppercase ? <Check className="mr-1 inline h-3 w-3" /> : '○'} One uppercase letter
                </p>
                <p className={passwordValidations.lowercase ? 'text-emerald-600' : 'text-slate-400'}>
                  {passwordValidations.lowercase ? <Check className="mr-1 inline h-3 w-3" /> : '○'} One lowercase letter
                </p>
                <p className={passwordValidations.number ? 'text-emerald-600' : 'text-slate-400'}>
                  {passwordValidations.number ? <Check className="mr-1 inline h-3 w-3" /> : '○'} One number
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirm new password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={loading}
                autoComplete="new-password"
                className={cn(authInputClassName, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                disabled={loading}
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
            disabled={loading || !isPasswordValid || !passwordsMatch}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      )}
    </AuthPageShell>
  );
}
