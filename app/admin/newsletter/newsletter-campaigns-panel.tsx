'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RichHtml } from '@/components/admin/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import {
  Copy,
  Eye,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from 'lucide-react';

export type CampaignListItem = {
  id: string;
  subject: string;
  preview_text?: string | null;
  body_html?: string | null;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  target_group_ids?: string[];
  created_at: string;
  sent_at: string | null;
};

export type CampaignRecipient = {
  id: string;
  email: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
};

export type CampaignDetail = CampaignListItem & {
  preview_text: string | null;
  body_html: string;
  body_text: string | null;
};

type NewsletterGroup = {
  id: string;
  name: string;
  slug: string;
  active_member_count?: number;
};

type StatusFilter = 'all' | 'draft' | 'sent' | 'failed' | 'sending' | 'cancelled' | 'needs_attention';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusTone(status: string, failedCount: number): string {
  if (status === 'sent' && failedCount > 0) return 'bg-amber-50 text-amber-800';
  if (status === 'sent') return 'bg-emerald-50 text-emerald-700';
  if (status === 'failed') return 'bg-rose-50 text-rose-700';
  if (status === 'sending') return 'bg-sky-50 text-sky-700';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-100 text-slate-600';
}

function statusLabel(status: string, failedCount: number): string {
  if (status === 'sent' && failedCount > 0) return 'Partial';
  return status;
}

function canEdit(status: string): boolean {
  return status === 'draft' || status === 'failed';
}

function canRetry(campaign: CampaignListItem): boolean {
  if (campaign.status === 'sending' || campaign.status === 'cancelled') return false;
  if (campaign.status === 'draft') return campaign.recipient_count > 0;
  return campaign.failed_count > 0 || (campaign.status === 'draft' && campaign.recipient_count > 0);
}

type Props = {
  campaigns: CampaignListItem[];
  groups: NewsletterGroup[];
  emailConfigured: boolean;
  sending: boolean;
  onNewCampaign: () => void;
  onEditCampaign: (detail: CampaignDetail) => void;
  onReuseCampaign: (detail: CampaignDetail) => void;
  onSendCampaign: (id: string) => Promise<void>;
  onCancelled: () => Promise<void>;
};

export function NewsletterCampaignsPanel({
  campaigns,
  groups,
  emailConfigured,
  sending,
  onNewCampaign,
  onEditCampaign,
  onReuseCampaign,
  onSendCampaign,
  onCancelled,
}: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'sent' | 'failed' | 'pending' | 'skipped'>('all');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups) map.set(group.id, group.name);
    return map;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (statusFilter === 'needs_attention') {
        if (!(campaign.status === 'failed' || (campaign.status === 'sent' && campaign.failed_count > 0))) {
          return false;
        }
      } else if (statusFilter !== 'all' && campaign.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return campaign.subject.toLowerCase().includes(q);
    });
  }, [campaigns, query, statusFilter]);

  const counts = useMemo(() => {
    const next = {
      all: campaigns.length,
      draft: 0,
      sent: 0,
      failed: 0,
      sending: 0,
      cancelled: 0,
      needs_attention: 0,
    };
    for (const campaign of campaigns) {
      if (campaign.status in next) {
        next[campaign.status as keyof typeof next] += 1;
      }
      if (campaign.status === 'failed' || (campaign.status === 'sent' && campaign.failed_count > 0)) {
        next.needs_attention += 1;
      }
    }
    return next;
  }, [campaigns]);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    setRecipientFilter('all');
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load campaign');
      setDetail(payload.campaign as CampaignDetail);
      setRecipients((payload.recipients || []) as CampaignRecipient[]);
    } catch (error) {
      toast({
        title: 'Could not open campaign',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchDetailForAction = async (id: string): Promise<CampaignDetail | null> => {
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load campaign');
      return payload.campaign as CampaignDetail;
    } catch (error) {
      toast({
        title: 'Could not load campaign',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleEdit = async (id: string) => {
    setActionBusy(id);
    const campaign = await fetchDetailForAction(id);
    setActionBusy(null);
    if (campaign) onEditCampaign(campaign);
  };

  const handleReuse = async (id: string) => {
    setActionBusy(id);
    const campaign = await fetchDetailForAction(id);
    setActionBusy(null);
    if (campaign) onReuseCampaign(campaign);
  };

  const handleQuickDuplicate = async (id: string) => {
    setActionBusy(id);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Duplicate failed');
      toast({
        title: 'Draft created',
        description: 'Content and audience copied. You can edit recipients before sending.',
      });
      await onCancelled();
      const campaign = payload.campaign as CampaignDetail;
      onEditCampaign(campaign);
    } catch (error) {
      toast({
        title: 'Duplicate failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setActionBusy(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionBusy(id);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Cancel failed');
      toast({ title: 'Campaign cancelled' });
      if (detail?.id === id) setDetailOpen(false);
      await onCancelled();
    } catch (error) {
      toast({
        title: 'Cancel failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setActionBusy(null);
    }
  };

  const filteredRecipients = useMemo(() => {
    if (recipientFilter === 'all') return recipients;
    return recipients.filter((r) => r.status === recipientFilter);
  }, [recipientFilter, recipients]);

  const filterChips: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'needs_attention', label: `Needs attention (${counts.needs_attention})` },
    { key: 'draft', label: `Drafts (${counts.draft})` },
    { key: 'sent', label: `Sent (${counts.sent})` },
    { key: 'failed', label: `Failed (${counts.failed})` },
  ];

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 shadow-sm shadow-slate-200/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white/70 px-4 py-3.5 backdrop-blur-sm sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100/80 text-sky-700">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Campaigns</h2>
              <p className="text-xs text-slate-500">
                {campaigns.length === 0
                  ? 'No campaigns yet'
                  : `${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'} · edit, reuse, and retry from here`}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-xl bg-sky-600 hover:bg-sky-700"
            onClick={onNewCampaign}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New campaign
          </Button>
        </div>

        <div className="bg-gradient-to-b from-white via-white to-slate-50/50 p-4 sm:p-5">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600/70 ring-1 ring-sky-100">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">No campaigns yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Compose your first message and send it to a subscriber group.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="mt-1 rounded-xl bg-sky-600 hover:bg-sky-700"
                onClick={onNewCampaign}
              >
                Compose campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by subject…"
                    className="rounded-xl border-slate-200 bg-white pl-9 focus-visible:ring-sky-200"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setStatusFilter(chip.key)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        statusFilter === chip.key
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-10 text-center text-sm text-slate-500">
                  No campaigns match this filter.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((campaign) => {
                    const when = campaign.sent_at || campaign.created_at;
                    const groupNames = (campaign.target_group_ids || [])
                      .map((id) => groupNameById.get(id))
                      .filter(Boolean) as string[];
                    const busy = actionBusy === campaign.id || sending;
                    const showRetry = canRetry(campaign);
                    const retryLabel =
                      campaign.status === 'draft'
                        ? 'Send'
                        : campaign.failed_count > 0
                          ? `Retry failed (${campaign.failed_count})`
                          : 'Send';

                    return (
                      <div
                        key={campaign.id}
                        className="rounded-2xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm shadow-slate-100/60 sm:px-5"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => void loadDetail(campaign.id)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(campaign.status, campaign.failed_count)}`}
                              >
                                {statusLabel(campaign.status, campaign.failed_count)}
                              </span>
                              <span className="text-[11px] text-slate-400">{formatWhen(when)}</span>
                            </div>
                            <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-900 sm:text-base">
                              {campaign.subject}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              <span className="font-medium tabular-nums text-slate-700">
                                {campaign.recipient_count}
                              </span>{' '}
                              recipients · {campaign.sent_count} sent · {campaign.failed_count}{' '}
                              failed · {campaign.skipped_count} skipped
                            </p>
                            {groupNames.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {groupNames.slice(0, 4).map((name) => (
                                  <span
                                    key={name}
                                    className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                                  >
                                    {name}
                                  </span>
                                ))}
                                {groupNames.length > 4 ? (
                                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                    +{groupNames.length - 4}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <p className="mt-2 text-[11px] text-slate-400">
                                Custom / pasted recipients
                              </p>
                            )}
                          </button>

                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl border-slate-200 bg-white text-slate-700"
                              onClick={() => void loadDetail(campaign.id)}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
                            {canEdit(campaign.status) ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-slate-200 bg-white text-slate-700"
                                disabled={busy}
                                onClick={() => void handleEdit(campaign.id)}
                              >
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-slate-200 bg-white text-slate-700"
                                disabled={busy}
                                onClick={() => void handleReuse(campaign.id)}
                              >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                Reuse
                              </Button>
                            )}
                            {showRetry ? (
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-xl bg-sky-600 hover:bg-sky-700"
                                disabled={busy || !emailConfigured}
                                onClick={() => void onSendCampaign(campaign.id)}
                              >
                                {sending && actionBusy !== campaign.id ? (
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                {retryLabel}
                              </Button>
                            ) : null}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl border-slate-200 px-2"
                                  disabled={busy}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => void loadDetail(campaign.id)}>
                                  <Eye className="mr-2 h-3.5 w-3.5" />
                                  Open details
                                </DropdownMenuItem>
                                {canEdit(campaign.status) ? (
                                  <DropdownMenuItem onClick={() => void handleEdit(campaign.id)}>
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit content &amp; recipients
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => void handleReuse(campaign.id)}>
                                  <Copy className="mr-2 h-3.5 w-3.5" />
                                  Reuse with new audience
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void handleQuickDuplicate(campaign.id)}>
                                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                  Duplicate as draft
                                </DropdownMenuItem>
                                {canEdit(campaign.status) ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-rose-700 focus:text-rose-700"
                                      onClick={() => void handleCancel(campaign.id)}
                                    >
                                      <XCircle className="mr-2 h-3.5 w-3.5" />
                                      Cancel campaign
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader className="border-b border-slate-200/80 pr-10 text-left">
            <SheetTitle className="text-base text-slate-900">
              {detailLoading ? 'Loading…' : detail?.subject || 'Campaign'}
            </SheetTitle>
            <SheetDescription>
              {detail
                ? `${statusLabel(detail.status, detail.failed_count)} · ${formatWhen(detail.sent_at || detail.created_at)}`
                : 'Campaign details and recipients'}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-5 p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Recipients', detail.recipient_count],
                  ['Sent', detail.sent_count],
                  ['Failed', detail.failed_count],
                  ['Skipped', detail.skipped_count],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5"
                  >
                    <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
                      {label}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
                      {value as number}
                    </p>
                  </div>
                ))}
              </div>

              {(detail.target_group_ids || []).length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-600">Target groups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(detail.target_group_ids || []).map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-sky-100"
                      >
                        {groupNameById.get(id) || 'Unknown group'}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {detail.preview_text ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-600">Preview text</p>
                  <p className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-600">
                    {detail.preview_text}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-600">Message</p>
                <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700">
                  <RichHtml html={detail.body_html || ''} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canEdit(detail.status) ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-sky-600 hover:bg-sky-700"
                    onClick={() => {
                      setDetailOpen(false);
                      onEditCampaign(detail);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setDetailOpen(false);
                    onReuseCampaign(detail);
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Reuse with new audience
                </Button>
                {canRetry(detail) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    disabled={sending || !emailConfigured}
                    onClick={() => void onSendCampaign(detail.id)}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {detail.status === 'draft' ? 'Send now' : 'Retry failed'}
                  </Button>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-600">
                    Recipients ({filteredRecipients.length}
                    {recipientFilter !== 'all' ? ` · ${recipientFilter}` : ''})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'failed', 'sent', 'pending', 'skipped'] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRecipientFilter(key)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          recipientFilter === key
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="max-h-72 overflow-auto rounded-xl border border-slate-200/80">
                  {filteredRecipients.length === 0 ? (
                    <p className="px-3 py-8 text-center text-xs text-slate-400">No recipients</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {filteredRecipients.map((recipient) => (
                        <li key={recipient.id} className="px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {recipient.email}
                              </p>
                              {recipient.error_message ? (
                                <p className="mt-0.5 text-[11px] text-rose-600">
                                  {recipient.error_message}
                                </p>
                              ) : null}
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(recipient.status, 0)}`}
                            >
                              {recipient.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
