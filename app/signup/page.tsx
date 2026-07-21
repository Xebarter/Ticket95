import { SignupForm } from '@/components/auth/signup-form';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import Link from 'next/link';

export const metadata = {
  title: 'Sign Up - Ticket95.com',
  description: 'Create your Ticket95.com account',
};

export default function SignupPage() {
  return (
    <AuthPageShell
      title="Create your account"
      description="Join Ticket95 to buy tickets, track orders, and discover events."
      footer={
        <>
          Already have an account?{' '}
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
