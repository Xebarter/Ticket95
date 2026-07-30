import type { Metadata } from 'next';
import { TermsOfServiceContent } from '@/components/legal/terms-of-service-content';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Read the Ticket95 Terms of Service governing ticket purchases, event listings, payments, refunds, and platform use.',
  path: '/terms',
});

export default function TermsPage() {
  return <TermsOfServiceContent />;
}
