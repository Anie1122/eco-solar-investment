'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyConverter } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { exportElementAsPdf, exportElementAsPng } from '@/lib/receipt-export';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader, Signal, ArrowLeft, CheckCircle2, Download, Share2 } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { motion, AnimatePresence } from 'framer-motion';

/** ✅ EXACT list */
const NETWORKS = [
  'China Mobile',
  'Vodafone',
  'Airtel',
  'MTN',
  'Orange S A',
  'AT-T',
  'Verizon',
  'T-Mobile',
  'América Móvil',
  'Etisalat',
  'Glo',
  'Safaricom',
  '9mobile',
  'Telkom SA',
  'Zain',
  'Vodacom',
  'Ooredoo',
  'Turkcell',
  'Telefónica',
  'STC',
];

function slugifyNetwork(name: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

function NetworkLogo({ name, size = 56, circle = false }: { name: string; size?: number; circle?: boolean }) {
  const slug = slugifyNetwork(name);
  const [broken, setBroken] = useState(false);

  return (
    <div
      className={cn(
        'border bg-white/90 flex items-center justify-center overflow-hidden shadow-sm shrink-0',
        circle ? 'rounded-full' : 'rounded-2xl'
      )}
      style={{ width: size, height: size }}
    >
      {!broken ? (
        <Image
          src={`/networks/${slug}.png`}
          alt={name}
          width={size}
          height={size}
          className={cn('h-full w-full object-contain', circle ? 'p-2' : 'p-2')}
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-muted/40">
          <Signal className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

/** ✅ PIN keypad */
function PinKeypad({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 4);
  const arr = digits.split('');

  const add = (n: string) => {
    if (disabled) return;
    if (digits.length >= 4) return;
    onChange((digits + n).slice(0, 4));
  };
  const backspace = () => {
    if (disabled) return;
    if (!digits.length) return;
    onChange(digits.slice(0, -1));
  };
  const clear = () => {
    if (disabled) return;
    onChange('');
  };

  const canSubmit = digits.length === 4 && !disabled;
  const activeIndex = Math.min(digits.length, 3);
  const keyAnim = { rest: { scale: 1 }, tap: { scale: 0.96 } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        {[0, 1, 2, 3].map((i) => {
          const filled = Boolean(arr[i]);
          const isActive = i === activeIndex && digits.length < 4;
          return (
            <motion.div
              key={i}
              layout
              animate={isActive ? { scale: 1.03 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={cn(
                'h-12 w-12 rounded-2xl border bg-muted/30 shadow-sm flex items-center justify-center',
                filled ? 'border-primary/50' : 'border-muted',
                isActive ? 'ring-2 ring-primary/30' : ''
              )}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {filled ? (
                  <motion.div
                    key="dot"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="h-3 w-3 rounded-full bg-foreground/80"
                  />
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0.6 }} animate={{ opacity: 0.6 }} className="h-3 w-3" />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <motion.button
            key={n}
            type="button"
            variants={keyAnim}
            initial="rest"
            whileTap="tap"
            onClick={() => add(n)}
            disabled={disabled}
            className={cn('h-12 rounded-2xl border bg-background shadow-sm transition text-lg font-semibold', disabled ? 'opacity-60' : '')}
          >
            {n}
          </motion.button>
        ))}

        <motion.button
          type="button"
          variants={keyAnim}
          initial="rest"
          whileTap="tap"
          onClick={clear}
          disabled={disabled}
          className={cn('h-12 rounded-2xl border bg-background shadow-sm transition text-sm font-medium', disabled ? 'opacity-60' : '')}
        >
          Clear
        </motion.button>

        <motion.button
          type="button"
          variants={keyAnim}
          initial="rest"
          whileTap="tap"
          onClick={() => add('0')}
          disabled={disabled}
          className={cn('h-12 rounded-2xl border bg-background shadow-sm transition text-lg font-semibold', disabled ? 'opacity-60' : '')}
        >
          0
        </motion.button>

        <motion.button
          type="button"
          variants={keyAnim}
          initial="rest"
          whileTap="tap"
          onClick={backspace}
          disabled={disabled}
          className={cn('h-12 rounded-2xl border bg-background shadow-sm transition text-sm font-medium', disabled ? 'opacity-60' : '')}
        >
          ⌫
        </motion.button>
      </div>

      <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }}>
        <Button type="button" className="w-full rounded-2xl h-12" disabled={!canSubmit} onClick={onSubmit}>
          Confirm & Pay
        </Button>
      </motion.div>
    </div>
  );
}

const formSchema = z.object({
  network: z.string().min(2, 'Select a network'),
  phone: z.string().min(8, 'Enter a valid phone number'),
  // ✅ USER ENTERS AMOUNT IN THEIR CURRENCY (GBP/USD/etc)
  amount: z.coerce.number().positive('Enter a valid amount'),
});
type FormValues = z.infer<typeof formSchema>;

type ReceiptData = {
  id: string;
  created_at: string;
  transaction_type?: string;
  status?: string;
  amount: number; // (stored in USDT base in DB)
  currency: string; // (USDT in DB)
  metadata: any;
};

export default function AirtimePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [userCurrency, setUserCurrency] = useState('USDT');

  // ✅ We show wallet in user currency, while wallet_balance is stored in USDT base.
  const currencyApi: any = useCurrencyConverter(userCurrency);
  const format: (n: number) => string = currencyApi.format;
  const convert: (usdt: number) => number = currencyApi.convert;
  const toBase: (userAmt: number) => number = currencyApi.toBase;

  // ✅ wallet stored in USDT base
  const [walletBalanceUSDT, setWalletBalanceUSDT] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [txId, setTxId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const receiptCardRef = useRef<HTMLDivElement | null>(null);

  const detailsRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { network: '', phone: '', amount: '' as any },
    mode: 'onChange',
  });

  useEffect(() => {
    const run = async () => {
      setLoadingWallet(true);
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (!uid) {
          toast({ variant: 'destructive', title: 'Login required', description: 'Please login again.' });
          router.push('/login');
          return;
        }

        const { data: urow, error } = await supabase.from('users').select('wallet_balance,currency').eq('id', uid).maybeSingle();
        if (error) throw error;

        setWalletBalanceUSDT(Number((urow as any)?.wallet_balance ?? 0));
        setUserCurrency(String((urow as any)?.currency || 'USDT'));
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Could not load wallet.' });
      } finally {
        setLoadingWallet(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedNetwork = form.watch('network');
  const phoneVal = form.watch('phone') || '';

  // ✅ user-entered amount (in user currency)
  const amountVal = Number(form.watch('amount') || 0);

  // ✅ convert user-entered amount back to USDT base (for checks + API)
  const amountUSDT = useMemo(() => {
    const usdt = toBase(amountVal || 0);
    return Number(usdt) || 0;
  }, [amountVal, toBase]);

  const canOpenPin = useMemo(() => {
    if (!form.formState.isValid) return false;
    if (!Number.isFinite(amountVal) || amountVal <= 0) return false;

    if (amountUSDT > walletBalanceUSDT) return false;

    return true;
  }, [form.formState.isValid, amountVal, amountUSDT, walletBalanceUSDT]);

  const scrollToDetails = () => {
    requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const selectNetwork = (n: string) => {
    form.setValue('network', n, { shouldValidate: true });
    scrollToDetails();
  };

  const openPinDialog = async () => {
    if (!canOpenPin) {
      if (amountUSDT > walletBalanceUSDT) {
        toast({
          variant: 'destructive',
          title: 'Insufficient balance',
          description: 'You do not have enough wallet balance for this purchase.',
        });
      }
      return;
    }
    setPin('');
    setPinDialogOpen(true);
  };

  const fetchReceiptRow = async (id: string) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('id,created_at,transaction_type,status,amount,currency,metadata')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Receipt not found');

    setReceipt({
      id: data.id,
      created_at: data.created_at,
      transaction_type: (data as any).transaction_type,
      status: (data as any).status,
      amount: Number((data as any).amount ?? 0),
      currency: String((data as any).currency ?? 'USDT'),
      metadata: (data as any).metadata ?? {},
    });
  };

  const handlePay = async () => {
    const values = form.getValues();
    const cleanPin = (pin || '').replace(/\D/g, '').slice(0, 4);
    if (cleanPin.length !== 4) return;

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Session expired. Please login again.');

      const res = await fetch('/api/airtime/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          network: values.network,
          phone: values.phone,
          amount: amountUSDT,
          currency: 'USDT',
          pin: cleanPin,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Purchase failed');

      const newTxId = String(json.txId);
      setTxId(newTxId);

      // refresh wallet (USDT base in DB)
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        const { data: urow } = await supabase.from('users').select('wallet_balance').eq('id', uid).maybeSingle();
        setWalletBalanceUSDT(Number((urow as any)?.wallet_balance ?? 0));
      }

      // ✅ store metadata for receipt display
      await supabase
        .from('transactions')
        .update({
          metadata: {
            ...(json?.metadata || {}),
            network: values.network,
            phone: values.phone,
            product: 'airtime',
            payment_method: 'wallet',
            // helpful: what user typed + their currency
            user_amount: amountVal,
            user_currency: userCurrency,
          },
        })
        .eq('id', newTxId);

      await fetchReceiptRow(newTxId);

      setPinDialogOpen(false);
      toast({ title: 'Successful', description: 'Airtime purchase completed.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e?.message || 'Could not complete purchase.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateNice = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const doDownloadPNG = async () => {
    if (!receiptCardRef.current || !receipt) return;
    await exportElementAsPng(receiptCardRef.current, `airtime-receipt-${receipt.id}.png`);
  };
  
  const doDownloadPDF = async () => {
    if (!receiptCardRef.current || !receipt) return;
    await exportElementAsPdf(receiptCardRef.current, `airtime-receipt-${receipt.id}.pdf`);
  };

  // ✅ RECEIPT PAGE (OPay style)
  if (receipt && txId) {
    const network = receipt.metadata?.network || selectedNetwork;
    const phone = receipt.metadata?.phone || phoneVal;

    // ✅ convert receipt amount (USDT base) to user currency for display
    const receiptAmountUser = convert(Number(receipt.amount || 0));

    return (
      <div className="mx-auto w-full max-w-md px-4 py-8">
        {/* Print-only CSS: only print receipt */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #receipt-print, #receipt-print * { visibility: visible; }
            #receipt-print { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>

        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" className="rounded-2xl" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>

          <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/transactions/${txId}`)}>
            View Receipt
          </Button>
        </div>

        {/* ✅ OPay-style receipt */}
        <div id="receipt-print" className="space-y-4">
          <Card className="overflow-hidden border-muted/60 shadow-xl rounded-3xl bg-[#141414] text-white">
            <CardContent className="p-5" ref={receiptCardRef}>
              <div className="flex items-center justify-center">
                <NetworkLogo name={network} size={62} circle />
              </div>

              <div className="mt-4 text-center">
                <div className="text-lg font-semibold">{network}</div>

                {/* ✅ show in user currency like wallet page */}
                <div className="mt-3 text-4xl font-extrabold tracking-tight">{format(receiptAmountUser)}</div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Successful</span>
                </div>

                {/* optional: show base USDT line */}
                <div className="mt-2 text-xs text-white/50">
                  Base USDT: {Number(receipt.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-5 rounded-2xl bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Amount</span>
                  <span className="text-white font-semibold">{format(receiptAmountUser)}</span>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 rounded-2xl bg-white/5 p-4">
                <div className="text-sm font-semibold mb-3">Transaction Details</div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-white/70">
                    <span>Recipient Mobile</span>
                    <span className="text-white font-semibold">{phone}</span>
                  </div>

                  <div className="flex items-center justify-between text-white/70">
                    <span>Transaction Type</span>
                    <span className="text-white font-semibold">Airtime</span>
                  </div>

                  <div className="flex items-center justify-between text-white/70">
                    <span>Payment Method</span>
                    <span className="text-white font-semibold">Wallet</span>
                  </div>

                  <div className="flex items-center justify-between text-white/70">
                    <span>Transaction No.</span>
                    <span className="text-white font-mono text-xs break-all">{receipt.id}</span>
                  </div>

                  <div className="flex items-center justify-between text-white/70">
                    <span>Transaction Date</span>
                    <span className="text-white font-semibold">{formatDateNice(receipt.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button className="rounded-2xl h-12" onClick={doDownloadPNG}>
              <Download className="mr-2 h-4 w-4" />
              Save PNG
            </Button>
            <Button variant="outline" className="rounded-2xl h-12" onClick={doDownloadPDF}>
              <Share2 className="mr-2 h-4 w-4" />
              Save PDF
            </Button>
          </div>

          <Alert className="rounded-2xl">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Receipt is saved in your <b>Transaction History</b>. Tap the transaction to view it again.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            <Button variant="outline" className="rounded-2xl h-12" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
            <Button
              className="rounded-2xl h-12"
              onClick={() => {
                // buy again
                setTxId(null);
                setReceipt(null);
                form.reset({ network: '', phone: '', amount: '' as any });
              }}
            >
              Buy Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Purchase form
  return (
    <div className="mx-auto max-w-lg p-4">
      <Card className="border-muted/60 shadow-lg overflow-hidden rounded-3xl">
        <div className="h-2 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/60" />
        <CardHeader>
          <CardTitle className="text-2xl">Buy Airtime</CardTitle>
          <CardDescription>Select a network, then enter phone & amount.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-2xl bg-primary/5 p-4 border border-primary/10">
            <div className="text-sm text-muted-foreground">Wallet Balance</div>

            {/* ✅ show converted wallet balance EXACTLY like wallet page */}
            <div className="text-3xl font-extrabold text-primary">
              {loadingWallet ? 'Loading...' : format(convert(walletBalanceUSDT))}
            </div>
          </div>

          {/* Network buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Network</label>

            <div className="grid grid-cols-2 gap-3">
              {NETWORKS.map((n) => {
                const selected = selectedNetwork === n;
                return (
                  <motion.button
                    key={n}
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => selectNetwork(n)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition',
                      'min-h-[96px]',
                      'flex items-center gap-4',
                      'bg-background hover:bg-muted/40',
                      selected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-muted'
                    )}
                  >
                    <NetworkLogo name={n} size={56} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{n}</div>
                      <div className="text-xs text-muted-foreground">{selected ? 'Selected' : 'Tap to select'}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {form.formState.errors.network?.message ? <p className="text-xs text-destructive">{form.formState.errors.network.message}</p> : null}
          </div>

          {/* Details (scroll target) */}
          <div ref={detailsRef} className="space-y-4 pt-2">
            {/* ✅ Selected network shown automatically (not editable) */}
            {selectedNetwork ? (
              <div className="rounded-2xl border bg-muted/20 p-4 flex items-center gap-3">
                <NetworkLogo name={selectedNetwork} size={48} />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Selected Network</div>
                  <div className="font-semibold truncate">{selectedNetwork}</div>
                </div>
              </div>
            ) : (
              <Alert className="rounded-2xl">
                <Info className="h-4 w-4" />
                <AlertDescription>Please select a network to continue.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone number</label>
              <Input
                placeholder="e.g. 08012345678"
                inputMode="tel"
                value={phoneVal}
                onChange={(e) => form.setValue('phone', e.target.value, { shouldValidate: true })}
                className="rounded-2xl h-12"
              />
              {form.formState.errors.phone?.message ? <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p> : null}
            </div>

            <div className="space-y-2">
              {/* ✅ user enters amount in their currency */}
              <label className="text-sm font-medium">Amount ({userCurrency})</label>
              <Input
                type="number"
                placeholder="e.g. 5"
                value={String(form.watch('amount') ?? '')}
                onChange={(e) => form.setValue('amount', e.target.value as any, { shouldValidate: true })}
                className="rounded-2xl h-12"
              />

              {/* optional: show base USDT preview */}
              {amountVal > 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  Base USDT: {Number(amountUSDT || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              ) : null}

              {form.formState.errors.amount?.message ? <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p> : null}
            </div>

            <Alert className="rounded-2xl">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You will be asked for your <b>withdrawal PIN</b> to confirm payment.
              </AlertDescription>
            </Alert>

            {amountUSDT > walletBalanceUSDT ? (
              <Alert className="rounded-2xl">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-destructive">Insufficient balance for this purchase.</AlertDescription>
              </Alert>
            ) : null}

            <motion.div whileTap={{ scale: 0.99 }}>
              <Button className="w-full rounded-2xl h-12 text-base" onClick={openPinDialog} disabled={!canOpenPin || loadingWallet}>
                Continue
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={(o) => !submitting && setPinDialogOpen(o)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Enter Withdrawal PIN</DialogTitle>
            <DialogDescription>
              Confirm airtime purchase of <span className="font-semibold">{format(amountVal || 0)}</span>.
            </DialogDescription>
          </DialogHeader>

          <PinKeypad value={pin} disabled={submitting} onChange={(next) => setPin(next)} onSubmit={handlePay} />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="w-full rounded-2xl" disabled={submitting} onClick={() => setPinDialogOpen(false)}>
              Cancel
            </Button>

            <Button className="w-full rounded-2xl" disabled>
              {submitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Processing...
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
