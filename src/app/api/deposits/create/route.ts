import { NextResponse } from 'next/server';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const amountInput = Number(body?.amountInput ?? 0);
    const amountUsdt = Number(body?.amountUsdt ?? 0);
    const inputCurrency = String(body?.inputCurrency ?? 'USDT').toUpperCase();
    const paymentMethod = String(body?.paymentMethod ?? 'crypto_checkout');
    let userName = String(body?.userName ?? '').trim();
    const cardTypeRaw = String(body?.cardDetails?.cardType ?? '').trim().toLowerCase();
    const isUnsupportedVerve = paymentMethod === 'card_payment' && cardTypeRaw === 'verve';

    if (!Number.isFinite(amountInput) || amountInput <= 0) {
      return NextResponse.json({ ok: false, message: 'Invalid deposit amount.' }, { status: 400 });
    }
    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
      return NextResponse.json({ ok: false, message: 'Invalid converted amount.' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const now = new Date().toISOString();

    if (!userName) {
      const { data: profile } = await admin
        .from('users')
        .select('full_name,email')
        .eq('id', user.id)
        .maybeSingle();
      userName = String((profile as any)?.full_name || (profile as any)?.email || user.email || user.id).trim();
    }

    const metadata: any = {
      paymentMethod,
      amountInput,
      inputCurrency,
      amountUsdt,
      userName,
      cardDetails: body?.cardDetails ?? null,
      receiptDataUrl: null,
      receiptFileName: null,
      submittedForReviewAt: null,
      cancellationReason: isUnsupportedVerve ? 'unsupported_card_type_verve' : null,
    };

    const status = isUnsupportedVerve ? 'failed' : 'pending';

    const { data, error } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'deposit',
        amount: amountUsdt,
        currency: 'USDT',
        status,
        description: `Deposit (${paymentMethod})`,
        created_at: now,
        metadata,
      } as any)
      .select('id')
      .single();

    if (error) throw error;

    if (isUnsupportedVerve) {
      return NextResponse.json({
        ok: true,
        txId: data.id,
        cancelled: true,
        message: 'Verve card is currently unsupported. Transaction has been cancelled and marked failed.',
      });
    }

    return NextResponse.json({ ok: true, txId: data.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Could not create deposit request.' }, { status: 500 });
  }
}
