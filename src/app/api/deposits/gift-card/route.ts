import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromBearer } from '@/lib/getUserFromBearer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { GIFT_CARD_MAX_AMOUNT, GIFT_CARD_MIN_AMOUNT, GIFT_CARD_TYPES } from '@/lib/gift-card';
import { assertTransactionStatus } from '@/lib/transaction-status';

const schema = z.object({
  giftCardType: z.enum(GIFT_CARD_TYPES),
  giftCardCode: z.string().trim().min(1, 'Gift card code is required.'),
  amount: z
    .coerce.number({ invalid_type_error: 'Amount must be numeric.' })
    .min(GIFT_CARD_MIN_AMOUNT, `Minimum amount is $${GIFT_CARD_MIN_AMOUNT.toLocaleString()}.`)
    .max(GIFT_CARD_MAX_AMOUNT, `Maximum amount is $${GIFT_CARD_MAX_AMOUNT.toLocaleString()}.`),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
});

function extensionFromMime(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const frontImage = formData.get('frontImage');
    const backImage = formData.get('backImage');

    if (!(frontImage instanceof File) || !(backImage instanceof File)) {
      return NextResponse.json({ ok: false, message: 'Front and back card images are required.' }, { status: 400 });
    }

    if (!frontImage.type.startsWith('image/') || !backImage.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, message: 'Only image uploads are allowed.' }, { status: 400 });
    }

    const parsed = schema.safeParse({
      giftCardType: formData.get('giftCardType'),
      giftCardCode: formData.get('giftCardCode'),
      amount: formData.get('amount'),
      note: formData.get('note') || '',
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || 'Invalid gift card request.' }, { status: 400 });
    }

    const payload = parsed.data;
    const admin = supabaseAdmin();

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('full_name,email')
      .eq('id', user.id)
      .maybeSingle();

    if (userErr) throw userErr;

    const displayName = String((userRow as any)?.full_name || user.user_metadata?.full_name || (userRow as any)?.email || user.email || '').trim();
    const timestamp = Date.now();
    const rootPath = `${user.id}`;
    const frontPath = `${rootPath}/${timestamp}-front.${extensionFromMime(frontImage.type)}`;
    const backPath = `${rootPath}/${timestamp}-back.${extensionFromMime(backImage.type)}`;

    const [frontBuffer, backBuffer] = await Promise.all([frontImage.arrayBuffer(), backImage.arrayBuffer()]);

    const { error: frontUploadErr } = await admin.storage
      .from('gift-cards')
      .upload(frontPath, Buffer.from(frontBuffer), {
        contentType: frontImage.type,
        upsert: false,
      });

    if (frontUploadErr) throw frontUploadErr;

    const { error: backUploadErr } = await admin.storage
      .from('gift-cards')
      .upload(backPath, Buffer.from(backBuffer), {
        contentType: backImage.type,
        upsert: false,
      });

    if (backUploadErr) throw backUploadErr;

    const now = new Date().toISOString();

    const { data, error } = await admin
      .from('gift_card_payments')
      .insert({
        user_id: user.id,
        full_name: String((userRow as any)?.full_name || user.user_metadata?.full_name || '').trim() || null,
        email: String((userRow as any)?.email || user.email || '').trim() || null,
        gift_card_type: payload.giftCardType,
        gift_card_code: payload.giftCardCode,
        amount: payload.amount,
        currency: 'USD',
        note: payload.note || null,
        front_image_url: frontPath,
        back_image_url: backPath,
        status: 'pending',
      })
      .select('id,status,created_at')
      .single();

    if (error) throw error;

    const txMetadata = {
      paymentMethod: 'gift_card_payment',
      amountInput: payload.amount,
      inputCurrency: 'USD',
      amountUsdt: payload.amount,
      userName: displayName || user.id,
      giftCardPaymentId: giftPayment.id,
      giftCardType: payload.giftCardType,
    };

    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'deposit',
        amount: payload.amount,
        currency: 'USD',
        status: assertTransactionStatus('pending'),
        description: 'Deposit (gift_card_payment)',
        created_at: now,
        metadata: txMetadata,
      } as any)
      .select('id')
      .single();

    if (txErr) throw txErr;

    const { error: linkErr } = await admin
      .from('gift_card_payments')
      .update({ transaction_id: tx.id })
      .eq('id', giftPayment.id);

    if (linkErr) throw linkErr;

    return NextResponse.json({ ok: true, paymentId: giftPayment.id, status: giftPayment.status, createdAt: giftPayment.created_at });
    if (error) throw error;

    return NextResponse.json({ ok: true, paymentId: data.id, status: data.status, createdAt: data.created_at });
  } catch (e: any) {
    console.error('Gift card payment create failed:', e?.message || e);
    return NextResponse.json({ ok: false, message: e?.message || 'Could not submit gift card payment.' }, { status: 500 });
  }
}
