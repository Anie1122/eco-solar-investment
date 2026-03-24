import { NextResponse } from 'next/server';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const txId = String(body?.txId ?? '').trim();
    const receiptDataUrl = String(body?.receiptDataUrl ?? '').trim();
    const receiptFileName = String(body?.receiptFileName ?? '').trim();

    if (!txId || !receiptDataUrl) {
      return NextResponse.json({ ok: false, message: 'Missing receipt payload.' }, { status: 400 });
    }

    const approxBytes = Math.ceil((receiptDataUrl.length * 3) / 4);
    if (approxBytes > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: 'Receipt must be 5MB or below.' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data: row, error } = await admin
      .from('transactions')
      .select('id,user_id,metadata,status,transaction_type')
      .eq('id', txId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!row || row.transaction_type !== 'deposit') {
      return NextResponse.json({ ok: false, message: 'Deposit transaction not found.' }, { status: 404 });
    }

    const metadata = {
      ...((row as any).metadata || {}),
      receiptDataUrl,
      receiptFileName: receiptFileName || 'receipt-upload',
      submittedForReviewAt: new Date().toISOString(),
    };

    const { error: updErr } = await admin
      .from('transactions')
      .update({ metadata, status: 'pending' })
      .eq('id', txId)
      .eq('user_id', user.id);

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Could not upload receipt.' }, { status: 500 });
  }
}
