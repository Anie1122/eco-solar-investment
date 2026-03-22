import { NextResponse } from 'next/server';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const admin = supabaseAdmin();

    const { error } = await admin
      .from('users')
      .update({
        withdrawal_pin_hash: null,
        withdrawal_pin_set_at: null,
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, message: 'PIN cleared. Please set a new PIN.' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Clear PIN error' }, { status: 500 });
  }
}
