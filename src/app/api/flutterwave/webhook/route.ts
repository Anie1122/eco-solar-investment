// src/app/api/flutterwave/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    if (!supabase) {
      return json(500, {
        ok: false,
        message:
          'Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('verif-hash');
    const secret = process.env.FLW_WEBHOOK_SECRET;

    // Flutterwave: verify webhook hash
    if (!secret || !signature || signature !== secret) {
      return json(401, { ok: false, message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody);

    // Only process successful payments
    const isSuccessfulCharge =
      payload?.event === 'charge.completed' &&
      payload?.data?.status === 'successful';

    if (!isSuccessfulCharge) {
      return json(200, { ok: true, message: 'Event ignored' });
    }

    const userId = payload?.data?.meta?.user_id as string | undefined;
    const amountRaw = payload?.data?.amount;
    const currency = String(
      payload?.data?.currency ?? payload?.data?.meta?.currency ?? 'NGN'
    ).toUpperCase();

    // Flutterwave identifiers
    const flwId = payload?.data?.id ?? null;
    const txRef = payload?.data?.tx_ref ?? payload?.data?.flw_ref ?? null;

    const amount = Number(amountRaw);

    if (!userId) return json(400, { ok: false, message: 'User ID missing' });
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(400, { ok: false, message: 'Invalid amount' });
    }

    // ✅ Idempotency: if we already logged this Flutterwave charge as a SUCCESS deposit, do nothing.
    const { data: existingTx, error: existingErr } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('transaction_type', 'deposit')
      .eq('status', 'success')
      .or(
        [
          txRef ? `metadata->>tx_ref.eq.${txRef}` : null,
          flwId ? `metadata->>flw_id.eq.${String(flwId)}` : null,
        ]
          .filter(Boolean)
          .join(',')
      )
      .maybeSingle();

    if (!existingErr && existingTx?.id) {
      return json(200, { ok: true, skipped: true, reason: 'already_processed' });
    }

    // ✅ 1) Credit wallet (RPC)
    const { error: creditErr } = await supabase.rpc('credit_wallet', {
      user_id_input: userId,
      amount_input: amount,
    });

    if (creditErr) {
      console.error('credit_wallet error:', creditErr);
      return json(500, { ok: false, message: 'Wallet credit failed' });
    }

    // ✅ 2) Write transaction history
    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: userId,
      transaction_type: 'deposit',
      amount: amount,
      currency: currency,
      status: 'success',
      description: `Flutterwave deposit: ${amount} ${currency}`,
      created_at: new Date().toISOString(),
      metadata: {
        provider: 'flutterwave',
        flw_id: flwId,
        tx_ref: txRef,
        event: payload?.event ?? null,
      },
    } as any);

    // If tx insert fails, wallet already credited; return 200 so Flutterwave won’t retry forever.
    if (txErr) {
      console.error('transactions insert error:', txErr);

      // ✅ Try bonus unlock anyway (won’t break deposit if it fails)
      try {
        const { error: bonusErr } = await supabase.rpc(
          'unlock_bonus_on_first_deposit',
          { p_user_id: userId }
        );
        if (bonusErr) console.warn('unlock_bonus_on_first_deposit warning:', bonusErr);
      } catch (e) {
        console.warn('unlock_bonus_on_first_deposit exception:', e);
      }

      return json(200, { ok: true, warning: 'credited_but_tx_log_failed' });
    }

    // ✅ 3) NEW RULE: unlock bonus on FIRST DEPOSIT (and credit it)
    // (Your SQL already handles: only once, and writes bonus transaction + credits balance)
    try {
      const { error: bonusErr } = await supabase.rpc(
        'unlock_bonus_on_first_deposit',
        { p_user_id: userId }
      );
      if (bonusErr) {
        console.warn('unlock_bonus_on_first_deposit warning:', bonusErr);
        // do NOT fail deposit for bonus issues
      }
    } catch (e) {
      console.warn('unlock_bonus_on_first_deposit exception:', e);
    }

    return json(200, {
      ok: true,
      message: 'Wallet credited + transaction logged (+ bonus unlock checked)',
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return json(500, { ok: false, message: error?.message || 'Webhook error' });
  }
}
