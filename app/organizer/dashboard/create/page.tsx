import { EventCreationWizard } from '@/components/organizer/event-creation-wizard';
import ProfileLayoutShell from '@/app/profile/ProfileLayoutShell';

export default function CreateEventPage() {
  return (
    <ProfileLayoutShell>
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Create Event</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and publish a new event while keeping profile navigation available.
          </p>
        </header>
        <EventCreationWizard />
      </div>
    </ProfileLayoutShell>
  );
}
