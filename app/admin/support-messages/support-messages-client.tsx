'use client';

import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

async function fetchSupportMessages() {
  const res = await fetch('/api/contact/messages?limit=200');
  if (!res.ok) throw new Error('Failed to fetch support messages');
  return res.json();
}

type SupportMessage = {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  subject: string | null;
  status: string;
  message: string;
};

export default function SupportMessagesClient({
  initialMessages,
}: {
  initialMessages: SupportMessage[];
}) {
  const { data, error } = useSWR('support-messages', fetchSupportMessages, {
    fallbackData: { messages: initialMessages },
    revalidateOnMount: false,
  });
  const messages = data?.messages ?? [];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <span className="text-sm tabular-nums text-muted-foreground">{messages.length}</span>
      </header>

      {error && messages.length === 0 ? (
        <p className="text-sm text-destructive">Unable to load</p>
      ) : messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">None</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((m: SupportMessage) => (
                <TableRow key={m.id} className="align-top">
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <p className="font-medium">{m.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </TableCell>
                  <TableCell className="min-w-[160px] text-sm">
                    {m.subject || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.status === 'resolved' ? 'default' : 'secondary'}
                      className="rounded-full text-[10px]"
                    >
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <p className="line-clamp-3 text-sm text-muted-foreground">{m.message}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
