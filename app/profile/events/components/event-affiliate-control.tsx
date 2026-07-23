'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Event } from '@/lib/supabase-client';
import { updateEvent } from '@/lib/supabase-db';
import {
  DEFAULT_AFFILIATE_COMMISSION_PERCENT,
  MIN_AFFILIATE_COMMISSION_PERCENT,
  MAX_AFFILIATE_COMMISSION_PERCENT,
  clampAffiliateCommissionPercent,
} from '@/lib/affiliate-constants';
import { cn } from '@/lib/utils';
import { ArrowRight, BadgePercent, Handshake, Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Props = {
  event: Event;
  onUpdated: (patch: Partial<Event>) => void;
};

export function EventAffiliateControl({ event, onUpdated }: Props) {
  const { toast } = useToast();
  const enabled = Boolean(event.affiliates_enabled);
  const rate = clampAffiliateCommissionPercent(
    event.affiliate_commission_percent ?? DEFAULT_AFFILIATE_COMMISSION_PERCENT
  );

  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState(String(rate));
  const [saving, setSaving] = useState(false);

  const openDialog = () => {
    setPercent(String(rate));
    setOpen(true);
  };

  const persist = async (next: { enabled: boolean; percent: number }) => {
    setSaving(true);
    try {
      const updated = await updateEvent(event.id, {
        affiliates_enabled: next.enabled,
        affiliate_commission_percent: next.percent,
      });
      onUpdated({
        affiliates_enabled: next.enabled,
        affiliate_commission_percent:
          updated.affiliate_commission_percent ?? next.percent,
      });
      setOpen(false);
      toast({
        title: next.enabled ? 'Affiliates enabled' : 'Affiliates turned off',
        description: next.enabled
          ? `Partners earn ${next.percent}% on referred sales.`
          : 'This event is no longer open to affiliate promotion.',
      });
    } catch (error) {
      toast({
        title: 'Couldn’t update affiliates',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5',
          enabled
            ? 'border-slate-700/80 bg-[#11141c]'
            : 'border-slate-200/90 bg-gradient-to-br from-slate-50 to-white dark:border-slate-700/70 dark:from-slate-900/80 dark:to-slate-950/90'
        )}
      >
        <div
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-[3px]',
            enabled ? 'bg-[#9A7B2F]' : 'bg-slate-300 dark:bg-slate-600'
          )}
        />
        {enabled ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(154,123,47,0.14),_transparent_55%)]"
          />
        ) : (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(15,23,42,0.04),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(148,163,184,0.08),_transparent_55%)]"
          />
        )}

        <div className="relative flex flex-col gap-3 pl-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                enabled
                  ? 'border-[#9A7B2F]/35 bg-[#9A7B2F]/12 text-[#c4a45a]'
                  : 'border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
              )}
            >
              {enabled ? <Handshake className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              {enabled ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold tracking-tight text-slate-100">
                      Affiliates live
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#9A7B2F]/30 bg-[#9A7B2F]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#c4a45a]">
                      <BadgePercent className="h-3 w-3" />
                      {rate}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Partners can share this event and earn on completed sales.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    Grow with affiliates
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Let promoters share your link. You choose their commission — minimum{' '}
                    {MIN_AFFILIATE_COMMISSION_PERCENT}%.
                  </p>
                </>
              )}
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant={enabled ? 'outline' : 'default'}
            onClick={openDialog}
            className={cn(
              'h-9 shrink-0 rounded-lg sm:min-w-[8.5rem]',
              enabled
                ? 'border-slate-600 bg-transparent text-slate-200 hover:border-[#9A7B2F]/50 hover:bg-[#9A7B2F]/10 hover:text-[#d4b46a]'
                : 'bg-slate-900 font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
            )}
          >
            {enabled ? (
              'Manage'
            ) : (
              <>
                Set up
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md overflow-hidden border-slate-700 bg-[#11141c] p-0 text-slate-100 sm:rounded-2xl">
          <div className="h-px bg-gradient-to-r from-transparent via-[#9A7B2F]/70 to-transparent" />

          <DialogHeader className="space-y-2 px-5 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-lg text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80">
                {enabled ? (
                  <Handshake className="h-4 w-4 text-[#c4a45a]" />
                ) : (
                  <Share2 className="h-4 w-4 text-slate-200" />
                )}
              </span>
              {enabled ? 'Manage affiliates' : 'Enable affiliates'}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-400">
              {enabled
                ? 'Update the commission rate or turn affiliates off for this event.'
                : 'Partners promote your event with a unique link. You set what they earn on each referred sale.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-5 py-4">
            <Label
              htmlFor="event-affiliate-percent"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
            >
              Commission rate
            </Label>
            <div className="relative">
              <Input
                id="event-affiliate-percent"
                type="number"
                min={MIN_AFFILIATE_COMMISSION_PERCENT}
                max={MAX_AFFILIATE_COMMISSION_PERCENT}
                step={0.5}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                onBlur={() => setPercent(String(clampAffiliateCommissionPercent(percent)))}
                className="h-11 rounded-lg border-slate-600 bg-slate-900/60 pr-10 text-base text-white"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                %
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Between {MIN_AFFILIATE_COMMISSION_PERCENT}% and {MAX_AFFILIATE_COMMISSION_PERCENT}%.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-slate-800 bg-slate-950/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            {enabled ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                onClick={() =>
                  void persist({
                    enabled: false,
                    percent: clampAffiliateCommissionPercent(percent),
                  })
                }
                disabled={saving}
              >
                Turn off
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              className="rounded-lg bg-slate-100 font-semibold text-slate-900 hover:bg-white"
              onClick={() =>
                void persist({
                  enabled: true,
                  percent: clampAffiliateCommissionPercent(percent),
                })
              }
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {enabled ? 'Save changes' : 'Enable affiliates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Compact marker for event picker cards */
export function EventAffiliateChip({
  enabled,
  onDark = false,
}: {
  enabled?: boolean;
  onDark?: boolean;
}) {
  if (!enabled) return null;
  return (
    <span
      className={cn(
        'inline-flex h-4 shrink-0 items-center gap-0.5 rounded px-1',
        onDark
          ? 'bg-white/15 text-white/90'
          : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
      )}
      title="Affiliates enabled"
    >
      <Handshake className="h-2.5 w-2.5" />
    </span>
  );
}
