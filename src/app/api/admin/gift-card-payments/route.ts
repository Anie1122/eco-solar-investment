import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function parseAdminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

async function assertAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { ok: false, status: 401, message: 'Unauthorized' } as const;

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return { ok: false, status: 401, message: 'Unauthorized' } as const;

  const allowList = parseAdminEmails();
  const isAdmin = allowList.includes(String(user.email || '').toLowerCase()) || user.app_metadata?.role === 'admin';
  if (!isAdmin) return { ok: false, status: 403, message: 'Forbidden' } as const;

  return { ok: true, admin, user } as const;
}

export async function GET(req: NextRequest) {
  const adminCheck = await assertAdmin(req);
  if (!adminCheck.ok) return NextResponse.json({ ok: false, message: adminCheck.message }, { status: adminCheck.status });

  const { admin } = adminCheck;
  const { data, error } = await admin
    .from('gift_card_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, message: 'Failed to load gift card requests.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, requests: data || [] });
}
