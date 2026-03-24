import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const txId = String(body?.txId ?? '').trim();
    const action = String(body?.action ?? '').trim();

    if (!txId || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ ok: false, message: 'Invalid review payload.' }, { status: 400 });
    }

    const admin = supabaseAdmin();
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

    const nextStatus = action === 'approve' ? 'successful' : 'declined';
    const metadata = {
      ...((tx as any).metadata || {}),
      reviewedAt: new Date().toISOString(),
      reviewedAction: nextStatus,
    };

    const { error: updTxErr } = await admin.from('transactions').update({ status: nextStatus, metadata }).eq('id', tx.id);
    if (updTxErr) throw updTxErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Failed to review deposit.' }, { status: 500 });
  }
}
