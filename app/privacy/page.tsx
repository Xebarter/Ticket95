import type { Metadata } from 'next';
import { PrivacyPolicyContent } from '@/components/legal/privacy-policy-content';

export const metadata: Metadata = {
  title: 'Privacy Policy | Ticket95.com',
  description:
    'Learn how Ticket95.com collects, uses, shares, and protects your personal information.',
};

export default function PrivacyPage() {
  return <PrivacyPolicyContent />;
}
