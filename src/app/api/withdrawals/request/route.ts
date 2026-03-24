import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const amount = Number(body?.amount ?? 0);
    const pin = String(body?.pin ?? '').trim();

    const destinationType = String(body?.destinationType ?? 'crypto').trim().toLowerCase();
    const chain = String(body?.chain ?? '').trim();
    const walletAddress = String(body?.walletAddress ?? '').trim();

    const bankName = String(body?.bankName ?? '').trim();
    const accountNumber = String(body?.accountNumber ?? '').trim();
    const accountName = String(body?.accountName ?? '').trim();
    const payoutCurrency = String(body?.payoutCurrency ?? 'USDT').trim().toUpperCase();

    const LOCAL_RATE_TO_USDT: Record<string, number> = {
      USDT: 1,
      USD: 1,
      NGN: 1600,
      GHS: 15.5,
      KES: 130,
      ZAR: 18.5,
      GBP: 0.79,
      EUR: 0.92,
    };

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, message: 'Invalid amount.' }, { status: 400 });
    }
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, message: 'PIN must be exactly 4 digits.' }, { status: 400 });
    }
    if (destinationType !== 'crypto' && destinationType !== 'bank') {
      return NextResponse.json({ ok: false, message: 'Invalid withdrawal destination type.' }, { status: 400 });
    }

    if (destinationType === 'crypto') {
      if (chain.length < 2) {
        return NextResponse.json({ ok: false, message: 'Please select a crypto chain.' }, { status: 400 });
      }
      if (walletAddress.length < 8) {
        return NextResponse.json({ ok: false, message: 'Please enter a valid wallet address.' }, { status: 400 });
      }
    }

    if (destinationType === 'bank') {
      if (!LOCAL_RATE_TO_USDT[payoutCurrency]) {
        return NextResponse.json({ ok: false, message: 'Unsupported local payout currency.' }, { status: 400 });
      }
      if (bankName.length < 2 || accountName.length < 2 || !/^\d{8,12}$/.test(accountNumber)) {
        return NextResponse.json({ ok: false, message: 'Invalid bank details.' }, { status: 400 });
      }
    }

    const admin = supabaseAdmin();

    const { data: row, error: rowErr } = await admin
      .from('users')
      .select(
        'wallet_balance,currency,country,profile_completed,withdrawal_pin_hash,withdrawal_pin_failed_attempts,withdrawal_pin_locked_until'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (rowErr) throw rowErr;
    if (!row) return NextResponse.json({ ok: false, message: 'User not found.' }, { status: 404 });

    if (!row.profile_completed) {
      return NextResponse.json({ ok: false, message: 'Please complete your profile before withdrawing.' }, { status: 400 });
    }

    if (!row.withdrawal_pin_hash) {
      return NextResponse.json({ ok: false, code: 'PIN_NOT_SET', message: 'Please set your withdrawal PIN first.' }, { status: 400 });
    }

    const lockedUntil = row.withdrawal_pin_locked_until ? new Date(row.withdrawal_pin_locked_until).getTime() : 0;
    if (lockedUntil && Date.now() < lockedUntil) {
      return NextResponse.json({ ok: false, message: 'Too many wrong PIN attempts. Try again later.' }, { status: 429 });
    }

    const okPin = await bcrypt.compare(pin, row.withdrawal_pin_hash);
    if (!okPin) {
      const failed = Number(row.withdrawal_pin_failed_attempts ?? 0) + 1;
      const lock = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await admin.from('users').update({ withdrawal_pin_failed_attempts: failed, withdrawal_pin_locked_until: lock }).eq('id', user.id);

      return NextResponse.json({ ok: false, message: 'Wrong PIN.' }, { status: 403 });
    }

    await admin.from('users').update({ withdrawal_pin_failed_attempts: 0, withdrawal_pin_locked_until: null }).eq('id', user.id);

    const amountUsdt =
      destinationType === 'bank'
        ? amount / Number(LOCAL_RATE_TO_USDT[payoutCurrency] || 1)
        : amount;

    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
      return NextResponse.json({ ok: false, message: 'Invalid converted amount.' }, { status: 400 });
    }

    const balance = Number(row.wallet_balance ?? 0);
    if (amountUsdt > balance) {
      return NextResponse.json({ ok: false, message: 'Insufficient balance.' }, { status: 400 });
    }

    const currency = row.currency ?? 'USDT';
    const minWithdrawalUsdt = 10.875; // 15,000 NGN × 0.000725
    if (amountUsdt < minWithdrawalUsdt) {
      if (destinationType === 'bank') {
        const minInLocal = minWithdrawalUsdt * Number(LOCAL_RATE_TO_USDT[payoutCurrency] || 1);
        return NextResponse.json(
          {
            ok: false,
            message: `Minimum withdrawal is ${minInLocal.toFixed(2)} ${payoutCurrency} (${minWithdrawalUsdt} USDT base).`,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: false, message: `Minimum withdrawal is ${minWithdrawalUsdt} USDT.` }, { status: 400 });
    }

    const withdrawalAccount =
      destinationType === 'bank'
        ? {
            destinationType: 'bank',
            payoutCurrency,
            bankName,
            accountNumber,
            accountName,
            country: row.country ?? null,
            lastUsedAt: new Date().toISOString(),
          }
        : {
            destinationType: 'crypto',
            payoutCurrency: 'USDT',
            chain,
            walletAddress,
            country: row.country ?? null,
            lastUsedAt: new Date().toISOString(),
          };

    const newBalance = balance - amountUsdt;
    const nowIso = new Date().toISOString();

    const { error: updErr } = await admin
      .from('users')
      .update({ wallet_balance: newBalance, withdrawal_account: withdrawalAccount as any })
      .eq('id', user.id);

    if (updErr) throw updErr;

    await admin.from('transactions').insert({
      user_id: user.id,
      transaction_type: 'withdrawal',
      amount: amountUsdt,
      currency,
      status: 'pending',
      description:
        destinationType === 'bank'
          ? `Withdrawal to ${bankName} - ${accountNumber} (${payoutCurrency})`
          : `Crypto withdrawal (${chain}) to ${walletAddress}`,
      created_at: nowIso,
      metadata: {
        ...(withdrawalAccount as any),
        requestedAmount: amount,
        requestedCurrency: destinationType === 'bank' ? payoutCurrency : 'USDT',
        amountUsdt,
      } as any,
    } as any);

    // ✅ Notification
    const { error: nErr } = await admin.from('notifications').insert({
      user_id: user.id,
      title: 'Withdrawal Requested',
      message: 'Your withdrawal request has been submitted and is pending approval.',
      type: 'withdrawal',
      is_read: false,
      created_at: nowIso,
      amount: amountUsdt,
      currency: 'USDT',
      metadata:
        destinationType === 'bank'
          ? { bankName, accountNumber, payoutCurrency, requestedAmount: amount, amountUsdt }
          : { chain, walletAddress, requestedAmount: amount, amountUsdt },
    } as any);

    if (nErr) {
      await admin.from('notifications').insert({
        user_id: user.id,
        title: 'Withdrawal Requested',
        message: 'Your withdrawal request has been submitted and is pending approval.',
        type: 'withdrawal',
        is_read: false,
        created_at: nowIso,
      } as any);
    }

    return NextResponse.json({ ok: true, message: 'Withdrawal request submitted.' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Withdrawal error' }, { status: 500 });
  }
}
