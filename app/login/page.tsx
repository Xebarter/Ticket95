import { LoginForm } from '@/components/auth/login-form';
import { AuthPageShell } from '@/components/auth/auth-page-shell';
import Link from 'next/link';

export const metadata = {
  title: 'Log In - Ticket95.com',
  description: 'Log in to your Ticket95.com account',
};

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Welcome back"
      description="Sign in to access your tickets, orders, and event dashboard."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-slate-900 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthPageShell>
  );
}
