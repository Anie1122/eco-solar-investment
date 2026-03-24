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
    const paymentMethod = String(body?.paymentMethod ?? 'crypto');
    const userName = String(body?.userName ?? '').trim();

    if (!Number.isFinite(amountInput) || amountInput <= 0) {
      return NextResponse.json({ ok: false, message: 'Invalid deposit amount.' }, { status: 400 });
    }
    if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
      return NextResponse.json({ ok: false, message: 'Invalid converted amount.' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const now = new Date().toISOString();

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
    };

    const { data, error } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'deposit',
        amount: amountUsdt,
        currency: 'USDT',
        status: 'pending',
        description: `Manual deposit request via ${paymentMethod}`,
        created_at: now,
        metadata,
      } as any)
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, txId: data.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Could not create deposit request.' }, { status: 500 });
  }
}
