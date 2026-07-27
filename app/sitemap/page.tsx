import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { getOrRestoreSession } from '@/lib/session-restore';

export const metadata: Metadata = {
  title: 'Sitemap | Ticket95.com',
  description: 'Browse all primary Ticket95.com pages from one location.',
};

const publicGroups = [
  {
    title: 'Discover',
    links: [
      { href: '/', label: 'Home' },
      { href: '/events', label: 'Events' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Login' },
      { href: '/signup', label: 'Sign up' },
    ],
  },
  {
    title: 'Support and legal',
    links: [
      { href: '/help', label: 'Help Center' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/faq', label: 'FAQ' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/refund-policy', label: 'Refund Policy' },
      { href: '/accessibility', label: 'Accessibility' },
      { href: '/cookies', label: 'Cookie Policy' },
    ],
  },
];

const signedInGroups = [
  {
    title: 'Account and profile',
    links: [
      { href: '/profile', label: 'Profile overview' },
      { href: '/profile/tickets', label: 'My tickets' },
      { href: '/profile/orders', label: 'My orders' },
      { href: '/profile/events', label: 'My events' },
      { href: '/profile/analytics', label: 'Analytics' },
      { href: '/profile/verify', label: 'Ticket verification' },
    ],
  },
  {
    title: 'Organizer',
    links: [{ href: '/organizer/dashboard/create', label: 'Create event' }],
  },
];

export default async function SitemapPage() {
  const session = await getOrRestoreSession();
  const pageGroups = session
    ? [publicGroups[0], ...signedInGroups, publicGroups[2]]
    : publicGroups;

  return (
    <StaticPageLayout
      title="Sitemap"
      description="Quick navigation to Ticket95.com pages for buyers and organizers."
      lastUpdated="March 16, 2026"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {pageGroups.map((group) => (
          <section key={group.title} className="rounded-xl border border-border/70 p-5">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-primary hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </StaticPageLayout>
  );
}
