import type { Metadata } from 'next';
import { RefundPolicyContent } from '@/components/legal/refund-policy-content';

export const metadata: Metadata = {
  title: 'Refund Policy | Ticket95.com',
  description:
    'Learn when Ticket95.com ticket purchases are eligible for refunds and how to submit a refund request.',
};

export default function RefundPolicyPage() {
  return <RefundPolicyContent />;
}
