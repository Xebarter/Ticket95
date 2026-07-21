import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';
import ProfileLayoutShell from '@/app/profile/ProfileLayoutShell';

export default function CreateEventPage() {
  return (
    <ProfileLayoutShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create event</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow the steps. An admin reviews new events before they go live.
          </p>
        </div>
        <EventCreationWizard />
      </div>
    </ProfileLayoutShell>
  );
}
