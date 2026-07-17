import { Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminStats from './stats';
import AdminEventList from './event-list';
import { Activity, ShieldCheck } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <>
      <header className="mb-6 sm:mb-8">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
              Professional moderation cockpit
            </Badge>
            <Badge variant="secondary" className="rounded-full">
              Mobile responsive
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Marketplace trust and event quality at a glance
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Use this dashboard to review incoming submissions, approve high-quality listings, and
                keep featured inventory aligned with your brand standards.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[320px]">
              <Card className="border-border/80 bg-card/70">
                <CardHeader className="p-3 pb-1">
                  <CardDescription className="text-xs">Workflow status</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="inline-flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Active moderation
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/80 bg-card/70">
                <CardHeader className="p-3 pb-1">
                  <CardDescription className="text-xs">Quality posture</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="inline-flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Trust-first controls
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </header>

      <section id="overview" aria-labelledby="admin-stats-heading" className="mb-8 sm:mb-10">
        <h2 id="admin-stats-heading" className="sr-only">
          Overview
        </h2>
        <Suspense fallback={<div>Loading stats...</div>}>
          <AdminStats />
        </Suspense>
      </section>

      <Separator className="mb-8" />

      <section id="review-queue" aria-labelledby="admin-events-heading">
        <div className="mb-4">
          <div>
            <h2
              id="admin-events-heading"
              className="text-lg sm:text-xl font-semibold tracking-tight"
            >
              Review queue
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Approve, reject, and edit listings with clear visibility into event quality and readiness.
            </p>
          </div>
        </div>
        <Suspense fallback={<div>Loading events...</div>}>
          <AdminEventList />
        </Suspense>
      </section>
    </>
  );
}

