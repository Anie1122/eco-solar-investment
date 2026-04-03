import { NextResponse } from 'next/server';
import { ADMIN_EMAIL, ADMIN_PASSWORD, getAdminCookieConfig } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '').trim();

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, message: 'Invalid admin credentials.' }, { status: 401 });
  }

  const cookie = getAdminCookieConfig();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
