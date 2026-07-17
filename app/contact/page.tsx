import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Contact Us | Ticket95.com',
  description: 'Contact Ticket95.com support for account, ticket, organizer, and payment help.',
};

export default function ContactPage() {
  return (
    <StaticPageLayout
      title="Contact Us"
      description="Our team is here to help with ticket access, payment confirmation, event management, and account recovery."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-10">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-5">
            <h2 className="text-lg font-semibold">General support</h2>
            <p className="mt-2 text-sm text-muted-foreground">For account access, checkout issues, and ticket retrieval.</p>
            <p className="mt-4 text-sm">
              Email:
              {' '}
              <a className="text-primary hover:underline" href="mailto:support@ticket95.com">
                support@ticket95.com
              </a>
            </p>
            <p className="mt-1 text-sm">
              Phone:
              {' '}
              <a className="text-primary hover:underline" href="tel:+1234567890">
                +1 (234) 567-890
              </a>
            </p>
          </div>
          <div className="rounded-xl border border-border/70 p-5">
            <h2 className="text-lg font-semibold">Organizer support</h2>
            <p className="mt-2 text-sm text-muted-foreground">For event approval, payout, and ticket verification workflows.</p>
            <p className="mt-4 text-sm">
              Email:
              {' '}
              <a className="text-primary hover:underline" href="mailto:organizers@ticket95.com">
                organizers@ticket95.com
              </a>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Include your organizer account email and event name so we can respond faster.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Support hours</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Monday to Friday: 8:00 AM - 8:00 PM (UTC)</li>
            <li>Saturday: 9:00 AM - 4:00 PM (UTC)</li>
            <li>Sunday and holidays: Emergency event-day support only</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Before contacting support</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Provide your account email and order or ticket ID.</li>
            <li>Include the event name, date, and a clear description of the issue.</li>
            <li>For payment issues, attach your transaction reference and payment timestamp.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Helpful links</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            You may find immediate answers in the
            {' '}
            <Link href="/help" className="text-primary hover:underline">Help Center</Link>
            {' '}
            or
            {' '}
            <Link href="/faq" className="text-primary hover:underline">FAQ</Link>
            .
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
