import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const [{ data: txRows, error: txErr }, { data: giftRows, error: giftErr }] = await Promise.all([
      admin
        .from('transactions')
        .select('id,user_id,transaction_type,amount,currency,status,created_at,metadata')
        .in('transaction_type', ['deposit', 'withdrawal'])
        .order('created_at', { ascending: false })
        .limit(200),
      admin
        .from('gift_card_payments')
        .select('id,user_id,full_name,email,gift_card_type,gift_card_code,amount,currency,note,status,admin_note,created_at,front_image_url,back_image_url')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    if (txErr) throw txErr;

    const visibleTransactions = (txRows || []).filter((row: any) => {
      if (row.transaction_type === 'withdrawal') return true;
      return Boolean(row?.metadata?.submittedForReviewAt);
    });

    const mappedGiftRows = (giftRows || []).map((row: any) => ({
      ...row,
      transaction_type: 'gift_card',
      metadata: {
        paymentMethod: 'gift_card_payment',
        userName: row.full_name || row.email || row.user_id,
        amountInput: row.amount,
        inputCurrency: row.currency || 'USD',
        adminNote: row.admin_note || null,
        giftCardType: row.gift_card_type,
        giftCardCode: row.gift_card_code,
        note: row.note || null,
        frontImageUrl: row.front_image_url || null,
        backImageUrl: row.back_image_url || null,
      },
    }));

    const rows = [...visibleTransactions, ...mappedGiftRows].sort((a: any, b: any) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    });

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Failed to fetch deposits.' }, { status: 500 });
  }
}
