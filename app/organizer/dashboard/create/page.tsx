import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';
import ProfileLayoutShell from '@/app/profile/ProfileLayoutShell';

export default function CreateEventPage() {
  return (
    <ProfileLayoutShell>
      <EventCreationWizard />
    </ProfileLayoutShell>
  );
}
