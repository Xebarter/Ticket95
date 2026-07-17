import { LoginForm } from '@/components/auth/login-form';
import { BrandLogo } from '@/components/brand/brand-logo';

export const metadata = {
  title: 'Log In - Ticket95.com',
  description: 'Log in to your Ticket95.com account',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="xl" href="/" stacked priority />
          <p className="text-muted-foreground mt-3 text-sm">Event Ticketing Platform</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
