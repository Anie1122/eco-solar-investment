import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function signImageUrl(admin: ReturnType<typeof supabaseAdmin>, pathOrUrl: string | null) {
  const source = String(pathOrUrl || '').trim();
  if (!source) return null;
  if (source.startsWith('http://') || source.startsWith('https://')) return source;

  const { data, error } = await admin.storage
    .from('gift-cards')
    .createSignedUrl(source, 60 * 60);

  if (error) {
    console.error('Gift card signed URL generation failed:', error?.message || error);
    return null;
  }

  return data.signedUrl;
}

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
        .select('id,user_id,full_name,email,gift_card_type,gift_card_code,amount,currency,note,front_image_url,back_image_url,status,admin_note,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    if (txErr) throw txErr;
    if (giftErr) throw giftErr;

    const giftCards = await Promise.all((giftRows || []).map(async (row: any) => ({
      ...row,
      front_preview_url: await signImageUrl(admin, row.front_image_url),
      back_preview_url: await signImageUrl(admin, row.back_image_url),
    })));

    return NextResponse.json({ ok: true, rows: txRows || [], giftCards });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Failed to fetch deposits.' }, { status: 500 });
  }
}
