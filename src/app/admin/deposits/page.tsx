'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const res = await fetch('/api/admin/deposits');
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.ok) setRows(json.rows || []);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const review = async (txId: string, action: 'approve' | 'decline') => {
    setBusyId(txId + action);
    try {
      const res = await fetch('/api/admin/deposits/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Review failed');
      toast({ title: 'Updated', description: `Deposit ${action}d successfully.` });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e?.message || 'Could not review deposit.' });
    } finally {
      setBusyId(null);
    }
  };

  const formatMethod = (value: string) => {
    if (value === 'crypto_checkout' || value === 'crypto') return 'Crypto payment checkout';
    if (value === 'local_bank_transfer' || value === 'bank_transfer') return "Local bank transfer (Nigerians only)";
    if (value === 'card_payment' || value === 'card') return 'Card payment';
    return value || '-';
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Deposit Admin Dashboard</CardTitle>
          <CardDescription>Review uploaded receipts and card payment submissions.</CardDescription>
        </CardHeader>
      </Card>

      {rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-4 space-y-2">
            <p><b>User:</b> {r.metadata?.userName || r.user_id}</p>
            <p><b>Amount:</b> {r.metadata?.amountInput} {r.metadata?.inputCurrency} ({r.amount} USDT base)</p>
            <p><b>Method:</b> {formatMethod(String(r.metadata?.paymentMethod || ''))}</p>
            <p><b>Status:</b> {r.status}</p>
            {r.metadata?.cancellationReason === 'unsupported_card_type_verve' ? (
              <p className="text-sm text-red-500">
                This card transaction was auto-cancelled: Verve is currently unsupported.
              </p>
            ) : null}
            {r.metadata?.receiptDataUrl ? (
              <a href={r.metadata.receiptDataUrl} target="_blank" rel="noreferrer">
                <img src={r.metadata.receiptDataUrl} alt="receipt" className="max-h-48 rounded border cursor-zoom-in" />
              </a>
            ) : null}
            {r.metadata?.cardDetails ? (
              <pre className="rounded border p-2 text-xs overflow-auto">{JSON.stringify(r.metadata.cardDetails, null, 2)}</pre>
            ) : null}

            {r.status === 'pending' ? (
              <div className="flex gap-2">
                <Button onClick={() => review(r.id, 'approve')} disabled={busyId === r.id + 'approve'}>Accept</Button>
                <Button variant="destructive" onClick={() => review(r.id, 'decline')} disabled={busyId === r.id + 'decline'}>Decline</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
