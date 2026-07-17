import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Refund Policy | Ticket95.com',
  description: 'Learn when ticket purchases are eligible for refunds and how to request one.',
};

export default function RefundPolicyPage() {
  return (
    <StaticPageLayout
      title="Refund Policy"
      description="Refunds are handled according to organizer terms, event status, and payment confirmation conditions."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-8 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">General eligibility</h2>
          <ul className="mt-2 space-y-2">
            <li>Refunds may be available for canceled events.</li>
            <li>Rescheduled events may offer a limited refund window.</li>
            <li>Completed events and used tickets are typically not refundable.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Non-refundable scenarios</h2>
          <ul className="mt-2 space-y-2">
            <li>Change-of-mind requests after ticket issuance.</li>
            <li>No-shows or late attendance.</li>
            <li>Violation of event entry rules.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">How to request a refund</h2>
          <ol className="mt-2 space-y-2 list-decimal pl-5">
            <li>Prepare your order reference, ticket ID, and account email.</li>
            <li>Submit your request through our support channel.</li>
            <li>Include the reason and any supporting transaction details.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Processing time</h2>
          <p className="mt-2">Approved refunds are generally processed within 5 to 10 business days, depending on your payment provider.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Need assistance?</h2>
          <p className="mt-2">
            Reach out via the
            {' '}
            <Link href="/contact" className="text-primary hover:underline">Contact page</Link>
            {' '}
            and include your complete order details.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
