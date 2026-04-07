import { NextResponse } from 'next/server';
import { getAdminCookieConfig, validateAdminCredentials } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '').trim();

  if (!validateAdminCredentials(email, password)) {
    return NextResponse.json({ ok: false, message: 'Invalid login credentials.' }, { status: 401 });
  }

  const cookie = getAdminCookieConfig();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
