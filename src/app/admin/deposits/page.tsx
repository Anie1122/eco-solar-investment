'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type DepositRow = any;
type GiftCardRow = any;

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [giftRows, setGiftRows] = useState<GiftCardRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = async () => {
    const res = await fetch('/api/admin/deposits');
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.ok) {
      setRows(json.rows || []);
      setGiftRows(json.giftCards || []);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const review = async (
    txId: string,
    action: 'approve' | 'decline',
    type: 'deposit' | 'withdrawal' | 'gift_card'
  ) => {
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
      const label =
        type === 'gift_card' ? 'Gift card payment' : type === 'withdrawal' ? 'Withdrawal' : 'Deposit';
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
          <CardDescription>Review deposit, withdrawal, and gift card payment requests.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gift Card Payments</CardTitle>
          <CardDescription>All gift card requests are manually reviewed here.</CardDescription>
        </CardHeader>
      </Card>

      {giftRows.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-4 space-y-2">
            <p><b>User:</b> {r.full_name || r.email || r.user_id}</p>
            <p><b>Email:</b> {r.email || '-'}</p>
            <p><b>Gift Card Type:</b> {r.gift_card_type}</p>
            <p><b>Gift Card Code:</b> {r.gift_card_code}</p>
            <p><b>Amount:</b> {Number(r.amount || 0).toLocaleString()} {r.currency || 'USD'}</p>
            <p><b>Note:</b> {r.note || '-'}</p>
            <p><b>Status:</b> {r.status}</p>
            <p><b>Date Submitted:</b> {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</p>

            <div className="grid gap-3 md:grid-cols-2">
              {r.front_preview_url ? (
                <a href={r.front_preview_url} target="_blank" rel="noreferrer" className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Front image</p>
                  <img src={r.front_preview_url} alt="gift card front" className="max-h-48 w-full rounded border object-cover cursor-zoom-in" />
                </a>
              ) : null}
              {r.back_preview_url ? (
                <a href={r.back_preview_url} target="_blank" rel="noreferrer" className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Back image</p>
                  <img src={r.back_preview_url} alt="gift card back" className="max-h-48 w-full rounded border object-cover cursor-zoom-in" />
                </a>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Admin note (internal)</p>
              <Input
                value={adminNotes[r.id] ?? r.admin_note ?? ''}
                onChange={(e) => setAdminNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                placeholder="Optional internal note"
              />
            </div>

            {r.status === 'pending' ? (
              <div className="flex gap-2">
                <Button onClick={() => review(r.id, 'approve', 'gift_card')} disabled={busyId === `gift_card-${r.id}-approve`}>Approve</Button>
                <Button variant="destructive" onClick={() => review(r.id, 'decline', 'gift_card')} disabled={busyId === `gift_card-${r.id}-decline`}>Decline</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deposits & Withdrawals</CardTitle>
          <CardDescription>Review and approve or decline pending transactions.</CardDescription>
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
