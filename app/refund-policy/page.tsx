import type { Metadata } from 'next';
import { RefundPolicyContent } from '@/components/legal/refund-policy-content';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Refund Policy',
  description:
    'Learn when Ticket95 ticket purchases are eligible for refunds and how to submit a refund request.',
  path: '/refund-policy',
});

export default function RefundPolicyPage() {
  return <RefundPolicyContent />;
}
