import { BrandLogo } from '@/components/brand/brand-logo';
import Link from 'next/link';
import { User } from 'lucide-react';

// A stripped‑down, non‑hydrating header used on the public landing page. It
// avoids any client-side logic (authentication state, logout, etc.) so the
// homepage can render as a pure server component.  Logged‑in users will still
// see the login/sign up links; clicking "Profile" or "Logout" requires
// navigating to a page that uses the full `HeaderClient`.
export function HeaderServer() {
  return (
    <>
      <header className="relative z-40 border-b border-border/40 bg-card/95 backdrop-blur-xl shadow-sm lg:sticky lg:top-0 lg:z-50">
        <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-3 sm:py-4 lg:gap-4">
            <BrandLogo size="md" priority />

            <div className="mx-2 hidden min-w-0 flex-1 lg:mx-6 lg:block lg:max-w-xl xl:max-w-2xl">
              <form action="/events" method="get" role="search" className="relative w-full">
                <input
                  type="text"
                  name="search"
                  placeholder="Search events..."
                  aria-label="Search events"
                  className="h-11 w-full rounded-md border border-border/50 bg-background/80 pl-3 pr-24 text-sm shadow-none outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
              <Link href="/login" className="text-sm font-medium hover:underline sm:text-base">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:text-base"
              >
                Sign Up
              </Link>
            </div>

            <Link
              href="/login"
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground lg:hidden"
              aria-label="Sign in"
            >
              <User className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-50 border-b border-border/40 bg-card/95 backdrop-blur-xl shadow-sm lg:hidden">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
          <form action="/events" method="get" role="search" className="relative w-full">
            <input
              type="text"
              name="search"
              placeholder="Search events..."
              aria-label="Search events"
              className="h-10 w-full rounded-md border border-border/50 bg-background/80 pl-3 pr-24 text-sm shadow-none outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 h-7 -translate-y-1/2 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
