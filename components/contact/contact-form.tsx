'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/lib/supabase-auth-context';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'general', label: 'General inquiry' },
  { value: 'tickets', label: 'Tickets & event entry' },
  { value: 'payments', label: 'Payments & refunds' },
  { value: 'account', label: 'Account help' },
  { value: 'organizer', label: 'Organizer support' },
  { value: 'other', label: 'Something else' },
] as const;

type ContactFormState = {
  name: string;
  email: string;
  category: (typeof CATEGORIES)[number]['value'];
  orderReference: string;
  eventName: string;
  message: string;
};

const inputClassName =
  'h-11 rounded-xl border-border/80 bg-background shadow-none focus-visible:ring-primary/20';

export function ContactForm() {
  const { user, loading } = useAuth();

  const prefill = useMemo(
    () => ({
      name: user?.profile_name ?? '',
      email: user?.email ?? '',
    }),
    [user]
  );

  const [form, setForm] = useState<ContactFormState>({
    name: '',
    email: '',
    category: 'general',
    orderReference: '',
    eventName: '',
    message: '',
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (loading) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || prefill.name,
      email: prev.email || prefill.email,
    }));
  }, [loading, prefill.email, prefill.name]);

  const canSubmit =
    form.email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.message.trim().length >= 10;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!canSubmit) {
      setError('Enter a valid email and a message of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const categoryLabel =
        CATEGORIES.find((c) => c.value === form.category)?.label ?? 'Support request';

      const res = await fetch('/api/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || null,
          email: form.email.trim(),
          category: form.category,
          subject: categoryLabel,
          orderReference: form.orderReference.trim() || null,
          eventName: form.eventName.trim() || null,
          message: form.message.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to submit message.');
      }

      setSuccess(true);
      setForm((prev) => ({
        ...prev,
        orderReference: '',
        eventName: '',
        message: '',
      }));
      setDetailsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
      {/* Keep DOM structure stable to avoid React hydration/offscreen warnings */}
      <div
        className={cn(success ? 'hidden' : 'block')}
        aria-hidden={success}
      >
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="contact-name" className="text-muted-foreground">
                Name
              </Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Optional"
                autoComplete="name"
                className={inputClassName}
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={inputClassName}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>What do you need help with?</Label>
            <Select
              value={form.category}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, category: v as ContactFormState['category'] }))
              }
            >
              <SelectTrigger className={cn(inputClassName, 'w-full')}>
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message</Label>
            <Textarea
              id="contact-message"
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Describe your issue and include any relevant details."
              rows={5}
              required
              className="min-h-[140px] resize-y rounded-xl border-border/80 bg-background shadow-none focus-visible:ring-primary/20"
            />
          </div>

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-border/70 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                <span>Add order or event details (optional)</span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition-transform', detailsOpen && 'rotate-180')}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-reference" className="text-muted-foreground">
                    Order or ticket ID
                  </Label>
                  <Input
                    id="contact-reference"
                    value={form.orderReference}
                    onChange={(e) => setForm((p) => ({ ...p, orderReference: e.target.value }))}
                    placeholder="Optional"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-event" className="text-muted-foreground">
                    Event name
                  </Label>
                  <Input
                    id="contact-event"
                    value={form.eventName}
                    onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
                    placeholder="Optional"
                    className={inputClassName}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-full"
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Send message'
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By submitting, you agree we may contact you about this request. We never share your message publicly.
          </p>
        </form>
      </div>

      <div className={cn(success ? 'block' : 'hidden')} aria-hidden={!success}>
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Message sent</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Thanks for reaching out. We typically respond within one business day at{' '}
            <span className="font-medium text-foreground">{form.email}</span>.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 rounded-full"
            onClick={() => setSuccess(false)}
          >
            Send another message
          </Button>
        </div>
      </div>
    </div>
  );
}
