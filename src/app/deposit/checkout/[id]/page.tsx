'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function DepositCheckoutPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = String(params?.id || '');
  const mode = String(search.get('mode') || 'bank_transfer');

  const [amountText, setAmountText] = useState('');
  const [countdown, setCountdown] = useState(20 * 60);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token || !id) return;

      const { data: tx } = await supabase
        .from('transactions')
        .select('id,metadata')
        .eq('id', id)
        .maybeSingle();

      const amountInput = Number((tx as any)?.metadata?.amountInput ?? 0);
      const inputCurrency = String((tx as any)?.metadata?.inputCurrency ?? 'USDT');
      setAmountText(`${amountInput.toLocaleString()} ${inputCurrency}`);
    };
    run();
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const timeLabel = useMemo(() => {
    const m = String(Math.floor(countdown / 60)).padStart(2, '0');
    const s = String(countdown % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, [countdown]);

  const cancelTx = async () => {
    await supabase.from('transactions').update({ status: 'failed' }).eq('id', id);
    toast({ title: 'Cancelled', description: 'This transaction has been cancelled.' });
    router.push('/wallet');
  };

  const uploadReceipt = async () => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Receipt must be 5MB or below.' });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/deposits/upload-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ txId: id, receiptDataUrl: base64, receiptFileName: file.name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed');

      toast({ title: 'Request sent', description: 'Receipt sent to admin for review.' });
      router.push('/history');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e?.message || 'Could not upload receipt.' });
    } finally {
      setUploading(false);
    }
  };

  if (mode === 'crypto') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Crypto Transfer Checkout</CardTitle>
            <CardDescription>Coming soon. Your request is created and pending for admin review.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/history')}>Go to History</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>PALMPAY CHECKOUT</CardTitle>
          <CardDescription>Send the exact amount to avoid payment failure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={amountText} disabled readOnly />
          <div className="rounded-xl border p-3 text-sm space-y-1">
            <div><b>ACCOUNT NUMBER:</b> 8911-594-588</div>
            <div><b>BANK:</b> palmpay</div>
            <div><b>NAME:</b> Ndifreke Okon Edet (ECO-SOLAR)</div>
          </div>
          <p className="text-sm">Time left: <b>{timeLabel}</b></p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelTx} className="flex-1">Cancel Transaction</Button>
            <Button onClick={() => setShowUpload(true)} className="flex-1">I&apos;ve made my payment</Button>
          </div>

          {showUpload && (
            <div className="space-y-2">
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button onClick={uploadReceipt} disabled={!file || uploading} className="w-full">
                {uploading ? 'Sending request...' : 'Send Request'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
