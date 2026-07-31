import { ImageResponse } from 'next/og';
import {
  BrandOgMarkup,
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
} from '@/components/seo/brand-og-markup';
import { getEventById } from '@/lib/supabase-db';
import { getEventShareImage } from '@/lib/site-url';

export const alt = 'Ticket95 event';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EventOpenGraphImage({ params }: Props) {
  const { id } = await Promise.resolve(params);
  const event = await getEventById(id);
  const shareImage = event && event.status === 'approved' ? getEventShareImage(event) : null;

  if (shareImage?.url) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: '#0f172a',
          }}
        >
          {/* External event cover — social crawlers fetch this same-origin route */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shareImage.url}
            alt={shareImage.alt}
            width={OG_IMAGE_SIZE.width}
            height={OG_IMAGE_SIZE.height}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ),
      { ...OG_IMAGE_SIZE }
    );
  }

  return new ImageResponse(<BrandOgMarkup />, { ...OG_IMAGE_SIZE });
}
