import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const pin = String(body?.pin || '').trim();

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, message: 'PIN must be exactly 4 digits.' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const { data: row, error: rowErr } = await admin
      .from('users')
      .select('withdrawal_pin_hash, withdrawal_pin_set')
      .eq('id', user.id)
      .maybeSingle();

    if (rowErr) throw rowErr;

    const alreadySet = Boolean(row?.withdrawal_pin_hash) || Boolean((row as any)?.withdrawal_pin_set);
    if (alreadySet) {
      return NextResponse.json(
        { ok: false, message: 'PIN already set. Use "Forgot PIN" to reset.' },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(pin, 10);

    const { error: updErr } = await admin
      .from('users')
      .update({
        withdrawal_pin_hash: hash,
        withdrawal_pin_set: true,
        withdrawal_pin_set_at: new Date().toISOString(),
        withdrawal_pin_failed_attempts: 0,
        withdrawal_pin_locked_until: null,
      })
      .eq('id', user.id);

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, message: 'PIN set.' });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Set PIN error' }, { status: 500 });
  }
}
