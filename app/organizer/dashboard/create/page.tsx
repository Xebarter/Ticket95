import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';
import ProfileLayoutShell from '@/app/profile/ProfileLayoutShell';

export default function CreateEventPage() {
  return (
    <ProfileLayoutShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <EventCreationWizard />
      </div>
    </ProfileLayoutShell>
  );
}
