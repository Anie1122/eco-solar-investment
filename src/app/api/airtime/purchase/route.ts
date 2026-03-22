// src/app/api/airtime/purchase/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function cleanStr(v: any) {
  return String(v ?? '').trim();
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return json(500, {
        ok: false,
        message: 'Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      });
    }

    const auth = req.headers.get('authorization') || '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null;
    if (!token) return json(401, { ok: false, message: 'Missing auth token' });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { ok: false, message: 'Invalid session' });

    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const network = cleanStr(body?.network);
    const phone = cleanStr(body?.phone);
    const amount = Number(body?.amount);
    const pin = cleanStr(body?.pin);

    if (!network || !phone || !Number.isFinite(amount) || amount <= 0 || !pin) {
      return json(400, { ok: false, message: 'Missing/invalid: network, phone, amount, pin' });
    }

    // get user currency (so transaction uses user currency)
    const { data: urow, error: uerr } = await supabaseAdmin
      .from('users')
      .select('id,currency')
      .eq('id', userId)
      .maybeSingle();

    if (uerr) throw uerr;

    const currency = (urow as any)?.currency || 'NGN';

    // ✅ Atomic RPC
    const { data: txId, error: rpcErr } = await supabaseAdmin.rpc('purchase_airtime', {
      p_user_id: userId,
      p_amount: amount,
      p_currency: currency,
      p_network: network,
      p_phone: phone,
      p_pin: pin,
    });

    if (rpcErr) {
      return json(400, { ok: false, message: rpcErr.message || 'Purchase failed' });
    }

    return json(200, { ok: true, txId, network, phone, amount, currency });
  } catch (e: any) {
    return json(500, { ok: false, message: e?.message || 'Server error' });
  }
}
