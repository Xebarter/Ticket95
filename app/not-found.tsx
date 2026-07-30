import type { Metadata } from 'next';
import Link from 'next/link';
import { HeaderClient } from '@/components/layout/header-client';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Page not found',
  description: 'This page does not exist or is no longer available on Ticket95.',
  path: '/404',
  noIndex: true,
});

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <HeaderClient />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-sm font-semibold tracking-wide text-sky-700 uppercase">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          The page you are looking for may have moved, expired, or never existed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-xl bg-sky-600 hover:bg-sky-700">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/events">Browse events</Link>
          </Button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
