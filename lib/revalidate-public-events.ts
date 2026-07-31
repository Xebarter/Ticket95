import { revalidatePath } from 'next/cache';

/** Bust Next.js caches for public listings after an event's visibility changes. */
export function revalidatePublicEventPages(eventId?: string) {
  revalidatePath('/');
  revalidatePath('/events');
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
  }
  revalidatePath('/sitemap.xml');
}
