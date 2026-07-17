import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';

export const metadata: Metadata = {
  title: 'Sitemap | Ticket95.com',
  description: 'Browse all primary Ticket95.com pages from one location.',
};

const pageGroups = [
  {
    title: 'Discover',
    links: [
      { href: '/', label: 'Home' },
      { href: '/events', label: 'Events' },
    ],
  },
  {
    title: 'Account and profile',
    links: [
      { href: '/login', label: 'Login' },
      { href: '/signup', label: 'Sign up' },
      { href: '/profile', label: 'Profile overview' },
      { href: '/profile/tickets', label: 'My tickets' },
      { href: '/profile/orders', label: 'My orders' },
      { href: '/profile/events', label: 'My events' },
      { href: '/profile/analytics', label: 'Analytics' },
      { href: '/profile/verify', label: 'Ticket verification' },
    ],
  },
  {
    title: 'Organizer and admin',
    links: [
      { href: '/organizer/dashboard/create', label: 'Create event' },
      { href: '/admin/dashboard', label: 'Admin dashboard' },
      { href: '/admin/events', label: 'Admin events' },
      { href: '/admin/settings', label: 'Admin settings' },
      { href: '/admin/verify', label: 'Admin verification' },
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

export default function SitemapPage() {
  return (
    <StaticPageLayout
      title="Sitemap"
      description="Quick navigation to Ticket95.com pages for buyers, organizers, and administrators."
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
