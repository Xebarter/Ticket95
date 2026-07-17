import { SignupForm } from '@/components/auth/signup-form';
import { BrandLogo } from '@/components/brand/brand-logo';

export const metadata = {
  title: 'Sign Up - Ticket95.com',
  description: 'Create your Ticket95.com account',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="xl" href="/" stacked priority />
          <p className="text-muted-foreground mt-3 text-sm">Create your Ticket95.com account</p>
        </div>
        <SignupForm />
      </div>
    </main>
  );
}
