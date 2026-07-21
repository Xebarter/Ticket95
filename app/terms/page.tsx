import type { Metadata } from 'next';
import { TermsOfServiceContent } from '@/components/legal/terms-of-service-content';

export const metadata: Metadata = {
  title: 'Terms of Service | Ticket95.com',
  description:
    'Read the Ticket95.com Terms of Service governing ticket purchases, event listings, payments, refunds, and platform use.',
};

export default function TermsPage() {
  return <TermsOfServiceContent />;
}
