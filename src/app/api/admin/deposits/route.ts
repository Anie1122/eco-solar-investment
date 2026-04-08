import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: txRows, error: txErr } = await admin
      .from('transactions')
      .select('id,user_id,transaction_type,amount,currency,status,created_at,metadata')
      .in('transaction_type', ['deposit', 'withdrawal'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (txErr) throw txErr;

    return NextResponse.json({ ok: true, rows: txRows || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Failed to fetch deposits.' }, { status: 500 });
  }
}
