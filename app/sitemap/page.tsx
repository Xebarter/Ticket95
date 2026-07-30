import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/layout/static-page-layout';
import { getOrRestoreSession } from '@/lib/session-restore';
import { getApprovedEventsForLanding } from '@/lib/supabase-db';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Sitemap',
  description: 'Browse all primary Ticket95 pages and upcoming events from one location.',
  path: '/sitemap',
});

const publicGroups = [
  {
    title: 'Discover',
    links: [
      { href: '/', label: 'Home' },
      { href: '/events', label: 'Uganda Events' },
      { href: '/events?category=concert', label: 'Concert Tickets' },
      { href: '/events?category=sports', label: 'Sports Tickets' },
      { href: '/events?category=movies', label: 'Movie Tickets' },
      { href: '/events?category=other', label: 'Festivals, Tours & More' },
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
    ? [publicGroups[0], ...signedInGroups, publicGroups[1]]
    : publicGroups;

  let upcomingEvents: Array<{ id: string; name: string }> = [];
  try {
    const events = await getApprovedEventsForLanding(40);
    upcomingEvents = events.map((event) => ({ id: event.id, name: event.name }));
  } catch {
    upcomingEvents = [];
  }

  return (
    <StaticPageLayout
      title="Sitemap"
      description="Quick navigation to Ticket95 pages for buyers and organizers."
      lastUpdated="July 30, 2026"
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

        {upcomingEvents.length > 0 ? (
          <section className="rounded-xl border border-border/70 p-5 sm:col-span-2">
            <h2 className="text-lg font-semibold">Upcoming events</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {event.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </StaticPageLayout>
  );
}
