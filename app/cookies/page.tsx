import type { Metadata } from 'next';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Cookie Policy | Ticket95.com',
  description: 'Learn how Ticket95.com uses cookies and similar technologies.',
};

export default function CookiesPage() {
  return (
    <StaticPageLayout
      title="Cookie Policy"
      description="This page explains what cookies are used on Ticket95.com and how they support security, performance, and user experience."
      lastUpdated="March 16, 2026"
    >
      <div className="space-y-8 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">What are cookies?</h2>
          <p className="mt-2">Cookies are small text files stored in your browser that help websites remember preferences and session state.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">How we use cookies</h2>
          <ul className="mt-2 space-y-2">
            <li>Authentication and session continuity.</li>
            <li>Security controls and fraud prevention.</li>
            <li>Performance monitoring and reliability improvements.</li>
            <li>User preference storage, such as theme or locale.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Third-party technologies</h2>
          <p className="mt-2">
            Some trusted providers may set cookies or similar identifiers when supporting analytics, payment flow, or anti-abuse checks.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Managing cookies</h2>
          <p className="mt-2">
            You can control cookies in your browser settings. Disabling essential cookies may affect login, checkout, and ticket access.
          </p>
        </section>
      </div>
    </StaticPageLayout>
  );
}
