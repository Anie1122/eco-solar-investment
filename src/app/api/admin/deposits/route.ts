import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from('transactions')
      .select('id,user_id,amount,currency,status,created_at,metadata')
      .eq('transaction_type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ ok: true, rows: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Failed to fetch deposits.' }, { status: 500 });
  }
}
