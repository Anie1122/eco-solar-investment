import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { assertTransactionStatus } from '@/lib/transaction-status';

export async function POST(req: Request) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const txId = String(body?.txId ?? '').trim();
    const action = String(body?.action ?? '').trim();
    const type = String(body?.type ?? 'deposit').trim();
    const adminNote = String(body?.adminNote ?? '').trim();

    if (!txId || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ ok: false, message: 'Invalid review payload.' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    if (type === 'gift_card') {
      const { data: gift, error: giftErr } = await admin
        .from('gift_card_payments')
        .select('id,status')
        .eq('id', txId)
        .maybeSingle();

      if (giftErr) throw giftErr;
      if (!gift) {
        return NextResponse.json({ ok: false, message: 'Gift card payment not found.' }, { status: 404 });
      }

      if (gift.status !== 'pending') {
        return NextResponse.json({ ok: false, message: 'Gift card payment already reviewed.' }, { status: 400 });
      }

      const { error: updGiftErr } = await admin
        .from('gift_card_payments')
        .update({
          status: action === 'approve' ? 'approved' : 'declined',
          admin_note: adminNote || null,
        })
        .eq('id', txId);

      if (updGiftErr) throw updGiftErr;

      return NextResponse.json({ ok: true });
    }

    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .select('id,user_id,amount,status,metadata,transaction_type')
      .eq('id', txId)
      .maybeSingle();

    if (txErr) throw txErr;
    if (!tx || tx.transaction_type !== 'deposit') {
      return NextResponse.json({ ok: false, message: 'Deposit not found.' }, { status: 404 });
    }

    if (tx.status !== 'pending') {
      return NextResponse.json({ ok: false, message: 'Deposit already reviewed.' }, { status: 400 });
    }

    if (action === 'approve') {
      const { data: userRow, error: uErr } = await admin.from('users').select('wallet_balance').eq('id', tx.user_id).maybeSingle();
      if (uErr) throw uErr;
      const current = Number((userRow as any)?.wallet_balance ?? 0);
      const add = Number((tx as any).amount ?? 0);
      const { error: updUserErr } = await admin.from('users').update({ wallet_balance: current + add }).eq('id', tx.user_id);
      if (updUserErr) throw updUserErr;
    }

    const nextStatus = assertTransactionStatus(action === 'approve' ? 'success' : 'failed');
    const metadata = {
      ...((tx as any).metadata || {}),
      reviewedAt: new Date().toISOString(),
      reviewedAction: action,
      adminNote: adminNote || null,
    };

    const { error: updTxErr } = await admin
      .from('transactions')
      .update({ status: nextStatus, metadata })
      .eq('id', tx.id);
    if (updTxErr) throw updTxErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Transaction review failed:', e);
    return NextResponse.json({ ok: false, message: e?.message || 'Failed to review deposit.' }, { status: 500 });
  }
}
