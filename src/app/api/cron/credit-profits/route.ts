import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROFIT_CYCLES = 6;
const DAYS_PER_CYCLE = 7;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error('Missing Supabase admin environment variables.');
  }

  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function toMoney(value: number) {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function derivePaidCycles(startedAt: string | null, nextProfitAt: string | null) {
  if (!startedAt || !nextProfitAt) return 0;
  const start = new Date(startedAt).getTime();
  const next = new Date(nextProfitAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(next)) return 0;

  const cycleMs = DAYS_PER_CYCLE * 24 * 60 * 60 * 1000;
  const deltaCycles = Math.round((next - start) / cycleMs);
  return Math.max(0, Math.min(PROFIT_CYCLES, deltaCycles - 1));
}

async function safeNotify(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string, amount: number, meta: any) {
  const nowIso = new Date().toISOString();
  const first = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title: 'Profit Credited',
    message: 'Your weekly profit has been credited to your wallet.',
    type: 'profit',
    is_read: false,
    created_at: nowIso,
    amount,
    currency: 'USDT',
    metadata: meta,
  } as any);

  if (!first.error) return;

  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title: 'Profit Credited',
    message: 'Your weekly profit has been credited to your wallet.',
    type: 'profit',
    is_read: false,
    created_at: nowIso,
  } as any);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');

    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: investments, error: invErr } = await supabaseAdmin
      .from('investments')
      .select('id,user_id,plan_name,amount,daily_profit,status,started_at,next_profit_at,ends_at')
      .eq('status', 'active')
      .not('next_profit_at', 'is', null)
      .lte('next_profit_at', nowIso)
      .order('next_profit_at', { ascending: true })
      .limit(500);

    if (invErr) throw invErr;

    let credited = 0;
    let notificationsCreated = 0;

    for (const inv of investments || []) {
      const amountPerCycle = toMoney(Number((inv as any).daily_profit ?? 0));
      if (amountPerCycle <= 0) continue;

      const paidCycles = derivePaidCycles((inv as any).started_at, (inv as any).next_profit_at);
      if (paidCycles >= PROFIT_CYCLES) {
        await supabaseAdmin
          .from('investments')
          .update({ status: 'completed', next_profit_at: null })
          .eq('id', (inv as any).id);
        continue;
      }

      const nextTs = new Date(String((inv as any).next_profit_at)).getTime();
      if (!Number.isFinite(nextTs)) continue;
      const nowTs = Date.now();
      const cycleMs = DAYS_PER_CYCLE * 24 * 60 * 60 * 1000;
      const dueCycles = Math.max(1, Math.floor((nowTs - nextTs) / cycleMs) + 1);
      const creditsToApply = Math.min(PROFIT_CYCLES - paidCycles, dueCycles);
      if (creditsToApply <= 0) continue;

      const totalCredit = toMoney(amountPerCycle * creditsToApply);

      const { data: userRow, error: userErr } = await supabaseAdmin
        .from('users')
        .select('wallet_balance')
        .eq('id', (inv as any).user_id)
        .maybeSingle();
      if (userErr) throw userErr;

      const wallet = toMoney(Number((userRow as any)?.wallet_balance ?? 0));
      const { error: updUserErr } = await supabaseAdmin
        .from('users')
        .update({ wallet_balance: toMoney(wallet + totalCredit) })
        .eq('id', (inv as any).user_id);
      if (updUserErr) throw updUserErr;

      const txRows = Array.from({ length: creditsToApply }).map((_, index) => {
        const cycleNumber = paidCycles + index + 1;
        return {
          user_id: (inv as any).user_id,
          transaction_type: 'profit',
          status: 'success',
          amount: amountPerCycle,
          currency: 'USDT',
          description: `Weekly profit (${cycleNumber}/6) from ${(inv as any).plan_name || 'investment plan'}`,
          created_at: nowIso,
          metadata: {
            investment_id: (inv as any).id,
            cycle: cycleNumber,
            total_cycles: PROFIT_CYCLES,
            cadence: 'weekly',
          },
        };
      });

      const { error: txErr } = await supabaseAdmin.from('transactions').insert(txRows as any);
      if (txErr) throw txErr;

      const newPaidCycles = paidCycles + creditsToApply;
      const completed = newPaidCycles >= PROFIT_CYCLES;
      const nextProfitAt = completed ? null : addDaysISO(String((inv as any).next_profit_at), creditsToApply * DAYS_PER_CYCLE);

      const updatePayload: any = {
        last_profit_at: nowIso,
        next_profit_at: nextProfitAt,
      };
      if (completed) updatePayload.status = 'completed';

      const { error: updInvErr } = await supabaseAdmin
        .from('investments')
        .update(updatePayload)
        .eq('id', (inv as any).id);
      if (updInvErr) throw updInvErr;

      for (let i = 0; i < creditsToApply; i += 1) {
        await safeNotify(supabaseAdmin, String((inv as any).user_id), amountPerCycle, {
          investment_id: (inv as any).id,
          cadence: 'weekly',
          cycle: paidCycles + i + 1,
          total_cycles: PROFIT_CYCLES,
        });
        notificationsCreated += 1;
      }

      credited += creditsToApply;
    }

    return NextResponse.json({
      ok: true,
      cadence: 'weekly',
      cycle_days: DAYS_PER_CYCLE,
      max_cycles: PROFIT_CYCLES,
      credited,
      notifications_created: notificationsCreated,
    });
  } catch (e: any) {
    console.error('cron credit profits error:', e);
    return NextResponse.json({ ok: false, message: e?.message || 'Server error' }, { status: 500 });
  }
}
