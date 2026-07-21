import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MessageSquare } from 'lucide-react';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact Us | Ticket95.com',
  description: 'Contact Ticket95.com support for account, ticket, organizer, and payment help.',
};

const SUPPORT_EMAIL = 'support@ticket95.com';

export default function ContactPage() {
  return (
    <StaticPageLayout
      title="Contact Us"
      description="Send us a message and we will get back to you as soon as possible."
      lastUpdated="July 21, 2026"
    >
      <div className="mx-auto max-w-5xl space-y-8">
        <p className="text-center text-sm text-muted-foreground">
          Looking for quick answers? Visit the{' '}
          <Link href="/help" className="font-medium text-primary hover:underline">
            Help Center
          </Link>{' '}
          or browse the{' '}
          <Link href="/faq" className="font-medium text-primary hover:underline">
            FAQ
          </Link>
          .
        </p>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <ContactForm />

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
              <h2 className="text-sm font-semibold tracking-tight">Direct contact</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="mt-0.5 block text-muted-foreground hover:text-primary hover:underline"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Response time</p>
                    <p className="mt-0.5 text-muted-foreground">Mon–Fri, 8:00 AM – 8:00 PM UTC</p>
                    <p className="text-muted-foreground">Sat, 9:00 AM – 4:00 PM UTC</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Organizers</p>
                    <a
                      href="mailto:organizers@ticket95.com"
                      className="mt-0.5 block text-muted-foreground hover:text-primary hover:underline"
                    >
                      organizers@ticket95.com
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            <p className="rounded-2xl border border-dashed border-border/70 px-5 py-4 text-sm text-muted-foreground">
              Include your order or ticket ID when writing about a purchase so we can help faster.
            </p>
          </aside>
        </div>
      </div>
    </StaticPageLayout>
  );
}
