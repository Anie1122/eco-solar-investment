import { NextResponse } from 'next/server';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from('users')
      .select('withdrawal_pin_hash')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, isSet: Boolean(data?.withdrawal_pin_hash) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Status error' }, { status: 500 });
  }
}
