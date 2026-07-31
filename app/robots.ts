import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/',
          '/favicon.ico',
          '/favicon-32x32.png',
          '/favicon-48x48.png',
          '/favicon-96x96.png',
          '/apple-touch-icon.png',
          '/web-app-manifest-192x192.png',
          '/web-app-manifest-512x512.png',
        ],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/profile',
          '/profile/',
          '/organizer',
          '/organizer/',
          '/api/',
          '/verify',
          '/verify/',
          '/payment-complete',
          '/unsubscribe',
          '/auth/',
          '/dashboard',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
