import type { Metadata } from 'next';
import { PrivacyPolicyContent } from '@/components/legal/privacy-policy-content';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how Ticket95 collects, uses, shares, and protects your personal information.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return <PrivacyPolicyContent />;
}
