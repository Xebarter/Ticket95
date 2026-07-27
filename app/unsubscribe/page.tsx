import { Suspense } from 'react';
import type { Metadata } from 'next';
import UnsubscribeClient from './unsubscribe-client';

export const metadata: Metadata = {
  title: 'Unsubscribe | Ticket95.com',
  description: 'Unsubscribe from Ticket95 marketing emails.',
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <UnsubscribeClient />
    </Suspense>
  );
}
