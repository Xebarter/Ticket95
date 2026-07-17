import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Accessibility | Ticket95.com',
  description: 'Accessibility statement and support information for Ticket95.com.',
};

export default function AccessibilityPage() {
  return (
    <StaticPageLayout
      title="Accessibility"
      description="Ticket95.com is committed to building an inclusive ticketing experience for all users."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-8 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Our commitment</h2>
          <p className="mt-2">
            We work to improve keyboard navigation, color contrast, semantic markup, and compatibility with assistive technologies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Accessibility features</h2>
          <ul className="mt-2 space-y-2">
            <li>Responsive layout for different zoom levels and screen sizes.</li>
            <li>Meaningful labels for forms and interactive elements.</li>
            <li>Consistent heading hierarchy across key pages.</li>
            <li>Focus styles for keyboard users.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Known gaps</h2>
          <p className="mt-2">
            Some legacy event content provided by organizers may not fully meet accessibility standards. We continue to improve these areas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Report an issue</h2>
          <p className="mt-2">
            If you experience an accessibility barrier, contact us through the
            {' '}
            <Link href="/contact" className="text-primary hover:underline">Contact page</Link>
            {' '}
            and include the page URL, device, and browser version.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
