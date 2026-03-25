// src/app/api/users/ensure/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SIGNUP_BONUS_USDT = 1.5;

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, { auth: { persistSession: false } });
}

function makeInviteCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function generateUniqueInviteCode(supabaseAdmin: any) {
  for (let i = 0; i < 10; i++) {
    const code = makeInviteCode(8);
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();

    if (!data) return code;
  }
  return `INV${Date.now().toString().slice(-8)}`;
}

async function ensureSignupBonusTransaction(params: {
  supabaseAdmin: any;
  userId: string;
  currency: string;
  amount: number;
}) {
  const { supabaseAdmin, userId, currency, amount } = params;

  // If amount invalid, do nothing (protects your CHECK amount > 0)
  if (!Number.isFinite(amount) || amount <= 0) return;

  // Check if signup bonus transaction already exists
  // Uses jsonb contains: metadata @> {"bonus_type":"signup_bonus"}
  const { data: existingTx, error: txSelErr } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('transaction_type', 'bonus')
    .contains('metadata', { bonus_type: 'signup_bonus' })
    .maybeSingle();

  if (txSelErr) {
    // If transactions table / metadata not set up correctly, don't break signup flow
    console.error('❌ transactions lookup failed:', txSelErr);
    return;
  }

  if (existingTx?.id) return; // already logged

  const { error: txInsErr } = await supabaseAdmin.from('transactions').insert({
    user_id: userId,
    transaction_type: 'bonus', // ✅ allowed by your CHECK
    amount, // ✅ must be > 0
    currency,
    status: 'success', // ✅ allowed by your CHECK
    description: `Signup bonus = ${amount} ${currency}`,
    created_at: new Date().toISOString(),
    metadata: {
      bonus_type: 'signup_bonus',
      base_currency: 'USDT',
      base_amount: DEFAULT_SIGNUP_BONUS_USDT,
    },
  } as any);

  if (txInsErr) {
    // Do not block signup/profile creation if logging fails
    console.error('❌ transactions insert failed:', txInsErr);
  }
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

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId ?? '').trim();
    const email = String(body?.email ?? '').trim();
    const fullName = String(body?.fullName ?? 'New User').trim();

    if (!userId) {
      return json(400, { ok: false, message: 'Missing userId' });
    }

    // Load existing
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (selErr) throw selErr;

    // If missing, create
    if (!existing) {
      const invite_code = await generateUniqueInviteCode(supabaseAdmin);

      const newUserRow = {
        id: userId,
        email,
        full_name: fullName,
        phone_number: '',
        country: '',
        currency: 'USDT',
        wallet_balance: 0,
        bonus_balance: DEFAULT_SIGNUP_BONUS_USDT,
        has_invested: false,
        profile_completed: false,
        status: 'active',
        invite_code,
        created_at: new Date().toISOString(),
      };

      const { error: insErr } = await supabaseAdmin.from('users').insert(newUserRow);
      if (insErr) throw insErr;

      // ✅ Log signup bonus transaction ONCE
      await ensureSignupBonusTransaction({
        supabaseAdmin,
        userId,
        currency: 'USDT',
        amount: DEFAULT_SIGNUP_BONUS_USDT,
      });

      return json(200, { ok: true, invite_code });
    }

    // Existing user: ensure invite_code exists
    let invite_code: string = existing.invite_code ?? '';
    if (!invite_code) {
      invite_code = await generateUniqueInviteCode(supabaseAdmin);
      const { error: upErr } = await supabaseAdmin.from('users').update({ invite_code }).eq('id', userId);
      if (upErr) throw upErr;
    }

    // Existing user: ensure bonus_balance not null
    // (keeps your app stable and lets us log transaction correctly)
    let bonus_balance = existing.bonus_balance;
    if (bonus_balance === null || bonus_balance === undefined) {
      bonus_balance = DEFAULT_SIGNUP_BONUS_USDT;
      const { error: bonusErr } = await supabaseAdmin
        .from('users')
        .update({ bonus_balance })
        .eq('id', userId);

      if (bonusErr) console.error('❌ failed to set missing bonus_balance:', bonusErr);
    }

    // ✅ Ensure signup bonus transaction exists (idempotent)
    const currency = String(existing.currency ?? 'USDT').toUpperCase();
    await ensureSignupBonusTransaction({
      supabaseAdmin,
      userId,
      currency,
      amount: Number(bonus_balance ?? DEFAULT_SIGNUP_BONUS_USDT),
    });

    return json(200, { ok: true, invite_code });
  } catch (e: any) {
    console.error('ensure user error:', e);
    return json(500, { ok: false, message: e?.message || 'Server error' });
  }
}
