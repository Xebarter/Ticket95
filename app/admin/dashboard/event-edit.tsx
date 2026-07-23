'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Navigates to the full event edit wizard (same flow as create, pre-filled). */
export default function AdminEventEdit({
  event,
  onUpdatedAction: _onUpdatedAction,
}: {
  event: { id: string };
  onUpdatedAction?: () => void;
}) {
  return (
    <Button asChild variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
      <Link href={`/admin/events/${event.id}/edit`}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Link>
    </Button>
  );
}
