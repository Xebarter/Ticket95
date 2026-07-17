'use client';

import { useRouter } from 'next/navigation';
import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';

export default function AdminCreateEventPage() {
  const router = useRouter();

  return (
    <EventCreationWizard
      context="admin"
      onCancel={() => {
        router.push('/admin/events');
      }}
      onDone={() => {
        router.push('/admin/events');
      }}
    />
  );
}
