import { supabaseAdmin } from '@/lib/supabase-admin';
import SupportMessagesClient from './support-messages-client';

async function getSupportMessages() {
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .select(
      'id, created_at, name, email, phone, category, subject, order_reference, event_name, status, resolved_at, message'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Fetch support messages error:', error);
    return [];
  }

  return data ?? [];
}

export default async function SupportMessagesAdminPage() {
  const messages = await getSupportMessages();
  return <SupportMessagesClient initialMessages={messages} />;
}
