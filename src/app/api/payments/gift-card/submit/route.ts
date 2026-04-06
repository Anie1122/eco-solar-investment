import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const giftCardPaymentSchema = z.object({
  gift_card_type: z.string().min(1, 'Gift card type is required'),
  gift_card_code: z.string().min(1, 'Gift card code is required'),
  amount: z.number().min(15000, 'Minimum amount is 15000'),
  note: z.string().optional(),
});

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const admin = supabaseAdmin();
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authErr || !user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const raw = {
      gift_card_type: String(formData.get('gift_card_type') || ''),
      gift_card_code: String(formData.get('gift_card_code') || ''),
      amount: Number(formData.get('amount') || 0),
      note: String(formData.get('note') || ''),
    };

    const parsed = giftCardPaymentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message || 'Invalid form data' },
        { status: 400 }
      );
    }

    const front = formData.get('front_image');
    const back = formData.get('back_image');

    if (!(front instanceof File) || !(back instanceof File)) {
      return NextResponse.json(
        { ok: false, message: 'Front and back card images are required.' },
        { status: 400 }
      );
    }

    if (!front.type.startsWith('image/') || !back.type.startsWith('image/')) {
      return NextResponse.json(
        { ok: false, message: 'Only image uploads are allowed.' },
        { status: 400 }
      );
    }

    const ts = Date.now();
    const extFront = (front.name.split('.').pop() || 'jpg').toLowerCase();
    const extBack = (back.name.split('.').pop() || 'jpg').toLowerCase();
    const frontPath = `gift-cards/${user.id}/${ts}-front.${extFront}`;
    const backPath = `gift-cards/${user.id}/${ts}-back.${extBack}`;

    const [frontBuffer, backBuffer] = await Promise.all([
      front.arrayBuffer(),
      back.arrayBuffer(),
    ]);

    const { error: frontErr } = await admin.storage
      .from('gift-cards')
      .upload(frontPath, frontBuffer, {
        contentType: front.type,
        upsert: false,
      });
    if (frontErr) throw frontErr;

    const { error: backErr } = await admin.storage
      .from('gift-cards')
      .upload(backPath, backBuffer, {
        contentType: back.type,
        upsert: false,
      });
    if (backErr) throw backErr;

    const { data: pubFront } = admin.storage.from('gift-cards').getPublicUrl(frontPath);
    const { data: pubBack } = admin.storage.from('gift-cards').getPublicUrl(backPath);

    const { data: userRow } = await admin
      .from('users')
      .select('full_name,email,currency')
      .eq('id', user.id)
      .maybeSingle();

    const insertPayload = {
      user_id: user.id,
      full_name: userRow?.full_name || user.user_metadata?.full_name || null,
      email: userRow?.email || user.email || null,
      gift_card_type: parsed.data.gift_card_type,
      gift_card_code: parsed.data.gift_card_code.trim(),
      amount: parsed.data.amount,
      currency: 'USD',
      note: parsed.data.note || null,
      front_image_url: pubFront.publicUrl,
      back_image_url: pubBack.publicUrl,
      status: 'pending',
      admin_note: null,
    };

    const { error: insertErr } = await admin.from('gift_card_payments').insert(insertPayload);
    if (insertErr) throw insertErr;

    return NextResponse.json({
      ok: true,
      message: 'Gift card payment request submitted for review.',
    });
  } catch (e: any) {
    console.error('gift-card submit error:', e?.message || e);
    return NextResponse.json(
      { ok: false, message: 'Failed to submit gift card payment request.' },
      { status: 500 }
    );
  }
}
