// src/app/api/flutterwave/verify/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = admin();

  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  const signature = req.headers.get('verif-hash');

  if (secretHash && (!signature || signature !== secretHash)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const eventData = payload?.data;
  const tx_ref = eventData?.tx_ref;
  const transaction_id = eventData?.id;
  const amount = Number(eventData?.amount ?? 0);
  const currency = String(eventData?.currency ?? 'NGN');
  const status = String(eventData?.status ?? '');

  if (!tx_ref) return NextResponse.json({ ok: true });
  const userId = String(tx_ref).split('_')[0];
  if (!userId) return NextResponse.json({ ok: true });

  try {
    // ✅ Idempotency: already inserted deposit tx with this tx_ref?
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('transaction_type', 'deposit')
      // PostgREST JSON accessor
      .eq('metadata->>tx_ref', String(tx_ref))
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already_processed' });
    }

    // ✅ Verify with Flutterwave API
    const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!FLW_SECRET) return NextResponse.json({ ok: false, message: 'Server config error: missing FLUTTERWAVE_SECRET_KEY' }, { status: 500 });

    const verificationUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
    const verificationResponse = await fetch(verificationUrl, {
      headers: { Authorization: `Bearer ${FLW_SECRET}` },
    });

    if (!verificationResponse.ok) {
      return NextResponse.json({ ok: false, message: `Flutterwave verify failed: ${verificationResponse.status}` }, { status: 400 });
    }

    const verificationData = await verificationResponse.json();

    const ok =
      verificationData?.status === 'success' &&
      verificationData?.data?.status === 'successful' &&
      Number(verificationData?.data?.amount) === amount &&
      String(verificationData?.data?.tx_ref) === String(tx_ref);

    const nowIso = new Date().toISOString();

    if (!ok || status !== 'successful') {
      // Save failed transaction (optional)
      await supabase.from('transactions').insert({
        user_id: userId,
        transaction_type: 'deposit',
        status: 'failed',
        amount: Number.isFinite(amount) ? amount : 0,
        currency,
        description: 'Deposit failed / cancelled',
        created_at: nowIso,
        metadata: { tx_ref, flutterwave_id: transaction_id },
      } as any);

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Deposit Failed',
        message: 'Your deposit was not successful.',
        type: 'error',
        is_read: false,
        created_at: nowIso,
      } as any);

      return NextResponse.json({ ok: true });
    }

    // ✅ (Optional) enforce NGN-only base
    if (String(currency).toUpperCase() !== 'NGN') {
      await supabase.from('transactions').insert({
        user_id: userId,
        transaction_type: 'deposit',
        status: 'failed',
        amount,
        currency,
        description: 'Deposit currency not supported (NGN only)',
        created_at: nowIso,
        metadata: { tx_ref, flutterwave_id: transaction_id, currency },
      } as any);

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Deposit Not Credited',
        message: 'Deposit currency not supported. Please deposit in NGN.',
        type: 'error',
        is_read: false,
        created_at: nowIso,
      } as any);

      return NextResponse.json({ ok: true });
    }

    // ✅ Credit wallet
    const { data: userRow, error: uErr } = await supabase.from('users').select('wallet_balance').eq('id', userId).maybeSingle();
    if (uErr || !userRow) return NextResponse.json({ ok: false, message: 'User not found' }, { status: 404 });

    const current = Number((userRow as any).wallet_balance ?? 0);
    const next = (Number.isFinite(current) ? current : 0) + amount;

    const { error: upErr } = await supabase.from('users').update({ wallet_balance: next }).eq('id', userId);
    if (upErr) throw upErr;

    // ✅ Insert History transaction
    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: userId,
      transaction_type: 'deposit',
      status: 'success',
      amount,
      currency: 'NGN',
      description: 'Wallet Deposit',
      created_at: nowIso,
      metadata: { tx_ref, flutterwave_id: transaction_id },
    } as any);

    if (txErr) throw txErr;

    // ✅ Insert Notification
    const { error: nErr } = await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Deposit Successful',
      message: 'Your wallet has been credited.',
      type: 'deposit',
      is_read: false,
      created_at: nowIso,
      amount,
      currency: 'NGN',
      metadata: { tx_ref },
    } as any);

    // fallback if optional columns missing
    if (nErr) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Deposit Successful',
        message: 'Your wallet has been credited.',
        type: 'deposit',
        is_read: false,
        created_at: nowIso,
      } as any);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('flutterwave verify error:', e?.message || e);
    // return 200 so flutterwave doesn't retry endlessly
    return NextResponse.json({ ok: false, message: e?.message || 'Webhook processing failed' }, { status: 200 });
  }
}
