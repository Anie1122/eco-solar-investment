// src/app/api/cron/credit-profits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error('Missing Supabase admin environment variables.');
  }

  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

async function safeNotify(userId: string, amountNgN: number, meta: any) {
  const supabaseAdmin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const first = await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title: 'Profit Credited',
    message: `Your daily profit has been credited to your wallet.`,
    type: 'profit',
    is_read: false,
    created_at: nowIso,
    amount: amountNgN,
    currency: 'USDT',
    metadata: meta,
  } as any);

  if (!first.error) return;

  // fallback minimal insert
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title: 'Profit Credited',
    message: `Your daily profit has been credited to your wallet.`,
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

    // ✅ Hard stop profits for matured plans before crediting routine runs.
    // Any investment that has reached/passed its end date is marked completed
    // and next profit timestamp is cleared.
    const { error: closeErr } = await supabaseAdmin
      .from('investments')
      .update({
        status: 'completed',
        next_profit_at: null,
      })
      .eq('status', 'active')
      .lte('ends_at', nowIso);

    if (closeErr) throw closeErr;

    // ✅ Call your RPC
    const { data, error } = await supabaseAdmin.rpc('credit_due_profits', {
      p_now: nowIso,
    });

    if (error) throw error;

    // Supports two possible return shapes:
    // A) [{ credited: number }]
    // B) [{ credited: number, credited_rows: [{ user_id, amount, investment_id? }, ...] }]
    const firstRow: any = Array.isArray(data) && data.length ? data[0] : null;

    const credited =
      firstRow && typeof firstRow.credited !== 'undefined'
        ? Number(firstRow.credited)
        : 0;

    const creditedRows: any[] = Array.isArray(firstRow?.credited_rows)
      ? firstRow.credited_rows
      : [];

    // ✅ Create notifications if your RPC returns the credited rows
    if (creditedRows.length) {
      // Group by user (optional)
      for (const r of creditedRows) {
        const userId = String(r.user_id || '');
        const amount = Number(r.amount ?? 0);
        if (!userId) continue;
        await safeNotify(userId, Number.isFinite(amount) ? amount : 0, r);
      }
    }

    return NextResponse.json({
      ok: true,
      credited,
      notifications_created: creditedRows.length,
    });
  } catch (e: any) {
    console.error('cron credit profits error:', e);
    return NextResponse.json(
      { ok: false, message: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
