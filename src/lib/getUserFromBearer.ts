import { createClient } from '@supabase/supabase-js';

export async function getUserFromBearer(req: Request) {
  const authHeader =
    req.headers.get('authorization') ||
    req.headers.get('Authorization') ||
    '';

  const auth = authHeader.trim();
  const token = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : null;

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !anon) return null;

  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);

  if (error) return null;
  return data.user ?? null;
}
