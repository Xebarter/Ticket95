import { getSiteUrl } from '@/lib/site-url';
import { supabase } from '@/lib/supabase-client';

export const revalidate = 3600;

type SitemapEvent = {
  id: string;
  updated_at: string | null;
  date: string;
  is_featured?: boolean | null;
};

async function getApprovedEventsForSitemap(): Promise<SitemapEvent[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, updated_at, date, is_featured')
      .eq('status', 'approved')
      .order('date', { ascending: true })
      .limit(5000);

    if (error) {
      console.warn('Sitemap events query failed:', error.message);
      return [];
    }
    return (data || []) as SitemapEvent[];
  } catch (error) {
    console.warn('Sitemap events query error:', error);
    return [];
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(input: {
  loc: string;
  lastModified: Date;
  changeFrequency: string;
  priority: string;
}): string {
  return `<url><loc>${escapeXml(input.loc)}</loc><lastmod>${input.lastModified.toISOString()}</lastmod><changefreq>${input.changeFrequency}</changefreq><priority>${input.priority}</priority></url>`;
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticEntries = [
    { loc: siteUrl, changeFrequency: 'daily', priority: '1.0' },
    { loc: `${siteUrl}/events`, changeFrequency: 'daily', priority: '0.95' },
    { loc: `${siteUrl}/help`, changeFrequency: 'monthly', priority: '0.6' },
    { loc: `${siteUrl}/faq`, changeFrequency: 'monthly', priority: '0.7' },
    { loc: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: '0.6' },
    { loc: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: '0.3' },
    { loc: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: '0.3' },
    { loc: `${siteUrl}/refund-policy`, changeFrequency: 'yearly', priority: '0.3' },
    { loc: `${siteUrl}/accessibility`, changeFrequency: 'yearly', priority: '0.3' },
    { loc: `${siteUrl}/cookies`, changeFrequency: 'yearly', priority: '0.3' },
    { loc: `${siteUrl}/sitemap`, changeFrequency: 'weekly', priority: '0.4' },
  ].map((entry) =>
    urlEntry({
      ...entry,
      lastModified: now,
    })
  );

  const events = await getApprovedEventsForSitemap();
  const eventEntries = events.map((event) => {
    const eventDate = new Date(event.date);
    const isUpcoming = eventDate.getTime() >= Date.now() - 24 * 60 * 60 * 1000;
    return urlEntry({
      loc: `${siteUrl}/events/${event.id}`,
      lastModified: event.updated_at ? new Date(event.updated_at) : eventDate,
      changeFrequency: isUpcoming ? 'daily' : 'weekly',
      priority: event.is_featured ? '0.9' : isUpcoming ? '0.8' : '0.5',
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...eventEntries].join('')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
