import type { Metadata } from 'next';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy | Ticket95.com',
  description: 'Understand what personal information Ticket95.com collects and how it is used.',
};

export default function PrivacyPage() {
  return (
    <StaticPageLayout
      title="Privacy Policy"
      description="This policy explains what data we collect, how we use it, and how we protect your personal information."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-8 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Information we collect</h2>
          <p className="mt-2">We collect account details, order and ticket records, event management data, and support interactions.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">How we use your data</h2>
          <p className="mt-2">Data is used to authenticate users, process payments, issue tickets, detect fraud, and improve platform reliability.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Payment and transaction data</h2>
          <p className="mt-2">Payments are processed by authorized providers. We store references and status updates needed for order support.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Data sharing</h2>
          <p className="mt-2">We only share data with service providers and organizers when necessary to deliver tickets and support event operations.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Data retention</h2>
          <p className="mt-2">We retain data for business, legal, security, and dispute-resolution purposes, then delete or anonymize it when possible.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Your rights</h2>
          <p className="mt-2">You may request access, correction, or deletion of personal data where legally applicable.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
          <p className="mt-2">We apply technical and organizational controls to protect data from unauthorized access and misuse.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Policy updates</h2>
          <p className="mt-2">We may update this policy to reflect legal, operational, or product changes. Material updates are clearly communicated.</p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
