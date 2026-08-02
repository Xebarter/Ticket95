'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfilePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function ProfileMetric({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: 'default' | 'emerald' | 'amber';
}) {
  const iconClass =
    accent === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : accent === 'amber'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'bg-[#9A7B2F]/12 text-[#8a6d28]';

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/60 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4 dark:border-slate-700/60 dark:from-slate-950 dark:to-slate-900/50">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] dark:text-slate-400">
          {label}
        </p>
        {Icon ? (
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl', iconClass)}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold tracking-tight text-slate-900 tabular-nums sm:mt-2 sm:text-2xl dark:text-slate-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ProfileSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-700/60 dark:from-slate-950 dark:to-slate-900/40', className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-2 border-b border-slate-200/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5 dark:border-slate-800">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-snug text-slate-500 sm:leading-normal dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-3 sm:p-5">{children}</div>
    </section>
  );
}

export function ProfileEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ProfileFilterChips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: T; label: string; count?: number }>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible">
      {items.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
              active
                ? 'bg-[#9A7B2F]/15 text-[#7a6224] ring-1 ring-[#9A7B2F]/25 dark:bg-[#9A7B2F]/20 dark:text-[#e6d3a0]'
                : 'bg-white/80 text-slate-500 ring-1 ring-slate-200/70 hover:bg-white hover:text-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:ring-slate-700/70'
            )}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="tabular-nums opacity-70">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
