import type { Metadata } from 'next';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Terms of Service | Ticket95.com',
  description: 'Read the terms governing your use of Ticket95.com services.',
};

export default function TermsPage() {
  return (
    <StaticPageLayout
      title="Terms of Service"
      description="These terms govern your access to and use of Ticket95.com as a buyer, organizer, or administrator."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-8 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of terms</h2>
          <p className="mt-2">By creating an account, purchasing tickets, or listing events, you agree to these terms and our policies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Account responsibilities</h2>
          <p className="mt-2">You are responsible for keeping account credentials secure and for activity performed under your account.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Ticket purchases</h2>
          <p className="mt-2">Ticket availability, pricing, fees, and limits may change at any time before successful checkout confirmation.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Event organizer obligations</h2>
          <p className="mt-2">Organizers must provide accurate event details, honor published schedules, and comply with local regulations.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Prohibited use</h2>
          <p className="mt-2">You must not use automated abuse, fraud, unauthorized access, scraping, or any action that disrupts the platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Cancellations and refunds</h2>
          <p className="mt-2">Refund eligibility depends on event policy and timing. Refer to the Refund Policy for detailed conditions.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Intellectual property</h2>
          <p className="mt-2">Platform branding, content, and software are protected and may not be copied or reused without permission.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Service availability</h2>
          <p className="mt-2">We aim for reliable uptime but do not guarantee uninterrupted operation or error-free performance.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Limitation of liability</h2>
          <p className="mt-2">To the extent permitted by law, Ticket95.com is not liable for indirect or consequential losses.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">10. Changes to terms</h2>
          <p className="mt-2">We may update these terms periodically. Continued use after changes indicates acceptance of revised terms.</p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
