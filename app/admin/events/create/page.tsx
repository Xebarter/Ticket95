'use client';

import { useRouter } from 'next/navigation';
import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';

export default function AdminCreateEventPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-5xl">
      <EventCreationWizard
        context="admin"
        onCancel={() => {
          router.push('/admin/events');
        }}
        onDone={() => {
          router.push('/admin/events');
        }}
      />
    </div>
  );
}
