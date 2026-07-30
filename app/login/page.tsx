import { LoginForm } from '@/components/auth/login-form';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import Link from 'next/link';

export const metadata = {
  title: 'Log In',
  description: 'Log in to your Ticket95 account to access tickets, orders, and your event dashboard.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Welcome back"
      description="Sign in to access your tickets, orders, and event dashboard."
      footer={
        <>
          New to Ticket95?{' '}
          <Link href="/signup" className="font-medium text-slate-900 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthPageShell>
  );
}
