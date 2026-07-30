import type { Metadata } from 'next';
import { CookiesPolicyContent } from '@/components/legal/cookies-policy-content';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cookies Policy',
  description:
    'Learn how Ticket95 uses cookies and similar technologies, how long they last, and how to manage your preferences.',
  path: '/cookies',
});

export default function CookiesPage() {
  return <CookiesPolicyContent />;
}
