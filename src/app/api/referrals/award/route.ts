// src/app/api/referrals/award/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REFERRAL_BONUS_USDT = 0.2175; // 300 NGN × 0.000725

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function upperTrim(v: any) {
  return String(v ?? '').trim().toUpperCase();
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
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
    const newUserId = String(body?.newUserId ?? '').trim();
    const refCode = upperTrim(body?.refCode);

    if (!newUserId || !refCode) {
      return json(400, { ok: false, message: 'Missing data: newUserId/refCode' });
    }

    // 1) Load new user (avoid awarding twice)
    const { data: newUser, error: newErr } = await supabaseAdmin
      .from('users')
      .select('id, referral_awarded')
      .eq('id', newUserId)
      .maybeSingle();

    if (newErr) throw newErr;
    if (!newUser) return json(404, { ok: false, message: 'User row missing' });

    if ((newUser as any).referral_awarded === true) {
      return json(200, { ok: true, skipped: true, reason: 'already_awarded' });
    }

    // 2) Find inviter by invite_code
    const { data: inviter, error: invErr } = await supabaseAdmin
      .from('users')
      .select('id, currency, wallet_balance')
      .eq('invite_code', refCode)
      .maybeSingle();

    if (invErr) throw invErr;
    if (!inviter) return json(400, { ok: false, message: 'Invalid invite code' });

    if (String(inviter.id) === String(newUserId)) {
      return json(400, { ok: false, message: 'You cannot use your own invite code' });
    }

    const inviterId = String(inviter.id);
    const inviterCurrency = upperTrim((inviter as any).currency || 'USDT');

    // 3) Idempotency check
    const { data: existingRef, error: exErr } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('inviter_id', inviterId)
      .eq('referred_user_id', newUserId)
      .maybeSingle();

    if (exErr) throw exErr;

    if (existingRef?.id) {
      await supabaseAdmin.from('users').update({ referral_awarded: true }).eq('id', newUserId);
      return json(200, { ok: true, skipped: true, reason: 'already_exists' });
    }

    const nowIso = new Date().toISOString();

    // 4) Insert referral row
    const { error: insErr } = await supabaseAdmin.from('referrals').insert({
      inviter_id: inviterId,
      referred_user_id: newUserId,
      ref_code: refCode,
      bonus_ngn: REFERRAL_BONUS_USDT, // legacy column name, USDT base value
      bonus_paid: REFERRAL_BONUS_USDT,
      currency: 'USDT',
      created_at: nowIso,
    } as any);

    if (insErr) throw insErr;

    // 5) Credit wallet in USDT base
    const currentWallet = Number((inviter as any).wallet_balance ?? 0);
    const newWallet = (Number.isFinite(currentWallet) ? currentWallet : 0) + REFERRAL_BONUS_USDT;

    const { error: upWalletErr } = await supabaseAdmin
      .from('users')
      .update({ wallet_balance: newWallet })
      .eq('id', inviterId);

    if (upWalletErr) throw upWalletErr;

    // 6) Mark new user as awarded
    const { error: awardFlagErr } = await supabaseAdmin
      .from('users')
      .update({ referral_awarded: true })
      .eq('id', newUserId);

    if (awardFlagErr) throw awardFlagErr;

    // 7) Insert transaction (History)
    const { error: txErr } = await supabaseAdmin.from('transactions').insert({
      user_id: inviterId,
      transaction_type: 'bonus',
      status: 'success',
      amount: REFERRAL_BONUS_USDT,
      currency: 'USDT',
      description: 'Referral Bonus',
      created_at: nowIso,
      metadata: {
        kind: 'referral_bonus',
        base_usdt: REFERRAL_BONUS_USDT,
        ref_code: refCode,
        referred_user_id: newUserId,
        inviter_currency: inviterCurrency,
      },
    } as any);

    if (txErr) {
      return json(500, {
        ok: false,
        message: `Wallet credited but history insert failed: ${txErr.message}`,
      });
    }

    // 8) Insert notification (Bell)
    // (If your notifications table doesn't have amount/currency/metadata columns, remove them)
    const { error: nErr } = await supabaseAdmin.from('notifications').insert({
      user_id: inviterId,
      title: 'Referral Bonus Credited',
      message: `You earned ${REFERRAL_BONUS_USDT} USDT for a successful referral.`,
      type: 'bonus',
      is_read: false,
      created_at: nowIso,
      amount: REFERRAL_BONUS_USDT,
      currency: 'USDT',
      metadata: { kind: 'referral_bonus', ref_code: refCode, referred_user_id: newUserId },
    } as any);

    // If notification insert fails due to missing columns, fallback to minimal insert
    if (nErr) {
      await supabaseAdmin.from('notifications').insert({
        user_id: inviterId,
        title: 'Referral Bonus Credited',
        message: `You earned ${REFERRAL_BONUS_USDT} USDT for a successful referral.`,
        type: 'bonus',
        is_read: false,
        created_at: nowIso,
      } as any);
    }

    return json(200, {
      ok: true,
      credited_usdt: REFERRAL_BONUS_USDT,
      inviter_id: inviterId,
      new_wallet_balance_usdt: newWallet,
    });
  } catch (e: any) {
    return json(500, { ok: false, message: e?.message || 'Server error' });
  }
}
