import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function createNotification({
  userId,
  title,
  message,
  type,
  amount,
  currency = 'USDT',
}: {
  userId: string;
  title: string;
  message: string;
  type: string;
  amount?: number;
  currency?: string;
}) {
  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) return;

  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    amount: amount ?? null,
    currency,
  });
}
