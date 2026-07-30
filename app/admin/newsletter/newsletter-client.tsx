'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Archive,
  Circle,
  FolderPlus,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Megaphone,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

function replyInitials(name: string | null, email: string): string {
  const source = (name || email || '?').trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatReplyWhen(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatReplyFullWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Subscriber = {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
};

type NewsletterGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  member_count?: number;
  active_member_count?: number;
};

type Campaign = {
  id: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  created_at: string;
  sent_at: string | null;
};

type InboxReply = {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  status: 'unread' | 'read' | 'archived';
  campaign_subject?: string | null;
  attachment_meta: Array<{ filename?: string | null; content_type?: string }>;
  received_at: string;
};

type AdminReply = {
  id: string;
  body_text: string;
  created_at: string;
};

type TabKey = 'replies' | 'subscribers' | 'compose' | 'campaigns';

export default function NewsletterAdminClient() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('replies');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [groups, setGroups] = useState<NewsletterGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [composeGroupIds, setComposeGroupIds] = useState<string[]>([]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(true);

  const [replies, setReplies] = useState<InboxReply[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyInboxConfigured, setReplyInboxConfigured] = useState(true);
  const [emailReplyTo, setEmailReplyTo] = useState<string | null>(null);
  const [receivingAccessError, setReceivingAccessError] = useState<string | null>(null);
  const [replyFilter, setReplyFilter] = useState<'inbox' | 'unread' | 'archived' | 'all'>('inbox');
  const [replySearch, setReplySearch] = useState('');
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [selectedReply, setSelectedReply] = useState<InboxReply | null>(null);
  const [adminReplies, setAdminReplies] = useState<AdminReply[]>([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [syncingReplies, setSyncingReplies] = useState(false);

  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [body, setBody] = useState('');
  const [extraEmails, setExtraEmails] = useState('');

  const loadGroups = useCallback(async () => {
    const res = await fetch('/api/admin/newsletter/groups');
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to load groups');
    const nextGroups = (payload.groups || []) as NewsletterGroup[];
    setGroups(nextGroups);
    setSelectedGroupId((prev) => {
      if (prev && nextGroups.some((g) => g.id === prev)) return prev;
      return nextGroups[0]?.id || null;
    });
    setComposeGroupIds((prev) => {
      if (prev.length > 0) return prev.filter((id) => nextGroups.some((g) => g.id === id));
      const website = nextGroups.find((g) => g.slug === 'website');
      return website ? [website.id] : [];
    });
  }, []);

  const loadSubscribers = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('q', search.trim());
    if (selectedGroupId) params.set('groupId', selectedGroupId);
    const res = await fetch(`/api/admin/newsletter/subscribers?${params.toString()}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to load subscribers');
    setSubscribers(payload.subscribers || []);
    setTotals(payload.totals || {});
  }, [search, selectedGroupId, statusFilter]);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch('/api/admin/newsletter/campaigns');
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to load campaigns');
    setCampaigns(payload.campaigns || []);
    setEmailConfigured(Boolean(payload.emailConfigured));
  }, []);

  const loadReplies = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('status', replyFilter);
    if (replySearch.trim()) params.set('q', replySearch.trim());
    const res = await fetch(`/api/admin/newsletter/replies?${params.toString()}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to load replies');
    setReplies(payload.replies || []);
    setUnreadCount(payload.unreadCount || 0);
    setReplyInboxConfigured(Boolean(payload.replyInboxConfigured));
    setEmailReplyTo(payload.emailReplyTo || null);
    setReceivingAccessError(
      typeof payload.receivingAccessError === 'string' && payload.receivingAccessError
        ? payload.receivingAccessError
        : null
    );
  }, [replyFilter, replySearch]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadGroups(), loadCampaigns(), loadReplies()]);
      // subscribers depend on selected group — loaded after groups set state;
      // a separate effect below refreshes members when selectedGroupId changes.
    } catch (error) {
      toast({
        title: 'Couldn’t load newsletter data',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [loadCampaigns, loadGroups, loadReplies, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedGroupId) {
      setSubscribers([]);
      return;
    }
    void loadSubscribers().catch((error) => {
      toast({
        title: 'Couldn’t load group members',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    });
  }, [loadSubscribers, selectedGroupId, toast]);

  const openReply = async (id: string) => {
    setSelectedReplyId(id);
    setReplyDraft('');
    try {
      const res = await fetch(`/api/admin/newsletter/replies?id=${encodeURIComponent(id)}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load reply');
      setSelectedReply(payload.reply);
      setAdminReplies(payload.adminReplies || []);
      if (payload.reply?.status === 'unread') {
        await fetch('/api/admin/newsletter/replies', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'read' }),
        });
        setSelectedReply({ ...payload.reply, status: 'read' });
        setReplies((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'read' as const } : r))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (error) {
      toast({
        title: 'Couldn’t open reply',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  };

  const updateReplyStatus = async (id: string, status: 'unread' | 'read' | 'archived') => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/replies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Update failed');
      toast({ title: status === 'archived' ? 'Archived' : `Marked ${status}` });
      if (selectedReplyId === id) {
        setSelectedReply((prev) => (prev ? { ...prev, status } : prev));
      }
      await loadReplies();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const syncRepliesFromResend = async () => {
    setSyncingReplies(true);
    try {
      const res = await fetch('/api/admin/newsletter/replies/sync', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Sync failed');
      toast({
        title: 'Synced from Resend',
        description: `Imported ${payload.imported}, already had ${payload.skipped}${
          payload.errors?.length ? `, ${payload.errors.length} errors` : ''
        }.`,
      });
      await loadReplies();
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSyncingReplies(false);
    }
  };

  const sendReply = async () => {
    if (!selectedReplyId || !replyDraft.trim()) {
      toast({ title: 'Write a reply first', variant: 'destructive' });
      return;
    }
    setReplySending(true);
    try {
      const res = await fetch(`/api/admin/newsletter/replies/${selectedReplyId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyDraft }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Send failed');
      toast({ title: 'Reply sent' });
      setReplyDraft('');
      setAdminReplies((prev) => [...prev, payload.adminReply]);
      if (payload.reply) setSelectedReply(payload.reply);
    } catch (error) {
      toast({
        title: 'Reply failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setReplySending(false);
    }
  };

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const composeActiveEstimate = useMemo(() => {
    return groups
      .filter((g) => composeGroupIds.includes(g.id))
      .reduce((sum, g) => sum + (g.active_member_count || 0), 0);
  }, [composeGroupIds, groups]);

  const recipientHint = useMemo(() => {
    const extras = extraEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean).length;
    const groupCount = composeGroupIds.length;
    if (groupCount > 0 && extras > 0) {
      return `Sends to ~${composeActiveEstimate} active members across ${groupCount} group(s), plus pasted addresses.`;
    }
    if (groupCount > 0) {
      return `Sends to ~${composeActiveEstimate} active members across ${groupCount} selected group(s).`;
    }
    if (extras > 0) return `Sends only to the pasted addresses (${extras} detected).`;
    return 'Select one or more groups and/or paste recipients.';
  }, [composeActiveEstimate, composeGroupIds.length, extraEmails]);

  const addSubscribers = async () => {
    if (!bulkEmails.trim()) {
      toast({ title: 'Paste at least one email', variant: 'destructive' });
      return;
    }
    if (!selectedGroupId) {
      toast({ title: 'Select a group first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/newsletter/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: bulkEmails }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to add');
      toast({
        title: 'Group updated',
        description: `Added ${payload.added}, reactivated ${payload.reactivated}, already on list ${payload.alreadyActive}${
          payload.invalid?.length ? `, invalid ${payload.invalid.length}` : ''
        }.`,
      });
      setBulkEmails('');
      await loadGroups();
      await loadSubscribers();
    } catch (error) {
      toast({
        title: 'Add failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast({ title: 'Enter a group name', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to create group');
      toast({ title: 'Group created' });
      setNewGroupName('');
      await loadGroups();
      if (payload.group?.id) setSelectedGroupId(payload.group.id);
    } catch (error) {
      toast({
        title: 'Couldn’t create group',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedGroup = async () => {
    if (!selectedGroup || selectedGroup.is_system) return;
    if (!confirm(`Delete group “${selectedGroup.name}”? Members stay in other groups.`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedGroup.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Delete failed');
      toast({ title: 'Group deleted' });
      setSelectedGroupId(null);
      await loadGroups();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeFromGroup = async (subscriberId: string) => {
    if (!selectedGroupId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/newsletter/groups/${selectedGroupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Remove failed');
      toast({ title: 'Removed from group' });
      await loadGroups();
      await loadSubscribers();
    } catch (error) {
      toast({
        title: 'Remove failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: 'active' | 'unsubscribed') => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Update failed');
      toast({ title: status === 'active' ? 'Resubscribed' : 'Unsubscribed' });
      await loadSubscribers();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeSubscriber = async (id: string) => {
    if (!confirm('Permanently remove this subscriber?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Delete failed');
      toast({ title: 'Subscriber removed' });
      await loadSubscribers();
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const createCampaign = async (sendNow: boolean) => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Subject and body are required', variant: 'destructive' });
      return;
    }
    if (composeGroupIds.length === 0 && !extraEmails.trim()) {
      toast({
        title: 'No recipients',
        description: 'Select at least one group or paste email addresses.',
        variant: 'destructive',
      });
      return;
    }
    if (sendNow && !emailConfigured) {
      toast({
        title: 'Email not configured',
        description: 'Set RESEND_API_KEY (and EMAIL_FROM) in your environment.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          previewText,
          body,
          groupIds: composeGroupIds,
          extraEmails,
          sendNow,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Campaign failed');

      if (sendNow && payload.sendResult) {
        toast({
          title: 'Campaign sent',
          description: `Sent ${payload.sendResult.sent}, failed ${payload.sendResult.failed}, skipped ${payload.sendResult.skipped}.`,
        });
      } else {
        toast({ title: 'Draft saved' });
      }

      setSubject('');
      setPreviewText('');
      setBody('');
      setExtraEmails('');
      setTab('campaigns');
      await loadCampaigns();
      await loadGroups();
    } catch (error) {
      toast({
        title: sendNow ? 'Send failed' : 'Save failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const resendCampaign = async (id: string) => {
    setSending(true);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Send failed');
      toast({
        title: 'Campaign processed',
        description: `Sent ${payload.sent}, failed ${payload.failed}, skipped ${payload.skipped}.`,
      });
      await loadCampaigns();
    } catch (error) {
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketing emails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage subscribers, send campaigns, and read replies.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => void loadAll()}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </header>

      {!emailConfigured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
          Outbound email is not configured. Add <code className="font-mono">RESEND_API_KEY</code> and{' '}
          <code className="font-mono">EMAIL_FROM</code> to your environment to send campaigns.
        </div>
      ) : null}

      {!replyInboxConfigured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
          Reply inbox is not fully configured. Set <code className="font-mono">EMAIL_REPLY_TO</code> (Resend
          receiving address) and <code className="font-mono">RESEND_WEBHOOK_SECRET</code>, then point a Resend
          webhook at <code className="font-mono">/api/webhooks/resend</code> for <code className="font-mono">email.received</code>.
          {emailReplyTo ? (
            <span className="mt-1 block text-xs">Current reply-to: {emailReplyTo}</span>
          ) : null}
        </div>
      ) : null}

      {receivingAccessError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-950">
          Cannot import replies from Resend: {receivingAccessError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['replies', 'Replies'],
            ['subscribers', 'Subscribers'],
            ['compose', 'Compose'],
            ['campaigns', 'Campaigns'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? 'default' : 'outline'}
            className="rounded-xl"
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'replies' && unreadCount > 0 ? (
              <Badge className="ml-2 rounded-full px-1.5 py-0 text-[10px]">{unreadCount}</Badge>
            ) : null}
          </Button>
        ))}
      </div>

      {tab === 'replies' ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 shadow-sm shadow-slate-200/40">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white/70 px-4 py-3.5 backdrop-blur-sm sm:px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100/80 text-sky-700">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Reply inbox</h2>
                    <p className="text-xs text-slate-500">
                      {unreadCount > 0
                        ? `${unreadCount} unread · ${replies.length} shown`
                        : `${replies.length} message${replies.length === 1 ? '' : 's'} shown`}
                      {emailReplyTo ? ` · ${emailReplyTo}` : ''}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-slate-200 bg-white/90 text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                disabled={syncingReplies}
                onClick={() => void syncRepliesFromResend()}
              >
                {syncingReplies ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Sync from Resend
              </Button>
            </div>

            <div className="flex flex-col gap-3 border-b border-slate-200/60 bg-white/50 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={replySearch}
                  onChange={(e) => setReplySearch(e.target.value)}
                  placeholder="Search by sender, subject, or message…"
                  className="rounded-xl border-slate-200 bg-white pl-9 shadow-none focus-visible:ring-sky-200"
                />
              </div>
              <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-100/70 p-1">
                {(
                  [
                    ['inbox', 'Inbox'],
                    ['unread', 'Unread'],
                    ['archived', 'Archived'],
                    ['all', 'All'],
                  ] as const
                ).map(([value, label]) => {
                  const active = replyFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReplyFilter(value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/80'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {label}
                      {value === 'unread' && unreadCount > 0 ? (
                        <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[10px] font-semibold text-sky-700">
                          {unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid min-h-[520px] lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.35fr)]">
              <div className="max-h-[70vh] overflow-y-auto border-b border-slate-200/70 lg:border-r lg:border-b-0">
                {loading && replies.length === 0 ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-500/70" />
                  </div>
                ) : replies.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <MailOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">No replies here</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Synced inbound mail will appear in this list. Try another filter or Sync from Resend.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ul className="p-2">
                    {replies.map((reply) => {
                      const active = selectedReplyId === reply.id;
                      const unread = reply.status === 'unread';
                      return (
                        <li key={reply.id}>
                          <button
                            type="button"
                            onClick={() => void openReply(reply.id)}
                            className={`group mb-1 flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                              active
                                ? 'bg-sky-50/90 ring-1 ring-sky-200/80 shadow-sm shadow-sky-100/60'
                                : 'hover:bg-slate-50/90'
                            }`}
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide ${
                                unread
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-200/80 text-slate-600'
                              }`}
                            >
                              {replyInitials(reply.from_name, reply.from_email)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`truncate text-sm ${
                                    unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                                  }`}
                                >
                                  {reply.from_name || reply.from_email}
                                </p>
                                <span
                                  className={`shrink-0 text-[11px] tabular-nums ${
                                    unread ? 'font-medium text-sky-700' : 'text-slate-400'
                                  }`}
                                >
                                  {formatReplyWhen(reply.received_at)}
                                </span>
                              </div>
                              <p
                                className={`mt-0.5 truncate text-[13px] ${
                                  unread ? 'font-medium text-slate-800' : 'text-slate-600'
                                }`}
                              >
                                {reply.subject || '(no subject)'}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                {reply.body_text || '—'}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {unread ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100/90 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                    <Circle className="h-1.5 w-1.5 fill-current" />
                                    Unread
                                  </span>
                                ) : null}
                                {reply.status === 'archived' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                    Archived
                                  </span>
                                ) : null}
                                {reply.campaign_subject ? (
                                  <span className="inline-flex max-w-[10rem] truncate rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800/80">
                                    {reply.campaign_subject}
                                  </span>
                                ) : null}
                                {reply.attachment_meta?.length ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                    <Paperclip className="h-2.5 w-2.5" />
                                    {reply.attachment_meta.length}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex min-h-[420px] flex-col bg-gradient-to-b from-white via-white to-slate-50/60">
                {!selectedReply ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-slate-100 text-sky-600/70 ring-1 ring-sky-100">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Select a message</p>
                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                        Choose a reply from the list to read the full thread and send a response.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-slate-200/70 px-4 py-4 sm:px-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {selectedReply.status === 'unread' ? (
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                Unread
                              </span>
                            ) : selectedReply.status === 'archived' ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                Archived
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                Read
                              </span>
                            )}
                            <p className="text-[11px] text-slate-400">
                              {formatReplyFullWhen(selectedReply.received_at)}
                            </p>
                          </div>
                          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                            {selectedReply.subject || '(no subject)'}
                          </h2>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800">
                              {replyInitials(selectedReply.from_name, selectedReply.from_email)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {selectedReply.from_name || selectedReply.from_email}
                              </p>
                              <p className="truncate text-xs text-slate-500">{selectedReply.from_email}</p>
                            </div>
                          </div>
                          {selectedReply.campaign_subject ? (
                            <p className="mt-3 inline-flex max-w-full items-center truncate rounded-lg bg-amber-50/80 px-2.5 py-1 text-xs text-amber-900/80 ring-1 ring-amber-100">
                              In reply to campaign: {selectedReply.campaign_subject}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-slate-200 bg-white text-slate-700"
                            disabled={saving}
                            onClick={() =>
                              void updateReplyStatus(
                                selectedReply.id,
                                selectedReply.status === 'unread' ? 'read' : 'unread'
                              )
                            }
                          >
                            {selectedReply.status === 'unread' ? (
                              <MailOpen className="mr-1.5 h-3.5 w-3.5" />
                            ) : (
                              <Mail className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Mark {selectedReply.status === 'unread' ? 'read' : 'unread'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-slate-200 bg-white text-slate-700"
                            disabled={saving || selectedReply.status === 'archived'}
                            onClick={() => void updateReplyStatus(selectedReply.id, 'archived')}
                          >
                            <Archive className="mr-1.5 h-3.5 w-3.5" />
                            Archive
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
                      <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm shadow-slate-100/80 sm:px-5">
                        <p className="text-[15px] leading-7 whitespace-pre-wrap text-slate-700">
                          {selectedReply.body_text ||
                            (selectedReply.body_html
                              ? selectedReply.body_html.replace(/<[^>]+>/g, ' ').trim()
                              : 'No content')}
                        </p>
                      </div>

                      {selectedReply.attachment_meta?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedReply.attachment_meta.map((a, idx) => (
                            <span
                              key={`${a.filename || a.content_type || 'file'}-${idx}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600"
                            >
                              <Paperclip className="h-3 w-3 text-slate-400" />
                              {a.filename || a.content_type || 'Attachment'}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {adminReplies.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                            Your replies
                          </p>
                          {adminReplies.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/70 to-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 shadow-sm shadow-emerald-50/50"
                            >
                              {item.body_text}
                              <p className="mt-2 text-[11px] text-emerald-700/70">
                                Sent {formatReplyFullWhen(item.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="border-t border-slate-200/70 bg-white/90 px-4 py-4 backdrop-blur-sm sm:px-6">
                      <Label
                        htmlFor="admin-reply-body"
                        className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600"
                      >
                        <Reply className="h-3.5 w-3.5 text-sky-600" />
                        Write a reply
                      </Label>
                      <Textarea
                        id="admin-reply-body"
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder={`Reply to ${selectedReply.from_name || selectedReply.from_email}…`}
                        className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50/50 text-sm leading-relaxed focus-visible:ring-sky-200"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-400">
                          Sends from your Ticket95 reply address and keeps the thread.
                        </p>
                        <Button
                          type="button"
                          className="rounded-xl bg-sky-600 hover:bg-sky-700"
                          disabled={replySending || !emailConfigured || !replyDraft.trim()}
                          onClick={() => void sendReply()}
                        >
                          {replySending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Send reply
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'subscribers' ? (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <aside className="space-y-3 rounded-xl border border-border/70 p-3">
            <div className="flex items-center gap-2 px-1">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Groups</h2>
            </div>
            <ul className="space-y-1">
              {groups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      selectedGroupId === group.id
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {group.name}
                      {group.is_system ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">system</span>
                      ) : null}
                    </span>
                    <span className="ml-2 tabular-nums text-xs text-muted-foreground">
                      {group.active_member_count ?? group.member_count ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-border/60 pt-3">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New group name"
                className="rounded-xl"
              />
              <Button
                type="button"
                size="sm"
                className="w-full rounded-xl"
                disabled={saving}
                onClick={() => void createGroup()}
              >
                <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                Create group
              </Button>
            </div>
          </aside>

          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selectedGroup?.name || 'Select a group'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedGroup?.description ||
                    (selectedGroup?.is_system
                      ? 'Footer signups land here automatically.'
                      : 'Add or remove members for this audience.')}
                </p>
              </div>
              {selectedGroup && !selectedGroup.is_system ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-destructive"
                  disabled={saving}
                  onClick={() => void deleteSelectedGroup()}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete group
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'In group', value: totals.all || 0 },
                { label: 'Active', value: totals.active || 0 },
                { label: 'Unsubscribed', value: totals.unsubscribed || 0 },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Add to this group</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste one or many emails — separated by commas, spaces, or new lines.
              </p>
              <Textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder={'name@example.com\nfriend@example.com, another@example.com'}
                className="min-h-[110px] rounded-xl"
              />
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => void addSubscribers()}
                disabled={saving || !selectedGroupId}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Add to group
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email…"
                className="max-w-xs rounded-xl"
              />
              {['all', 'active', 'unsubscribed', 'bounced'].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={statusFilter === value ? 'default' : 'outline'}
                  className="rounded-xl capitalize"
                  onClick={() => setStatusFilter(value)}
                >
                  {value}
                </Button>
              ))}
            </div>

            {!selectedGroupId ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Select a group</p>
            ) : loading && subscribers.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subscribers.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No members in this group</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={sub.status === 'active' ? 'default' : 'secondary'}
                            className="rounded-full text-[10px] capitalize"
                          >
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">{sub.source}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(sub.subscribed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg"
                              title="Remove from group"
                              onClick={() => void removeFromGroup(sub.id)}
                              disabled={saving}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </Button>
                            {sub.status === 'active' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                title="Unsubscribe globally"
                                onClick={() => void updateStatus(sub.id, 'unsubscribed')}
                                disabled={saving}
                              >
                                Unsub
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg"
                                onClick={() => void updateStatus(sub.id, 'active')}
                                disabled={saving}
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-destructive hover:text-destructive"
                              title="Delete subscriber"
                              onClick={() => void removeSubscriber(sub.id)}
                              disabled={saving}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'compose' ? (
        <div className="space-y-4 rounded-xl border border-border/70 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Compose campaign</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-subject">Subject</Label>
            <Input
              id="campaign-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="This weekend’s hottest events"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-preview">Preview text (optional)</Label>
            <Input
              id="campaign-preview"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Shown in inbox previews"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-body">Body</Label>
            <Textarea
              id="campaign-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message. Plain text is fine — line breaks become paragraphs. HTML is also supported."
              className="min-h-[220px] rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Send to groups</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((group) => {
                const checked = composeGroupIds.includes(group.id);
                return (
                  <label
                    key={group.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm ${
                      checked ? 'border-primary/40 bg-primary/5' : 'border-border/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(e) => {
                        setComposeGroupIds((prev) =>
                          e.target.checked
                            ? [...prev, group.id]
                            : prev.filter((id) => id !== group.id)
                        );
                      }}
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{group.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {group.active_member_count ?? 0} active
                        {group.is_system ? ' · website signups' : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-extra">Also include these emails (optional)</Label>
            <Textarea
              id="campaign-extra"
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              placeholder="Paste additional addresses"
              className="min-h-[90px] rounded-xl"
            />
            <p className="text-xs text-muted-foreground">{recipientHint}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={sending}
              onClick={() => void createCampaign(false)}
            >
              Save draft
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={sending}
              onClick={() => void createCampaign(true)}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send now
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'campaigns' ? (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No campaigns yet</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="max-w-[220px] font-medium">{campaign.subject}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full text-[10px] capitalize">
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{campaign.recipient_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {campaign.sent_count} sent · {campaign.failed_count} failed ·{' '}
                        {campaign.skipped_count} skipped
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(campaign.sent_at || campaign.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.status === 'draft' || campaign.status === 'failed' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            disabled={sending || !emailConfigured}
                            onClick={() => void resendCampaign(campaign.id)}
                          >
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                            Send
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
