import { supabaseAdmin } from '@/lib/supabase-admin';
import type { NewsletterSubscriber } from '@/lib/newsletter';
// upsertSubscribers is loaded dynamically in addEmailsToGroup to avoid circular imports.

export const WEBSITE_GROUP_SLUG = 'website';

export type NewsletterGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  active_member_count?: number;
};

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || `group-${Date.now()}`;
}

export async function ensureWebsiteGroup(): Promise<NewsletterGroup> {
  const { data: existing, error } = await supabaseAdmin
    .from('newsletter_groups')
    .select('*')
    .eq('slug', WEBSITE_GROUP_SLUG)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (existing) return existing as NewsletterGroup;

  const { data: created, error: createError } = await supabaseAdmin
    .from('newsletter_groups')
    .insert({
      name: 'Website subscribers',
      slug: WEBSITE_GROUP_SLUG,
      description:
        'People who subscribed via the website footer. Kept separate from imported lists.',
      is_system: true,
    })
    .select('*')
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || 'Failed to create Website subscribers group');
  }

  return created as NewsletterGroup;
}

async function fetchAllGroupMemberships(): Promise<
  Array<{ group_id: string; subscriber_id: string }>
> {
  const pageSize = 1000;
  const rows: Array<{ group_id: string; subscriber_id: string }> = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('newsletter_group_members')
      .select('group_id, subscriber_id')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const chunk = (data || []) as Array<{ group_id: string; subscriber_id: string }>;
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

export async function listGroups(): Promise<NewsletterGroup[]> {
  await ensureWebsiteGroup();

  const { data: groups, error } = await supabaseAdmin
    .from('newsletter_groups')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);

  const members = await fetchAllGroupMemberships();

  const subscriberIds = Array.from(
    new Set(members.map((row) => row.subscriber_id).filter(Boolean))
  );

  const statusBySubscriberId = new Map<string, string>();
  for (let i = 0; i < subscriberIds.length; i += 200) {
    const chunk = subscriberIds.slice(i, i + 200);
    const { data: subs, error: subsError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, status')
      .in('id', chunk);
    if (subsError) throw new Error(subsError.message);
    for (const sub of subs || []) {
      statusBySubscriberId.set(sub.id as string, sub.status as string);
    }
  }

  const counts = new Map<string, { all: number; active: number }>();
  for (const row of members) {
    const current = counts.get(row.group_id) || { all: 0, active: 0 };
    current.all += 1;
    if (statusBySubscriberId.get(row.subscriber_id) === 'active') {
      current.active += 1;
    }
    counts.set(row.group_id, current);
  }

  return (groups || []).map((group) => {
    const c = counts.get(group.id) || { all: 0, active: 0 };
    return {
      ...(group as NewsletterGroup),
      member_count: c.all,
      active_member_count: c.active,
    };
  });
}

export async function createGroup(params: {
  name: string;
  description?: string | null;
}): Promise<NewsletterGroup> {
  const name = params.name.trim();
  if (!name) throw new Error('Group name is required');

  let slug = slugify(name);
  // Ensure unique slug
  for (let i = 0; i < 5; i += 1) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data: clash } = await supabaseAdmin
      .from('newsletter_groups')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!clash) {
      slug = candidate;
      break;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('newsletter_groups')
    .insert({
      name,
      slug,
      description: (params.description || '').trim() || null,
      is_system: false,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create group');
  return { ...(data as NewsletterGroup), member_count: 0, active_member_count: 0 };
}

export async function updateGroup(params: {
  id: string;
  name?: string;
  description?: string | null;
}): Promise<NewsletterGroup> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('newsletter_groups')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error('Group not found');
  if (existing.is_system) {
    throw new Error('The Website subscribers group cannot be renamed');
  }

  const patch: Record<string, unknown> = {};
  if (typeof params.name === 'string' && params.name.trim()) {
    patch.name = params.name.trim();
  }
  if (params.description !== undefined) {
    patch.description = (params.description || '').trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return existing as NewsletterGroup;
  }

  const { data, error } = await supabaseAdmin
    .from('newsletter_groups')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to update group');
  return data as NewsletterGroup;
}

export async function deleteGroup(id: string): Promise<void> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('newsletter_groups')
    .select('id, is_system')
    .eq('id', id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error('Group not found');
  if (existing.is_system) {
    throw new Error('The Website subscribers group cannot be deleted');
  }

  const { error } = await supabaseAdmin.from('newsletter_groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addSubscribersToGroups(params: {
  subscriberIds: string[];
  groupIds: string[];
  addedBy?: string | null;
}): Promise<number> {
  if (params.subscriberIds.length === 0 || params.groupIds.length === 0) return 0;

  const rows: Array<{
    group_id: string;
    subscriber_id: string;
    added_by: string | null;
  }> = [];

  for (const groupId of params.groupIds) {
    for (const subscriberId of params.subscriberIds) {
      rows.push({
        group_id: groupId,
        subscriber_id: subscriberId,
        added_by: params.addedBy || null,
      });
    }
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { data, error } = await supabaseAdmin
      .from('newsletter_group_members')
      .upsert(chunk, { onConflict: 'group_id,subscriber_id', ignoreDuplicates: true })
      .select('subscriber_id');

    if (error) throw new Error(error.message);
    inserted += data?.length || 0;
  }

  return inserted;
}

export async function addEmailsToGroup(params: {
  groupId: string;
  emailsInput: string;
  addedBy?: string | null;
  source?: 'admin' | 'import';
}): Promise<{
  added: number;
  reactivated: number;
  alreadyActive: number;
  joinedGroup: number;
  invalid: string[];
}> {
  const { data: group, error: groupError } = await supabaseAdmin
    .from('newsletter_groups')
    .select('id')
    .eq('id', params.groupId)
    .maybeSingle();

  if (groupError) throw new Error(groupError.message);
  if (!group) throw new Error('Group not found');

  // Dynamic import avoids circular dependency with lib/newsletter.ts
  const { upsertSubscribers } = await import('@/lib/newsletter');

  const result = await upsertSubscribers({
    emailsInput: params.emailsInput,
    source: params.source || 'admin',
    notes: 'Added to group by admin',
    skipWebsiteAutoJoin: true,
  });

  if (result.emails.length === 0) {
    return {
      added: 0,
      reactivated: 0,
      alreadyActive: 0,
      joinedGroup: 0,
      invalid: result.invalid,
    };
  }

  const { data: subscribers, error: subError } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('id')
    .in('email', result.emails);

  if (subError) throw new Error(subError.message);

  const joinedGroup = await addSubscribersToGroups({
    subscriberIds: (subscribers || []).map((s) => s.id as string),
    groupIds: [params.groupId],
    addedBy: params.addedBy,
  });

  return {
    added: result.added,
    reactivated: result.reactivated,
    alreadyActive: result.alreadyActive,
    joinedGroup,
    invalid: result.invalid,
  };
}

export async function removeSubscriberFromGroup(params: {
  groupId: string;
  subscriberId: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('newsletter_group_members')
    .delete()
    .eq('group_id', params.groupId)
    .eq('subscriber_id', params.subscriberId);

  if (error) throw new Error(error.message);
}

export async function listGroupMembers(params: {
  groupId: string;
  status?: 'all' | 'active' | 'unsubscribed' | 'bounced';
  q?: string;
  limit?: number;
}): Promise<{ subscribers: NewsletterSubscriber[]; totals: Record<string, number> }> {
  const limit = Math.min(Math.max(params.limit || 500, 1), 2000);

  const { data: memberRows, error: memberError } = await supabaseAdmin
    .from('newsletter_group_members')
    .select('subscriber_id')
    .eq('group_id', params.groupId)
    .limit(limit);

  if (memberError) throw new Error(memberError.message);

  const ids = (memberRows || []).map((r) => r.subscriber_id as string);
  if (ids.length === 0) {
    return {
      subscribers: [],
      totals: { all: 0, active: 0, unsubscribed: 0, bounced: 0 },
    };
  }

  let query = supabaseAdmin
    .from('newsletter_subscribers')
    .select('*')
    .in('id', ids)
    .order('subscribed_at', { ascending: false });

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const q = (params.q || '').trim().toLowerCase();
  if (q) {
    query = query.ilike('email', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const totals: Record<string, number> = { all: 0, active: 0, unsubscribed: 0, bounced: 0 };
  // Counts for the whole group (not filtered by search/status)
  const allIds: string[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: page, error: pageError } = await supabaseAdmin
      .from('newsletter_group_members')
      .select('subscriber_id')
      .eq('group_id', params.groupId)
      .range(from, from + pageSize - 1);
    if (pageError) throw new Error(pageError.message);
    const chunk = page || [];
    for (const row of chunk) allIds.push(row.subscriber_id as string);
    if (chunk.length < pageSize) break;
  }

  if (allIds.length > 0) {
    for (let i = 0; i < allIds.length; i += 200) {
      const chunk = allIds.slice(i, i + 200);
      const { data: statusRows, error: statusError } = await supabaseAdmin
        .from('newsletter_subscribers')
        .select('status')
        .in('id', chunk);
      if (statusError) throw new Error(statusError.message);
      for (const row of statusRows || []) {
        totals.all += 1;
        const status = row.status as string;
        if (status in totals) totals[status] += 1;
      }
    }
  }

  return {
    subscribers: (data || []) as NewsletterSubscriber[],
    totals,
  };
}

export async function getActiveMembersForGroups(
  groupIds: string[]
): Promise<Array<{ subscriberId: string; email: string; unsubscribeToken: string }>> {
  if (groupIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('newsletter_group_members')
    .select('subscriber_id, newsletter_subscribers(id, email, unsubscribe_token, status)')
    .in('group_id', groupIds);

  if (error) throw new Error(error.message);

  const byEmail = new Map<
    string,
    { subscriberId: string; email: string; unsubscribeToken: string }
  >();

  for (const row of data || []) {
    const raw = row.newsletter_subscribers as
      | {
          id?: string;
          email?: string;
          unsubscribe_token?: string;
          status?: string;
        }
      | Array<{
          id?: string;
          email?: string;
          unsubscribe_token?: string;
          status?: string;
        }>
      | null;
    const sub = Array.isArray(raw) ? raw[0] : raw;
    if (!sub?.id || !sub.email || !sub.unsubscribe_token) continue;
    if (sub.status !== 'active') continue;
    byEmail.set(sub.email, {
      subscriberId: sub.id,
      email: sub.email,
      unsubscribeToken: sub.unsubscribe_token,
    });
  }

  return Array.from(byEmail.values());
}
