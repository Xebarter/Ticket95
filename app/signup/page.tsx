import { SignupForm } from '@/components/auth/signup-form';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import Link from 'next/link';

export const metadata = {
  title: 'Sign Up',
  description: 'Create your Ticket95 profile to buy tickets, track orders, and discover events.',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthPageShell
      title="Register"
      description="Join Ticket95 to buy tickets, track orders, and discover events."
      footer={
        <>
          Have an existing profile?{' '}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthPageShell>
  );
}
