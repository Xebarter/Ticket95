import { BrandLogo } from '@/components/brand/brand-logo';
import Link from 'next/link';

// A stripped‑down, non‑hydrating header used on the public landing page. It
// avoids any client-side logic (authentication state, logout, etc.) so the
// homepage can render as a pure server component.  Logged‑in users will still
// see the login/sign up links; clicking "Profile" or "Logout" requires
// navigating to a page that uses the full `HeaderClient`.
export function HeaderServer() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-card/95 backdrop-blur-xl shadow-sm">
      <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-primary/5" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4 sm:py-5 gap-4">
          <BrandLogo
            size="md"
            priority
          />

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link href="/login" className="text-sm sm:text-base font-medium hover:underline">
              Sign In
            </Link>
            <Link href="/signup" className="ml-4 text-sm sm:text-base font-medium px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
