import type { Metadata } from 'next';
import { CookiesPolicyContent } from '@/components/legal/cookies-policy-content';

export const metadata: Metadata = {
  title: 'Cookies Policy | Ticket95.com',
  description:
    'Learn how Ticket95.com uses cookies and similar technologies, how long they last, and how to manage your preferences.',
};

export default function CookiesPage() {
  return <CookiesPolicyContent />;
}
