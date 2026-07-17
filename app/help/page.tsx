import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Help Center | Ticket95.com',
  description: 'Get help with buying tickets, account access, organizer tools, and support.',
};

export default function HelpCenterPage() {
  return (
    <StaticPageLayout
      title="Help Center"
      description="Find quick answers and practical steps for buying tickets, managing your profile, organizing events, and resolving payment issues."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-xl font-semibold">Getting started</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/events" className="rounded-xl border border-border/70 p-4 transition hover:bg-muted/30">
              <p className="font-medium">Browse and purchase tickets</p>
              <p className="mt-1 text-sm text-muted-foreground">Discover events, view details, and complete checkout.</p>
            </Link>
            <Link href="/profile/tickets" className="rounded-xl border border-border/70 p-4 transition hover:bg-muted/30">
              <p className="font-medium">Access your tickets</p>
              <p className="mt-1 text-sm text-muted-foreground">Open QR codes and download ticket PDFs from your profile.</p>
            </Link>
            <Link href="/profile/events" className="rounded-xl border border-border/70 p-4 transition hover:bg-muted/30">
              <p className="font-medium">Manage organizer events</p>
              <p className="mt-1 text-sm text-muted-foreground">Track event status, inventory, and performance in one place.</p>
            </Link>
            <Link href="/profile/verify" className="rounded-xl border border-border/70 p-4 transition hover:bg-muted/30">
              <p className="font-medium">Verify entries at the gate</p>
              <p className="mt-1 text-sm text-muted-foreground">Use the verification workspace to scan and validate ticket QR codes.</p>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Common issues</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li><span className="font-medium text-foreground">I cannot find my ticket:</span> Check your signed-in account under <Link href="/profile/tickets" className="text-primary hover:underline">My Tickets</Link>, then verify your purchase email and status.</li>
            <li><span className="font-medium text-foreground">Payment is pending:</span> Wait a few minutes for confirmation, then refresh your orders. If still pending, contact support with your transaction reference.</li>
            <li><span className="font-medium text-foreground">Wrong email at checkout:</span> Contact support immediately so we can verify the purchase and help recover your access.</li>
            <li><span className="font-medium text-foreground">Organizer event not visible:</span> Ensure event approval is complete and the event date is in the future.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Payments and refunds</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Refund outcomes depend on the organizer policy, event timing, and payment status. Before requesting a refund, review our
            {' '}
            <Link href="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
            {' '}
            and keep your order reference ready.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Still need help?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Reach us through the
            {' '}
            <Link href="/contact" className="text-primary hover:underline">Contact page</Link>
            {' '}
            and include your account email, event name, and any transaction or ticket ID for faster support.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
