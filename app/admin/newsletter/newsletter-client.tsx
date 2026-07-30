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
  FolderPlus,
  Inbox,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Reply,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';

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
  const [replyFilter, setReplyFilter] = useState<'inbox' | 'unread' | 'archived' | 'all'>('inbox');
  const [replySearch, setReplySearch] = useState('');
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [selectedReply, setSelectedReply] = useState<InboxReply | null>(null);
  const [adminReplies, setAdminReplies] = useState<AdminReply[]>([]);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySending, setReplySending] = useState(false);

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
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={replySearch}
              onChange={(e) => setReplySearch(e.target.value)}
              placeholder="Search replies…"
              className="max-w-xs rounded-xl"
            />
            {(['inbox', 'unread', 'archived', 'all'] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={replyFilter === value ? 'default' : 'outline'}
                className="rounded-xl capitalize"
                onClick={() => setReplyFilter(value)}
              >
                {value}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="overflow-hidden rounded-xl border border-border/70">
              {loading && replies.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : replies.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No replies yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {replies.map((reply) => {
                    const active = selectedReplyId === reply.id;
                    return (
                      <li key={reply.id}>
                        <button
                          type="button"
                          onClick={() => void openReply(reply.id)}
                          className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                            active ? 'bg-muted/50' : ''
                          } ${reply.status === 'unread' ? 'font-medium' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm">
                                {reply.from_name || reply.from_email}
                                {reply.status === 'unread' ? (
                                  <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                                ) : null}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {reply.subject || '(no subject)'}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {reply.body_text || '—'}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {new Date(reply.received_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-border/70 p-4 sm:p-5">
              {!selectedReply ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select a reply to read it</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold">{selectedReply.subject || '(no subject)'}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        From {selectedReply.from_name || selectedReply.from_email}{' '}
                        <span className="text-xs">&lt;{selectedReply.from_email}&gt;</span>
                      </p>
                      {selectedReply.campaign_subject ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Campaign: {selectedReply.campaign_subject}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={saving}
                        onClick={() =>
                          void updateReplyStatus(
                            selectedReply.id,
                            selectedReply.status === 'unread' ? 'read' : 'unread'
                          )
                        }
                      >
                        Mark {selectedReply.status === 'unread' ? 'read' : 'unread'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={saving}
                        onClick={() => void updateReplyStatus(selectedReply.id, 'archived')}
                      >
                        <Archive className="mr-1.5 h-3.5 w-3.5" />
                        Archive
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-muted/30 px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedReply.body_text ||
                      (selectedReply.body_html
                        ? selectedReply.body_html.replace(/<[^>]+>/g, ' ').trim()
                        : 'No content')}
                  </div>

                  {selectedReply.attachment_meta?.length ? (
                    <p className="text-xs text-muted-foreground">
                      Attachments:{' '}
                      {selectedReply.attachment_meta
                        .map((a) => a.filename || a.content_type || 'file')
                        .join(', ')}
                    </p>
                  ) : null}

                  {adminReplies.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your replies
                      </p>
                      {adminReplies.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border/60 px-3 py-2 text-sm whitespace-pre-wrap"
                        >
                          {item.body_text}
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <Label htmlFor="admin-reply-body" className="flex items-center gap-1.5">
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </Label>
                    <Textarea
                      id="admin-reply-body"
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Write a reply…"
                      className="min-h-[110px] rounded-xl"
                    />
                    <Button
                      type="button"
                      className="rounded-xl"
                      disabled={replySending || !emailConfigured}
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
              )}
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
