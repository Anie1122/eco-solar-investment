'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type DepositRow = any;

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = async () => {
    const res = await fetch('/api/admin/deposits');
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.ok) {
      setRows(json.rows || []);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 1500);
    return () => clearInterval(timer);
  }, []);

  const review = async (txId: string, action: 'approve' | 'decline', type: 'deposit' | 'withdrawal') => {
    const key = `${type}-${txId}-${action}`;
    setBusyId(key);
    try {
      const res = await fetch('/api/admin/deposits/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, action, type, adminNote: adminNotes[txId] || '' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Review failed');
      const label = type === 'withdrawal' ? 'Withdrawal' : 'Deposit';
      toast({ title: 'Updated', description: `${label} ${action}d successfully.` });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e?.message || 'Could not review deposit.' });
    } finally {
      setBusyId(null);
    }
  };

  const formatMethod = (value: string) => {
    if (value === 'crypto_checkout' || value === 'crypto') return 'Crypto payment checkout';
    if (value === 'local_bank_transfer' || value === 'bank_transfer') return 'Local bank transfer (Nigerians only)';
    if (value === 'card_payment' || value === 'card') return 'Card payment';
    if (value === 'gift_card_payment') return 'Gift Card Payment';
    return value || '-';
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Transactions Dashboard</CardTitle>
          <CardDescription>
            All deposit and withdrawal requests are shown together below, with each request type clearly labeled.
          </CardDescription>
        </CardHeader>
      </Card>

      {rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-4 space-y-2">
            <p><b>Type:</b> {String(r.transaction_type || '').toUpperCase()}</p>
            <p><b>User:</b> {r.metadata?.userName || r.user_id}</p>
            <p><b>Amount:</b> {r.metadata?.amountInput || r.amount} {r.metadata?.inputCurrency || r.currency || 'USDT'} ({r.amount} USDT base)</p>
            <p><b>Method:</b> {r.transaction_type === 'withdrawal' ? 'Wallet withdrawal' : formatMethod(String(r.metadata?.paymentMethod || ''))}</p>
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

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Admin note (internal)</p>
              <Input
                value={adminNotes[r.id] ?? r.metadata?.adminNote ?? ''}
                onChange={(e) => setAdminNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                placeholder="Optional internal note"
              />
            </div>

            {r.status === 'pending' ? (
              <div className="flex gap-2">
                <Button onClick={() => review(r.id, 'approve', r.transaction_type === 'withdrawal' ? 'withdrawal' : 'deposit')} disabled={busyId === `${r.transaction_type === 'withdrawal' ? 'withdrawal' : 'deposit'}-${r.id}-approve`}>Accept</Button>
                <Button variant="destructive" onClick={() => review(r.id, 'decline', r.transaction_type === 'withdrawal' ? 'withdrawal' : 'deposit')} disabled={busyId === `${r.transaction_type === 'withdrawal' ? 'withdrawal' : 'deposit'}-${r.id}-decline`}>Decline</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
