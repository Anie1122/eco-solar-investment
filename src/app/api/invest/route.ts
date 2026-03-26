// src/app/api/invest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { investmentPlans } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function addHoursISO(iso: string, hours: number) {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function safeNotify(payload: any) {
  const { error } = await supabaseAdmin.from('notifications').insert(payload as any);
  if (!error) return;

  // fallback if optional columns missing
  await supabaseAdmin.from('notifications').insert({
    user_id: payload.user_id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    is_read: false,
    created_at: payload.created_at,
  } as any);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Invalid or expired token.' }, { status: 401 });
    }

    const userId = userData.user.id;

    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ success: false, message: 'Investment plan ID is required.' }, { status: 400 });
    }

    const plan = investmentPlans.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Invalid investment plan.' }, { status: 404 });
    }

    const { data: userRow, error: userRowErr } = await supabaseAdmin
      .from('users')
      .select('id,currency,wallet_balance,bonus_balance,has_invested')
      .eq('id', userId)
      .maybeSingle();

    if (userRowErr || !userRow) {
      return NextResponse.json({ success: false, message: 'Could not find user profile.' }, { status: 404 });
    }

    const currency = userRow.currency || 'USDT';

    const investAmount = Number(plan.amount);
    const firstProfit = Number(plan.dailyProfit);

    const walletBalance = Number(userRow.wallet_balance ?? 0);
    const bonusBalance = Number(userRow.bonus_balance ?? 0);
    const hasInvested = Boolean(userRow.has_invested);

    if (walletBalance < investAmount) {
      return NextResponse.json({ success: false, message: 'You do not have enough funds to make this investment.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const endsAtIso = addDaysISO(nowIso, Number(plan.duration));
    const lastProfitAtIso = nowIso;
    const nextProfitAtIso = addHoursISO(nowIso, 24);

    const bonusToUnlock = !hasInvested ? bonusBalance : 0;

    const newWallet = walletBalance - investAmount + firstProfit + bonusToUnlock;

    const { error: userUpdErr } = await supabaseAdmin
      .from('users')
      .update({
        wallet_balance: newWallet,
        has_invested: true,
        ...(bonusToUnlock > 0 ? { bonus_balance: 0 } : {}),
      })
      .eq('id', userId);

    if (userUpdErr) throw userUpdErr;

    const { data: invInserted, error: invErr } = await supabaseAdmin
      .from('investments')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        plan_name: plan.name,
        duration_days: Number(plan.duration),
        amount: investAmount,
        daily_profit: firstProfit,
        total_return: Number(plan.totalReturn),
        currency,
        status: 'active',
        started_at: nowIso,
        ends_at: endsAtIso,
        last_profit_at: lastProfitAtIso,
        next_profit_at: nextProfitAtIso,
      })
      .select('id')
      .maybeSingle();

    if (invErr) throw invErr;

    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      transaction_type: 'investment',
      status: 'success',
      amount: investAmount,
      currency,
      description: `Investment in ${plan.name}`,
      created_at: nowIso,
      metadata: { investment_id: invInserted?.id ?? null, plan_id: plan.id },
    } as any);

    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      transaction_type: 'profit',
      status: 'success',
      amount: firstProfit,
      currency,
      description: `First day profit from ${plan.name}`,
      created_at: nowIso,
      metadata: { investment_id: invInserted?.id ?? null, plan_id: plan.id },
    } as any);

    if (bonusToUnlock > 0) {
      await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        transaction_type: 'bonus',
        status: 'success',
        amount: bonusToUnlock,
        currency,
        description: 'Unlocked sign-up bonus on first investment',
        created_at: nowIso,
        metadata: { reason: 'first_investment' },
      } as any);
    }

    // ✅ Notifications
    await safeNotify({
      user_id: userId,
      title: 'Investment Successful',
      message: `You successfully invested in ${plan.name}.`,
      type: 'investment',
      is_read: false,
      created_at: nowIso,
      amount: investAmount,
      currency: 'USDT',
      metadata: { plan_id: plan.id, investment_id: invInserted?.id ?? null },
    });

    await safeNotify({
      user_id: userId,
      title: 'Profit Credited',
      message: `Your first profit from ${plan.name} has been credited.`,
      type: 'profit',
      is_read: false,
      created_at: nowIso,
      amount: firstProfit,
      currency: 'USDT',
      metadata: { plan_id: plan.id, investment_id: invInserted?.id ?? null },
    });

    if (bonusToUnlock > 0) {
      await safeNotify({
        user_id: userId,
        title: 'Bonus Unlocked',
        message: 'Your sign-up bonus has been unlocked and added to your wallet.',
        type: 'bonus',
        is_read: false,
        created_at: nowIso,
        amount: bonusToUnlock,
        currency: 'USDT',
        metadata: { reason: 'first_investment' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Investment successful! First profit credited instantly.',
      next_profit_at: nextProfitAtIso,
      ends_at: endsAtIso,
    });
  } catch (error: any) {
    console.error('API /api/invest Error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An internal server error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
