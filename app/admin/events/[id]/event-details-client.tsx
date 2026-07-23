'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FeaturedToggle } from '@/components/admin/featured-toggle';
import { useToast } from '@/hooks/use-toast';
import { getEventCategoryLabel } from '@/lib/event-categories';
import { formatEventDateRange } from '@/lib/event-display';
import { cn } from '@/lib/utils';
import type { AdminEventDetails, AdminEventStats } from '@/lib/admin-event-details';
import type { Order } from '@/lib/supabase-client';

const AdminEventEdit = dynamic(
  () => import('../../dashboard/event-edit').then((mod) => mod.default),
  { ssr: false }
);

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(amount: number, currency?: string | null) {
  const code = currency || 'UGX';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'UGX' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString()}`;
  }
}

function statusClass(status: string) {
  if (status === 'pending') return 'border-amber-500/35 bg-amber-500/10 text-amber-900';
  if (status === 'approved') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800';
  if (status === 'rejected') return 'border-red-500/35 bg-red-500/10 text-red-800';
  if (status === 'expired') return 'border-slate-500/35 bg-slate-500/10 text-slate-700';
  if (status === 'completed') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800';
  if (status === 'failed') return 'border-red-500/35 bg-red-500/10 text-red-800';
  return 'border-border bg-muted text-muted-foreground';
}

export default function AdminEventDetailsClient({
  event: initialEvent,
  stats,
  recentOrders,
}: {
  event: AdminEventDetails;
  stats: AdminEventStats;
  recentOrders: Pick<Order, 'id' | 'quantity' | 'total_price' | 'currency' | 'status' | 'created_at'>[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [event, setEvent] = useState(initialEvent);
  const [busy, setBusy] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState('');

  const images =
    event.image_urls && event.image_urls.length > 0
      ? event.image_urls
      : event.image_url
        ? [event.image_url]
        : [];

  const refresh = () => router.refresh();

  const setStatus = async (approved: boolean) => {
    setBusy(approved ? 'approve' : 'reject');
    try {
      const res = await fetch(`/api/admin/events/${event.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Update failed');
      }
      toast({
        title: approved ? 'Approved' : 'Rejected',
        description: approved ? `${event.name} is live.` : `${event.name} was rejected.`,
      });
      setRejectOpen(false);
      setNote('');
      setEvent((prev) => ({
        ...prev,
        status: approved ? 'approved' : 'rejected',
        lifecycleStatus: approved ? 'approved' : 'rejected',
        rejection_reason: approved ? undefined : note.trim() || prev.rejection_reason,
      }));
      refresh();
    } catch (err) {
      toast({
        title: approved ? 'Couldn’t approve' : 'Couldn’t reject',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast({
        title: 'Event deleted',
        description: `${event.name} and related records were removed.`,
      });
      router.push('/admin/events');
      router.refresh();
    } catch (err) {
      toast({
        title: 'Couldn’t delete event',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
      setBusy(null);
    }
  };

  const isPending = event.lifecycleStatus === 'pending' || event.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 rounded-xl px-2">
            <Link href="/admin/events">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Events
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
            <Badge
              variant="outline"
              className={cn('rounded-full capitalize', statusClass(event.lifecycleStatus))}
            >
              {event.lifecycleStatus}
            </Badge>
            {event.is_featured ? (
              <Badge variant="outline" className="rounded-full text-[10px]">
                Featured
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {getEventCategoryLabel(event.category)} · Created {formatDateTime(event.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FeaturedToggle
            eventId={event.id}
            isFeatured={!!event.is_featured}
            onToggle={refresh}
          />
          <AdminEventEdit event={event} onUpdatedAction={refresh} />
          <Button asChild variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
            <Link href={`/events/${event.id}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Public page
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                disabled={busy === 'delete'}
              >
                {busy === 'delete' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes <strong>{event.name}</strong>
                  {stats.orderCount > 0 || stats.ticketCount > 0
                    ? `, including ${stats.orderCount} order${stats.orderCount === 1 ? '' : 's'} and ${stats.ticketCount} ticket${stats.ticketCount === 1 ? '' : 's'}`
                    : ''}
                  . This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={(e) => {
                    e.preventDefault();
                    void handleDelete();
                  }}
                >
                  Delete event
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <p className="text-sm font-medium">Awaiting review</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-xl"
              disabled={!!busy}
              onClick={() => void setStatus(true)}
            >
              {busy === 'approve' ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant={rejectOpen ? 'secondary' : 'outline'}
              className="rounded-xl"
              disabled={!!busy}
              onClick={() => setRejectOpen((v) => !v)}
            >
              <X className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
          </div>
          {rejectOpen ? (
            <div className="space-y-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the organizer"
                rows={2}
                className="resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setRejectOpen(false);
                    setNote('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  disabled={!!busy}
                  onClick={() => void setStatus(false)}
                >
                  {busy === 'reject' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Confirm reject
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {event.status === 'rejected' && event.rejection_reason ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-800">
          Rejection note: {event.rejection_reason}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders" value={String(stats.orderCount)} hint={`${stats.completedOrders} completed`} />
        <Stat label="Tickets" value={String(stats.ticketCount)} hint={`${stats.validTickets} valid · ${stats.usedTickets} used`} />
        <Stat
          label="Capacity"
          value={`${Math.max(event.total_tickets - event.tickets_available, 0)} / ${event.total_tickets}`}
          hint="Sold / total"
        />
        <Stat
          label="Revenue"
          value={formatMoney(stats.revenue, event.currency)}
          hint="Completed orders"
        />
      </div>

      {images.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">Photos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-muted"
              >
                <Image src={src} alt="" fill className="object-cover" />
                {index === 0 ? (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-border/70 p-4">
          <h2 className="text-sm font-semibold tracking-tight">Event details</h2>
          <DetailRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="When"
            value={
              event.end_date
                ? formatEventDateRange(event)
                : formatDateTime(event.date)
            }
          />
          <DetailRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={event.venue} />
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="Organizer"
            value={event.organizer_name}
          />
          {event.organizer_phone ? (
            <DetailRow
              icon={<Phone className="h-4 w-4" />}
              label="Phone"
              value={event.organizer_phone}
            />
          ) : null}
          {event.description ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No description provided.</p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-border/70 p-4">
          <h2 className="text-sm font-semibold tracking-tight">Ticket types</h2>
          {event.ticket_types.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ticket types — base price {formatMoney(event.ticket_price, event.currency)}
            </p>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
              {event.ticket_types.map((tt) => (
                <div
                  key={tt.id}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{tt.name}</p>
                    {tt.description ? (
                      <p className="text-xs text-muted-foreground">{tt.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tt.available_quantity} left of {tt.total_quantity}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums font-medium">
                    {formatMoney(tt.price, event.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3 rounded-2xl border border-border/70 p-4">
        <h2 className="text-sm font-semibold tracking-tight">Sponsors</h2>
        {event.sponsors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsors</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {event.sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
              >
                {sponsor.logo_url ? (
                  <div className="relative h-8 w-8 overflow-hidden rounded-md bg-background">
                    <Image src={sponsor.logo_url} alt="" fill className="object-contain p-0.5" />
                  </div>
                ) : null}
                <span className="text-sm font-medium">{sponsor.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Recent orders</h2>
          <span className="text-xs text-muted-foreground tabular-nums">{stats.orderCount} total</span>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-3 py-2 font-mono text-xs">
                      {order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{order.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatMoney(Number(order.total_price || 0), order.currency || event.currency)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={cn('rounded-full text-[10px] capitalize', statusClass(order.status))}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}
