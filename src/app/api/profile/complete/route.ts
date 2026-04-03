import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSignupBonusUsdtToday } from '@/lib/bonus';
import { BASE_CURRENCY } from '@/lib/crypto-rates';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email, fullName, country, phone_number } = body ?? {};

    if (!userId) {
      return NextResponse.json({ ok: false, message: 'Missing userId' }, { status: 400 });
    }

    if (!country || !phone_number) {
      return NextResponse.json({ ok: false, message: 'Missing required profile fields' }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const currency = BASE_CURRENCY;
    const signupBonusUsdt = await getSignupBonusUsdtToday();

    const { error } = await admin
      .from('users')
      .upsert(
        {
          id: userId,
          email: email ?? '',
          full_name: fullName ?? '',
          country,
          phone_number,
          currency,
          wallet_balance: 0,
          bonus_balance: signupBonusUsdt,
          has_invested: false,
          profile_completed: true,
          status: 'active',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Profile completion failed:', e);
    return NextResponse.json(
      { ok: false, message: e?.message || 'Could not complete profile.' },
      { status: 500 }
    );
  }
}
