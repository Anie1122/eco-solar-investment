import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { z } from 'zod';

const schema = z.object({
  status: z.enum(['approved', 'declined']),
  admin_note: z.string().trim().max(1000).optional().or(z.literal('')),
});

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await assertAdmin(req);
  if (!adminCheck.ok) return NextResponse.json({ ok: false, message: adminCheck.message }, { status: adminCheck.status });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
  }

  const { admin } = adminCheck;
  const { error } = await admin
    .from('gift_card_payments')
    .update({ status: parsed.data.status, admin_note: parsed.data.admin_note || null, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ ok: false, message: 'Failed to update request.' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
