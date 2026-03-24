'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyConverter } from '@/lib/currency';
import { supabase } from '@/lib/supabaseClient';
import { CreditCard, Landmark, Wallet } from 'lucide-react';

type Method = 'card' | 'bank_transfer' | 'crypto';

async function createDeposit(payload: any) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Login required');

  const res = await fetch('/api/deposits/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.message || 'Could not start deposit.');
  return json.txId as string;
}

export default function DepositStartPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [method, setMethod] = useState<Method>('crypto');
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState('');
  const [cardType, setCardType] = useState('Visa / MasterCard');
  const [cardOwnerName, setCardOwnerName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');

  const [country, setCountry] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USDT');

  const { convert } = useCurrencyConverter(currencyCode);
  const minDepositUser = convert(1.25); // 2000 NGN equivalent
  const maxDepositUser = convert(725);

  const isNigerian = useMemo(() => country.trim().toLowerCase() === 'nigeria', [country]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return;
      const { data: row } = await supabase.from('users').select('country,currency,full_name,email').eq('id', uid).maybeSingle();
      setCountry(String((row as any)?.country || ''));
      setCurrencyCode(String((row as any)?.currency || 'USDT'));
    })();
  }, []);

  const submit = async () => {
    const amountNum = Number(amount || 0);
    if (!Number.isFinite(amountNum) || amountNum < minDepositUser || amountNum > maxDepositUser) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: `Use an amount between ${minDepositUser.toFixed(2)} and ${maxDepositUser.toFixed(2)} ${currencyCode}.` });
      return;
    }

    if (!isNigerian && method === 'bank_transfer') {
      toast({ variant: 'destructive', title: 'Not available', description: 'Bank transfer is for Nigerian accounts only.' });
      return;
    }

    setBusy(true);
    try {
      if (method === 'card') {
        const required = [cardOwnerName, cardNumber, expiryDate, cvv, cardPin, streetAddress, city, postcode];
        if (required.some((x) => !String(x).trim())) throw new Error('Complete all required card details.');
      }

      const oneUsdtInUser = convert(1);
      const amountUsdt = amountNum / (oneUsdtInUser > 0 ? oneUsdtInUser : 1);

      const txId = await createDeposit({
        amountInput: amountNum,
        amountUsdt,
        inputCurrency: currencyCode,
        paymentMethod: method,
        cardDetails: method === 'card' ? { cardType, cardOwnerName, cardNumber, expiryDate, cvv, cardPin, streetAddress, city, postcode } : null,
      });

      if (method === 'bank_transfer') {
        await new Promise((r) => setTimeout(r, 2000));
        router.push(`/deposit/checkout/${txId}`);
        return;
      }

      router.push(`/deposit/checkout/${txId}?mode=${method}`);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Deposit failed', description: e?.message || 'Could not continue.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4">
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[220px_1fr]">
          <div className="border-r bg-muted/30 p-4 space-y-2">
            <h2 className="text-3xl font-semibold mb-3">Pay With</h2>
            <button className={`w-full flex items-center gap-2 rounded-lg p-2 text-left ${method === 'card' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setMethod('card')}>
              <CreditCard className="h-4 w-4" /> Card
            </button>
            {isNigerian ? (
              <button className={`w-full flex items-center gap-2 rounded-lg p-2 text-left ${method === 'bank_transfer' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setMethod('bank_transfer')}>
                <Landmark className="h-4 w-4" /> Transfer
              </button>
            ) : null}
            <button className={`w-full flex items-center gap-2 rounded-lg p-2 text-left ${method === 'crypto' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setMethod('crypto')}>
              <Wallet className="h-4 w-4" /> Crypto
            </button>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{method === 'card' ? 'Enter card details' : method === 'bank_transfer' ? 'Bank transfer checkout' : 'Crypto transfer checkout'}</h3>
              <div className="font-semibold">{currencyCode} {Number(amount || 0).toLocaleString()}</div>
            </div>

            <Input placeholder={`Amount (${currencyCode})`} value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
            <p className="text-xs text-muted-foreground">Minimum deposit is 2000 NGN equivalent ({minDepositUser.toFixed(2)} {currencyCode}).</p>

            {method === 'card' && (
              <div className="space-y-3">
                <Input value={cardType} onChange={(e) => setCardType(e.target.value)} placeholder="Card type" />
                <Input value={cardOwnerName} onChange={(e) => setCardOwnerName(e.target.value)} placeholder="Card owner name" />
                <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="Card number" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} placeholder="MM/YY" />
                  <Input value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="CVV" />
                  <Input value={cardPin} onChange={(e) => setCardPin(e.target.value)} placeholder="PIN" />
                </div>
                <Input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="Street address" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                  <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" />
                </div>
              </div>
            )}

            <Button onClick={submit} disabled={busy} className="w-full h-11 text-base">
              {busy ? 'Processing...' : `Pay ${currencyCode} ${Number(amount || 0).toLocaleString()}`}
            </Button>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
