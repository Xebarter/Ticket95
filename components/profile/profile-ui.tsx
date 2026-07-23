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
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
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
      ? 'bg-emerald-500/10 text-emerald-700'
      : accent === 'amber'
        ? 'bg-amber-500/10 text-amber-700'
        : 'bg-primary/10 text-primary';

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', iconClass)}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
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
    <section className={cn('rounded-2xl border border-border/70 bg-background/50', className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
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
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
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
