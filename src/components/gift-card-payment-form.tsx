'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT,
  GIFT_CARD_TYPES,
} from '@/lib/gift-cards';

export default function GiftCardPaymentForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { toast } = useToast();

  const [giftCardType, setGiftCardType] = useState<string>(GIFT_CARD_TYPES[0]);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const frontPreview = useMemo(() => (frontImage ? URL.createObjectURL(frontImage) : ''), [frontImage]);
  const backPreview = useMemo(() => (backImage ? URL.createObjectURL(backImage) : ''), [backImage]);

  const validate = () => {
    const amountNum = Number(amount);
    if (!GIFT_CARD_TYPES.includes(giftCardType as any)) {
      return 'Please select a valid gift card type.';
    }
    if (!giftCardCode.trim()) return 'Gift card code is required.';
    if (!Number.isFinite(amountNum)) return 'Amount must be numeric.';
    if (amountNum < GIFT_CARD_MIN_AMOUNT || amountNum > GIFT_CARD_MAX_AMOUNT) {
      return `Amount must be between $${GIFT_CARD_MIN_AMOUNT.toLocaleString()} and $${GIFT_CARD_MAX_AMOUNT.toLocaleString()}.`;
    }
    if (!frontImage) return 'Front card image is required.';
    if (!backImage) return 'Back card image is required.';
    if (!frontImage.type.startsWith('image/')) return 'Front image must be an image file.';
    if (!backImage.type.startsWith('image/')) return 'Back image must be an image file.';
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      toast({ variant: 'destructive', title: 'Validation Error', description: validationError });
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Session expired. Please login again.');

      const formData = new FormData();
      formData.append('gift_card_type', giftCardType);
      formData.append('gift_card_code', giftCardCode.trim());
      formData.append('amount', String(Number(amount)));
      formData.append('note', note.trim());
      formData.append('front_image', frontImage!);
      formData.append('back_image', backImage!);

      const res = await fetch('/api/payments/gift-card/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || 'Failed to submit gift card payment.');
      }

      toast({ title: 'Submitted', description: 'Gift card payment request submitted for admin review.' });
      setGiftCardCode('');
      setAmount('');
      setNote('');
      setFrontImage(null);
      setBackImage(null);
      onSuccess?.();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: e?.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Gift card payments are reviewed manually by admin. Please upload clear card images and provide accurate details. Minimum: ${GIFT_CARD_MIN_AMOUNT.toLocaleString()}. Maximum: ${GIFT_CARD_MAX_AMOUNT.toLocaleString()}.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Gift Card Type</Label>
        <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={giftCardType} onChange={(e) => setGiftCardType(e.target.value)} disabled={submitting}>
          {GIFT_CARD_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Gift Card Code</Label>
        <Input value={giftCardCode} onChange={(e) => setGiftCardCode(e.target.value)} placeholder="Enter gift card code" disabled={submitting} />
      </div>

      <div className="space-y-2">
        <Label>Amount Sent (USD)</Label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="15000" disabled={submitting} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Card Image Front</Label>
          <Input type="file" accept="image/*" onChange={(e) => setFrontImage(e.target.files?.[0] || null)} disabled={submitting} />
          {frontPreview ? <Image src={frontPreview} alt="Front preview" width={240} height={140} className="rounded-md border object-cover" /> : null}
        </div>
        <div className="space-y-2">
          <Label>Card Image Back</Label>
          <Input type="file" accept="image/*" onChange={(e) => setBackImage(e.target.files?.[0] || null)} disabled={submitting} />
          {backPreview ? <Image src={backPreview} alt="Back preview" width={240} height={140} className="rounded-md border object-cover" /> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Optional Note / Extra Information</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any extra details" disabled={submitting} />
      </div>

      <Button type="button" className="w-full" onClick={submit} disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {submitting ? 'Submitting...' : 'Submit Gift Card Payment'}
      </Button>
    </div>
  );
}
