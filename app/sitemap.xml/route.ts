const getBaseUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.startsWith('http')) {
    return configured.replace(/\/+$/, '');
  }
  return 'https://ticket95.com';
};

export async function GET() {
  const baseUrl = getBaseUrl();
  const routes = [
    '/',
    '/events',
    '/login',
    '/signup',
    '/profile',
    '/profile/tickets',
    '/profile/orders',
    '/profile/events',
    '/profile/analytics',
    '/profile/verify',
    '/organizer/dashboard/create',
    '/admin/dashboard',
    '/admin/events',
    '/admin/settings',
    '/admin/verify',
    '/help',
    '/contact',
    '/faq',
    '/terms',
    '/privacy',
    '/refund-policy',
    '/accessibility',
    '/cookies',
    '/sitemap',
  ];

  const lastModified = new Date().toISOString();
  const urlset = routes
    .map((route) => {
      const priority = route === '/' ? '1.0' : route === '/events' ? '0.9' : '0.7';
      const changeFrequency = route === '/' || route === '/events' ? 'daily' : 'weekly';
      return `<url><loc>${baseUrl}${route}</loc><lastmod>${lastModified}</lastmod><changefreq>${changeFrequency}</changefreq><priority>${priority}</priority></url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
