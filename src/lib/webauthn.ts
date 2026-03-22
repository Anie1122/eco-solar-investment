// src/lib/webauthn.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export function getWebAuthnEnv() {
  const rpID = process.env.WEBAUTHN_RP_ID;
  const origin = process.env.WEBAUTHN_ORIGIN;

  if (!rpID || !origin) {
    throw new Error('Missing WEBAUTHN_RP_ID or WEBAUTHN_ORIGIN in env');
  }

  return { rpID, origin };
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase env keys');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function getUserFromBearer(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user;
}

export function setChallengeCookie(res: NextResponse, name: string, challenge: string) {
  res.cookies.set({
    name,
    value: challenge,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 10, // 10 mins
  });
}

export function readChallengeCookie(name: string) {
  const c = cookies().get(name);
  return c?.value || null;
}

export function clearChallengeCookie(res: NextResponse, name: string) {
  res.cookies.set({
    name,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
  });
}
