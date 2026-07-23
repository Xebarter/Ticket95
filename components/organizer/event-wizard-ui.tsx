'use client';

import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WizardStepKey = 'basic' | 'pricing' | 'organizer' | 'sponsors' | 'review';

export const WIZARD_STEP_ICONS: Record<WizardStepKey, LucideIcon> = {
  basic: CalendarDays,
  pricing: Ticket,
  organizer: UserRound,
  sponsors: Users,
  review: ClipboardCheck,
};

type WizardStep = { key: WizardStepKey; title: string };

export function WizardPageHeader({
  mode,
  isAdminContext,
  onCancel,
}: {
  mode: 'create' | 'edit';
  isAdminContext: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {isAdminContext && onCancel ? (
          <Button variant="ghost" size="sm" className="mb-2 h-8 px-0 text-muted-foreground" onClick={onCancel}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {mode === 'edit' ? 'Edit event' : 'Create event'}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {mode === 'edit'
            ? 'Update any section below. Your changes are saved when you finish the review step.'
            : isAdminContext
              ? 'Set up a new listing on Ticket95 — all steps are saved when you submit.'
              : 'Build your event step by step. An admin reviews new events before they go live.'}
        </p>
      </div>
      <div className="shrink-0 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {mode === 'edit' ? 'Editing' : 'New event'}
      </div>
    </div>
  );
}

export function WizardStepSidebar({
  steps,
  currentStepIndex,
  step,
  loading,
  onStepClick,
  isStepValid,
}: {
  steps: WizardStep[];
  currentStepIndex: number;
  step: WizardStepKey;
  loading: boolean;
  onStepClick: (key: WizardStepKey) => void;
  isStepValid: (key: WizardStepKey) => boolean;
}) {
  return (
    <nav className="space-y-1" aria-label="Event wizard steps">
      {steps.map((s, idx) => {
        const active = step === s.key;
        const done = idx < currentStepIndex && isStepValid(s.key);
        const Icon = WIZARD_STEP_ICONS[s.key];

        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onStepClick(s.key)}
            disabled={loading}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : done
                  ? 'text-foreground hover:bg-muted/60'
                  : 'text-muted-foreground hover:bg-muted/40',
              loading && 'cursor-not-allowed opacity-60'
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                active ? 'bg-primary-foreground/15' : done ? 'bg-primary/10 text-primary' : 'bg-muted'
              )}
            >
              {done && !active ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wide opacity-80">
                Step {idx + 1}
              </span>
              <span className="block truncate text-sm font-semibold">{s.title}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function WizardMobileStepper({
  steps,
  currentStepIndex,
  step,
  loading,
  onStepClick,
  isStepValid,
}: {
  steps: WizardStep[];
  currentStepIndex: number;
  step: WizardStepKey;
  loading: boolean;
  onStepClick: (key: WizardStepKey) => void;
  isStepValid: (key: WizardStepKey) => boolean;
}) {
  return (
    <div className="space-y-3 lg:hidden">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <span className="font-medium text-foreground">{steps[currentStepIndex]?.title}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {steps.map((s, idx) => {
          const active = step === s.key;
          const done = idx < currentStepIndex && isStepValid(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onStepClick(s.key)}
              disabled={loading}
              aria-current={active ? 'step' : undefined}
              aria-label={s.title}
              className={cn(
                'flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : done
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {done && !active ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
            </button>
          );
        })}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function WizardPanel({
  embedded,
  stepTitle,
  stepDescription,
  children,
  footer,
}: {
  embedded: boolean;
  stepTitle: string;
  stepDescription: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden',
        embedded ? 'rounded-xl' : 'rounded-2xl border border-border/70 bg-card shadow-sm'
      )}
    >
      <div
        className={cn(
          'border-border/70 px-4 py-4 sm:px-6 sm:py-5',
          embedded ? 'border-b bg-muted/20' : 'border-b bg-muted/10'
        )}
      >
        <h2 className="text-lg font-semibold tracking-tight">{stepTitle}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{stepDescription}</p>
      </div>

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">{children}</div>

      <div
        className={cn(
          'sticky bottom-0 border-t border-border/70 px-4 py-4 sm:px-6',
          embedded ? 'bg-card/95 backdrop-blur-sm' : 'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80'
        )}
      >
        {footer}
      </div>
    </div>
  );
}

export function WizardField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function WizardSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-muted/10 p-4 sm:p-5',
        className
      )}
    >
      {title || description ? (
        <div className="mb-4 flex items-start gap-3">
          {Icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function WizardReviewItem({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            Edit
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-medium leading-snug">{value}</p>
    </div>
  );
}

export function WizardFooterNav({
  canGoBack,
  canGoForward,
  loading,
  isReview,
  mode,
  isAdminContext,
  nextLabel,
  onBack,
  onNext,
  onSubmit,
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  isReview: boolean;
  mode: 'create' | 'edit';
  isAdminContext: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack || loading}
        className="flex-1 rounded-xl"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      {isReview ? (
        <Button onClick={onSubmit} disabled={loading} className="flex-1 rounded-xl">
          {loading
            ? mode === 'edit'
              ? 'Saving…'
              : 'Creating…'
            : mode === 'edit'
              ? 'Save changes'
              : isAdminContext
                ? 'Create event'
                : 'Submit for approval'}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoForward || loading}
          className="flex-1 rounded-xl"
        >
          {nextLabel}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function WizardSuccessState({
  mode,
  isAdminContext,
}: {
  mode: 'create' | 'edit';
  isAdminContext: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card px-6 py-16 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">
        {mode === 'edit' ? 'Event updated' : 'Event submitted'}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {mode === 'edit'
          ? 'Your changes have been saved. Redirecting you now…'
          : isAdminContext
            ? 'The event is live in the admin dashboard. Redirecting…'
            : 'Your event is with the review team. Redirecting to your profile…'}
      </p>
    </div>
  );
}

export function WizardLoadingOverlay({
  loading,
  uploadComplete,
  loadingMessage,
  mode,
  uploadProgress,
}: {
  loading: boolean;
  uploadComplete: boolean;
  loadingMessage: string;
  mode: 'create' | 'edit';
  uploadProgress: number;
}) {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xs text-center">
        {uploadComplete ? (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
        ) : (
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
        <p className="mt-3 text-sm font-medium">
          {loadingMessage || (mode === 'edit' ? 'Saving…' : 'Creating…')}
        </p>
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">{uploadProgress}%</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
