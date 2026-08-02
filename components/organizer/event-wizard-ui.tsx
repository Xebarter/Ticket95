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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {isAdminContext && onCancel ? (
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 h-8 px-0 text-slate-500"
            onClick={onCancel}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.7rem] dark:text-slate-50">
          {mode === 'edit' ? 'Edit event' : 'Create event'}
        </h1>
        <p className="mt-1 text-[13px] text-slate-500 sm:text-sm dark:text-slate-400">
          {mode === 'edit'
            ? 'Update details, then save on Review.'
            : isAdminContext
              ? 'Fill each step, then submit.'
              : 'Goes live after admin approval.'}
        </p>
      </div>
      <span className="w-fit rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1 text-xs font-medium text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
        {mode === 'edit' ? 'Editing' : 'New'}
      </span>
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
    <nav
      className="space-y-1 rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-sky-50/30 to-slate-50/40 p-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-700/60 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/50"
      aria-label="Event wizard steps"
    >
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
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
              active
                ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(37,99,235,0.22)]'
                : done
                  ? 'text-slate-800 hover:bg-sky-50/80 dark:text-slate-100 dark:hover:bg-sky-500/10'
                  : 'text-slate-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-900/70',
              loading && 'cursor-not-allowed opacity-60'
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                active
                  ? 'bg-white/15'
                  : done
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              )}
            >
              {done && !active ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] opacity-70">
                {idx + 1}/{steps.length}
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
    <div className="space-y-2.5 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-white to-sky-50/40 p-3 dark:border-slate-700/60 dark:from-slate-950 dark:to-sky-950/20 lg:hidden">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {currentStepIndex + 1}/{steps.length}
        </span>
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {steps[currentStepIndex]?.title}
        </span>
      </div>
      <div className="flex gap-1.5">
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
                'flex h-9 min-w-0 flex-1 items-center justify-center rounded-xl text-xs font-semibold transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : done
                    ? 'bg-primary/12 text-primary'
                    : 'bg-slate-100/80 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {done && !active ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
            </button>
          );
        })}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-sky-100/80 dark:bg-slate-800">
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
  stepDescription?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden',
        embedded
          ? 'rounded-xl'
          : 'rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-slate-700/60 dark:bg-slate-950'
      )}
    >
      <div
        className={cn(
          'border-slate-200/70 px-4 py-3.5 sm:px-6 sm:py-4 dark:border-slate-800',
          embedded
            ? 'border-b bg-sky-50/40 dark:bg-slate-900/40'
            : 'border-b bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/40 dark:from-sky-950/30 dark:via-slate-950 dark:to-indigo-950/20'
        )}
      >
        <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg dark:text-slate-50">
          {stepTitle}
        </h2>
        {stepDescription ? (
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{stepDescription}</p>
        ) : null}
      </div>

      <div className="relative bg-gradient-to-b from-white to-slate-50/30 px-4 py-4 sm:px-6 sm:py-5 dark:from-slate-950 dark:to-slate-900/20">
        {children}
      </div>

      <div
        className={cn(
          'sticky bottom-0 border-t border-slate-200/70 px-4 py-3.5 sm:px-6 dark:border-slate-800',
          'bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:bg-slate-950/95'
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
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {hint ? <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p> : null}
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
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
        'rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-sky-50/25 p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-4 dark:border-slate-700/60 dark:from-slate-950 dark:to-sky-950/10',
        className
      )}
    >
      {title || description ? (
        <div className="mb-3.5 flex items-center gap-2.5">
          {Icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </div>
          ) : null}
          <div className="min-w-0">
            {title ? (
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="space-y-3.5">{children}</div>
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
    <div className="rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-700/60 dark:bg-slate-950/60">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
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
      <p className="mt-1 text-sm font-medium leading-snug text-slate-900 dark:text-slate-50">
        {value}
      </p>
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
    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack || loading}
        className="h-11 rounded-xl border-slate-200/80 bg-white sm:h-10 sm:flex-1 dark:border-slate-700 dark:bg-slate-950"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      {isReview ? (
        <Button
          onClick={onSubmit}
          disabled={loading}
          className="h-11 rounded-xl shadow-[0_1px_3px_rgba(37,99,235,0.25)] sm:h-10 sm:flex-1"
        >
          {loading
            ? mode === 'edit'
              ? 'Saving…'
              : 'Creating…'
            : mode === 'edit'
              ? 'Save'
              : isAdminContext
                ? 'Create'
                : 'Submit'}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoForward || loading}
          className="h-11 rounded-xl shadow-[0_1px_3px_rgba(37,99,235,0.25)] sm:h-10 sm:flex-1"
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-sky-50/40 to-emerald-50/30 px-6 py-16 text-center shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-slate-700/60 dark:from-slate-950 dark:via-sky-950/20 dark:to-emerald-950/10">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-50">
        {mode === 'edit' ? 'Saved' : 'Submitted'}
      </h2>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        {mode === 'edit'
          ? 'Redirecting…'
          : isAdminContext
            ? 'Redirecting to admin…'
            : 'Pending review. Redirecting…'}
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
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/90 p-6 backdrop-blur-sm dark:bg-slate-950/90">
      <div className="w-full max-w-xs text-center">
        {uploadComplete ? (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
        ) : (
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
        <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-50">
          {loadingMessage || (mode === 'edit' ? 'Saving…' : 'Creating…')}
        </p>
        <p className="mt-1 text-xs tabular-nums text-slate-500">{uploadProgress}%</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sky-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
