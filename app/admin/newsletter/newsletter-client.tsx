'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';

type Subscriber = {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
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

type TabKey = 'subscribers' | 'compose' | 'campaigns';

export default function NewsletterAdminClient() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('subscribers');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(true);

  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [body, setBody] = useState('');
  const [includeAllActive, setIncludeAllActive] = useState(true);
  const [extraEmails, setExtraEmails] = useState('');

  const loadSubscribers = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('q', search.trim());
    const res = await fetch(`/api/admin/newsletter/subscribers?${params.toString()}`);
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to load subscribers');
    setSubscribers(payload.subscribers || []);
    setTotals(payload.totals || {});
  }, [search, statusFilter]);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch('/api/admin/newsletter/campaigns');
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to load campaigns');
    setCampaigns(payload.campaigns || []);
    setEmailConfigured(Boolean(payload.emailConfigured));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadSubscribers(), loadCampaigns()]);
    } catch (error) {
      toast({
        title: 'Couldn’t load newsletter data',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [loadCampaigns, loadSubscribers, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const activeCount = totals.active || 0;

  const recipientHint = useMemo(() => {
    const extras = extraEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean).length;
    if (includeAllActive && extras > 0) {
      return `Sends to ~${activeCount} active subscribers plus any new addresses you paste.`;
    }
    if (includeAllActive) return `Sends to all ${activeCount} active subscribers.`;
    if (extras > 0) return `Sends only to the pasted addresses (${extras} detected).`;
    return 'Select active list and/or paste recipients.';
  }, [activeCount, extraEmails, includeAllActive]);

  const addSubscribers = async () => {
    if (!bulkEmails.trim()) {
      toast({ title: 'Paste at least one email', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: bulkEmails }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to add');
      toast({
        title: 'Subscribers updated',
        description: `Added ${payload.added}, reactivated ${payload.reactivated}, already active ${payload.alreadyActive}${
          payload.invalid?.length ? `, invalid ${payload.invalid.length}` : ''
        }.`,
      });
      setBulkEmails('');
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
    if (!includeAllActive && !extraEmails.trim()) {
      toast({
        title: 'No recipients',
        description: 'Enable the active list or paste email addresses.',
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
          includeAllActive,
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
      await loadSubscribers();
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
            Manage subscribers and send campaign emails to your list.
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

      <div className="flex flex-wrap gap-1.5">
        {(
          [
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
          </Button>
        ))}
      </div>

      {tab === 'subscribers' ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Total', value: totals.all || 0 },
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
              <h2 className="text-sm font-semibold">Add subscribers</h2>
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
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add to list
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

          {loading && subscribers.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscribers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No subscribers yet</p>
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
                          {sub.status === 'active' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg"
                              onClick={() => void updateStatus(sub.id, 'unsubscribed')}
                              disabled={saving}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
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

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-3">
            <div>
              <p className="text-sm font-medium">Send to all active subscribers</p>
              <p className="text-xs text-muted-foreground">{activeCount} on the list</p>
            </div>
            <Switch checked={includeAllActive} onCheckedChange={setIncludeAllActive} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-extra">Also include these emails (optional)</Label>
            <Textarea
              id="campaign-extra"
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              placeholder="Paste additional addresses — they will be added to the list if needed"
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
