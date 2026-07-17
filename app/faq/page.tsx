import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'FAQ | Ticket95.com',
  description: 'Frequently asked questions about accounts, tickets, refunds, and organizer workflows.',
};

export default function FaqPage() {
  return (
    <StaticPageLayout
      title="Frequently Asked Questions"
      description="Quick answers for buyers, organizers, and event staff using Ticket95.com."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-4">
        <details className="rounded-xl border border-border/70 p-4">
          <summary className="cursor-pointer font-medium">Where can I see my purchased tickets?</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Open
            {' '}
            <Link href="/profile/tickets" className="text-primary hover:underline">My Tickets</Link>
            {' '}
            to view active tickets, QR codes, and download PDFs.
          </p>
        </details>

        <details className="rounded-xl border border-border/70 p-4">
          <summary className="cursor-pointer font-medium">Can I buy tickets without creating an account?</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Guest checkout can be enabled for selected flows, but creating an account gives better access to ticket history and support.
          </p>
        </details>

        <details className="rounded-xl border border-border/70 p-4">
          <summary className="cursor-pointer font-medium">How do I request a refund?</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Review the
            {' '}
            <Link href="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
            {' '}
            first, then contact support with your order reference and reason.
          </p>
        </details>

        <details className="rounded-xl border border-border/70 p-4">
          <summary className="cursor-pointer font-medium">How do organizers create new events?</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the
            {' '}
            <Link href="/organizer/dashboard/create" className="text-primary hover:underline">Create Event</Link>
            {' '}
            flow and submit all required event details for approval.
          </p>
        </details>

        <details className="rounded-xl border border-border/70 p-4">
          <summary className="cursor-pointer font-medium">Why is my event not publicly visible?</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Events must pass approval checks and remain scheduled in the future before appearing in public listings.
          </p>
        </details>

        <details className="rounded-xl border border-border/70 p-4">
          <summary className="cursor-pointer font-medium">Who do I contact for urgent event-day issues?</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Reach support from the
            {' '}
            <Link href="/contact" className="text-primary hover:underline">Contact page</Link>
            {' '}
            and mark your request as event-day urgent with the event name and start time.
          </p>
        </details>
      </div>
    </StaticPageLayout>
  );
}
