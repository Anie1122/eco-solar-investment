import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

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
      .select('withdrawal_pin_hash, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until, withdrawal_pin_set')
      .eq('id', user.id)
      .maybeSingle();

    if (rowErr) throw rowErr;

    const hash = (row as any)?.withdrawal_pin_hash as string | null;
    const pinSet = Boolean((row as any)?.withdrawal_pin_set) || Boolean(hash);

    if (!pinSet || !hash) {
      return NextResponse.json({ ok: false, message: 'No withdrawal PIN set.' }, { status: 409 });
    }

    const lockedUntil = (row as any)?.withdrawal_pin_locked_until as string | null;
    if (lockedUntil) {
      const lockedTs = new Date(lockedUntil).getTime();
      if (!Number.isNaN(lockedTs) && Date.now() < lockedTs) {
        return NextResponse.json(
          { ok: false, message: 'PIN locked. Please try again later.' },
          { status: 423 }
        );
      }
    }

    const ok = await bcrypt.compare(pin, hash);

    if (ok) {
      // reset attempts on success
      await admin
        .from('users')
        .update({
          withdrawal_pin_failed_attempts: 0,
          withdrawal_pin_locked_until: null,
        })
        .eq('id', user.id);

      return NextResponse.json({ ok: true, valid: true });
    }

    // wrong pin: increment attempts and maybe lock
    const attempts = Number((row as any)?.withdrawal_pin_failed_attempts ?? 0) + 1;

    const update: any = { withdrawal_pin_failed_attempts: attempts };

    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
      update.withdrawal_pin_locked_until = lockUntil;
    }

    await admin.from('users').update(update).eq('id', user.id);

    return NextResponse.json({ ok: true, valid: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Verify PIN error' }, { status: 500 });
  }
}
