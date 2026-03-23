'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import {
  CheckCircle2,
  Loader,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Wifi,
  Signal,
  Download,
  Share2,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ IMPORTANT: use same converter as Wallet page
import { useCurrencyConverter } from '@/lib/currency';

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

function normalizeCurrency(input: string) {
  const v = String(input || '').trim().toUpperCase();
  if (v === '₦' || v === 'NAIRA' || v === 'NIGERIAN NAIRA') return 'USDT';
  if (v === '$' || v === 'DOLLAR' || v === 'US DOLLAR') return 'USDT';
  if (v === '£' || v === 'POUND' || v === 'BRITISH POUND') return 'USDT';
  if (v === '€' || v === 'EURO') return 'USDT';
  return v || 'USDT';
}

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

const LEGACY_NGN_TO_USDT = 0.000725;
const ngnToUsdt = (value: number) => round2((Number(value) || 0) * LEGACY_NGN_TO_USDT);

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function fetchPinStatus(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const res = await fetch('/api/withdrawal-pin/status', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json().catch(() => ({}));
  return Boolean(json?.isSet);
}

async function setWithdrawalPin(pin: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('No session token');

  const res = await fetch('/api/withdrawal-pin/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pin }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed to set PIN');
  return true;
}

function NetworkLogo({ name, size = 56 }: { name: string; size?: number }) {
  const slug = slugifyNetwork(name);
  const [broken, setBroken] = useState(false);

  return (
    <div
      className="rounded-2xl border bg-white/90 flex items-center justify-center overflow-hidden shadow-sm shrink-0"
      style={{ width: size, height: size }}
    >
      {!broken ? (
        <Image
          src={`/networks/${slug}.png`}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-contain p-2"
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

/** OPay-like keypad */
function PinKeypad({
  value,
  onChange,
  onSubmit,
  disabled,
  submitLabel = 'Confirm & Pay',
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
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
          {submitLabel}
        </Button>
      </motion.div>
    </div>
  );
}

type Bundle = { id: string; label: string; days: string; baseNGN: number };

function normalizeNetwork(network: string) {
  const raw = String(network || '').trim();
  const up = raw.toUpperCase();
  if (up === 'AT-T' || up === 'AT&T') return 'AT-T';
  if (up === 'ORANGE S A' || up === 'ORANGE S.A.' || up === 'ORANGE SA') return 'ORANGE S A';
  if (up === 'GLO' || up === 'GLOBACOM' || up === 'GLOBACOM (GLO)') return 'GLO';
  if (up === '9MOBILE' || up === 'ETISALAT NIGERIA') return '9MOBILE';
  return raw;
}

function buildBaseBundlesForNigerianNetworks(network: string): Bundle[] {
  const n = normalizeNetwork(network);
  const bump = (x: number, by: number) => x + by;

  if (n === 'MTN') {
    return [
      { id: 'mtn-500mb-30', label: '500 MB', days: '30 days', baseNGN: bump(500, -100) },
      { id: 'mtn-1gb-30', label: '1 GB', days: '30 days', baseNGN: bump(900, 100) },
      { id: 'mtn-3-5gb-30', label: '3.5 GB', days: '30 days', baseNGN: bump(1500, 0) },
      { id: 'mtn-7gb-30', label: '7 GB', days: '30 days', baseNGN: bump(3500, -200) },
      { id: 'mtn-13gb-30', label: '13 GB', days: '30 days', baseNGN: bump(9700, 0) },
      { id: 'mtn-25gb-30', label: '25 GB', days: '30 days', baseNGN: bump(9000, 200) },
      { id: 'mtn-64gb-30', label: '64 GB', days: '30 days', baseNGN: bump(16000, 0) },
    ];
  }

  if (n === 'AIRTEL') {
    return [
      { id: 'airtel-500mb-30', label: '500 MB', days: '30 days', baseNGN: bump(500, 0) },
      { id: 'airtel-1gb-30', label: '1 GB', days: '30 days', baseNGN: bump(900, -100) },
      { id: 'airtel-3-5gb-30', label: '3.5 GB', days: '30 days', baseNGN: bump(1500, -100) },
      { id: 'airtel-7gb-30', label: '7 GB', days: '30 days', baseNGN: bump(2000, 0) },
      { id: 'airtel-13gb-30', label: '13 GB', days: '30 days', baseNGN: bump(5000, 0) },
      { id: 'airtel-25gb-30', label: '25 GB', days: '30 days', baseNGN: bump(8000, -200) },
      { id: 'airtel-64gb-30', label: '64 GB', days: '30 days', baseNGN: bump(15000, 0) },
    ];
  }

  if (n === 'GLO') {
    return [
      { id: 'glo-500mb-30', label: '500 MB', days: '30 days', baseNGN: bump(600, 0) },
      { id: 'glo-1gb-30', label: '1 GB', days: '30 days', baseNGN: bump(1000, 0) },
      { id: 'glo-3-5gb-30', label: '3.5 GB', days: '30 days', baseNGN: bump(1500, 200) },
      { id: 'glo-7gb-30', label: '7 GB', days: '30 days', baseNGN: bump(2500, 0) },
      { id: 'glo-13gb-30', label: '13 GB', days: '30 days', baseNGN: bump(15000, -200) },
      { id: 'glo-25gb-30', label: '25 GB', days: '30 days', baseNGN: bump(15000, 200) },
      { id: 'glo-64gb-30', label: '64 GB', days: '30 days', baseNGN: bump(20000, 0) },
    ];
  }

  if (n === '9MOBILE') {
    return [
      { id: '9m-500mb-30', label: '500 MB', days: '30 days', baseNGN: bump(300, 100) },
      { id: '9m-1gb-30', label: '1 GB', days: '30 days', baseNGN: bump(400, 100) },
      { id: '9m-3-5gb-30', label: '3.5 GB', days: '30 days', baseNGN: bump(2000, -200) },
      { id: '9m-7gb-30', label: '7 GB', days: '30 days', baseNGN: bump(1500, 0) },
      { id: '9m-13gb-30', label: '13 GB', days: '30 days', baseNGN: bump(4000, 200) },
      { id: '9m-25gb-30', label: '25 GB', days: '30 days', baseNGN: bump(10000, 0) },
      { id: '9m-64gb-30', label: '64 GB', days: '30 days', baseNGN: bump(15000, 0) },
    ];
  }

  return [
    { id: `${slugifyNetwork(network)}-500mb-30`, label: '500 MB', days: '30 days', baseNGN: 600 },
    { id: `${slugifyNetwork(network)}-1gb-30`, label: '1 GB', days: '30 days', baseNGN: 1000 },
    { id: `${slugifyNetwork(network)}-3-5gb-30`, label: '3.5 GB', days: '30 days', baseNGN: 1700 },
    { id: `${slugifyNetwork(network)}-7gb-30`, label: '7 GB', days: '30 days', baseNGN: 3500 },
    { id: `${slugifyNetwork(network)}-13gb-30`, label: '13 GB', days: '30 days', baseNGN: 9700 },
    { id: `${slugifyNetwork(network)}-25gb-30`, label: '25 GB', days: '30 days', baseNGN: 9200 },
    { id: `${slugifyNetwork(network)}-64gb-30`, label: '64 GB', days: '30 days', baseNGN: 16000 },
  ];
}

function getBundlesForNetwork(network: string) {
  if (!network) return [];
  return buildBaseBundlesForNigerianNetworks(network);
}

function buildReceiptText(input: {
  appName?: string;
  txId: string;
  network: string;
  phone: string;
  plan: string;
  payAmountText: string;
  createdAt: string;
}) {
  const lines = [
    `${input.appName || 'Transaction Receipt'}`,
    `------------------------------`,
    `Status: Successful`,
    `Transaction Type: Data`,
    `Network: ${input.network}`,
    `Recipient Mobile: ${input.phone}`,
    `Plan: ${input.plan}`,
    `Amount Paid: ${input.payAmountText}`,
    `Transaction ID: ${input.txId}`,
    `Date: ${input.createdAt}`,
    `------------------------------`,
  ];
  return lines.join('\n');
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const dataSchema = z.object({
  network: z.string().min(2, 'Select a network'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  bundleId: z.string().min(2, 'Select a data bundle'),
});

const setPinSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits.'),
    confirmPin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits.'),
  })
  .refine((v) => v.pin === v.confirmPin, { message: 'PIN does not match.', path: ['confirmPin'] });

export default function DataPage() {
  const router = useRouter();
  const { toast } = useToast();

  const detailsRef = useRef<HTMLDivElement | null>(null);

  // ✅ walletBalance is USDT base from DB
  const [userCurrency, setUserCurrency] = useState('USDT');
  const [walletBalanceUSDT, setWalletBalanceUSDT] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // ✅ SAME converter used in wallet page
  const { format, convert } = useCurrencyConverter(userCurrency);

  const [pinSet, setPinSet] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  const [setPinOpen, setSetPinOpen] = useState(false);
  const [pinEntryOpen, setPinEntryOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [pinValue, setPinValue] = useState('');

  const [success, setSuccess] = useState<null | {
    txId: string;
    network: string;
    phone: string;
    plan: string;
    payAmountText: string;
    createdAt: string;
    receiptText: string;
  }>(null);

  const form = useForm<z.infer<typeof dataSchema>>({
    resolver: zodResolver(dataSchema),
    defaultValues: { network: '', phone: '', bundleId: '' },
    mode: 'onChange',
  });

  const setPinForm = useForm<z.infer<typeof setPinSchema>>({
    resolver: zodResolver(setPinSchema),
    defaultValues: { pin: '', confirmPin: '' },
    mode: 'onChange',
  });

  const watchedNetwork = useWatch({ control: form.control, name: 'network' });
  const watchedBundleId = useWatch({ control: form.control, name: 'bundleId' });

  const bundles = useMemo(() => getBundlesForNetwork(watchedNetwork || ''), [watchedNetwork]);

  const selectedBundle = useMemo(() => {
    if (!watchedBundleId) return null;
    return bundles.find((b) => b.id === watchedBundleId) || null;
  }, [bundles, watchedBundleId]);

  // ✅ 80% OFF => pay 20%
  const DISCOUNT_PERCENT = 80;
  const PAY_FACTOR = 0.2;

  // ✅ USDT base amounts (converted from legacy NGN bundle table)
  const payUSDT = useMemo(() => {
    if (!selectedBundle) return 0;
    return ngnToUsdt(selectedBundle.baseNGN * PAY_FACTOR);
  }, [selectedBundle]);

  const realUSDT = useMemo(() => {
    if (!selectedBundle) return 0;
    return ngnToUsdt(selectedBundle.baseNGN);
  }, [selectedBundle]);

  // ✅ DISPLAY values using SAME converter as Wallet page
  const walletDisplay = useMemo(() => convert(walletBalanceUSDT), [walletBalanceUSDT, convert]);
  const payDisplay = useMemo(() => convert(payUSDT), [payUSDT, convert]);
  const realDisplay = useMemo(() => convert(realUSDT), [realUSDT, convert]);

  useEffect(() => {
    const run = async () => {
      setLoadingWallet(true);
      setCheckingPin(true);
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (!uid) {
          toast({ variant: 'destructive', title: 'Login required', description: 'Please login again.' });
          router.push('/login');
          return;
        }

        const [{ data: urow, error: uerr }, isSet] = await Promise.all([
          supabase.from('users').select('wallet_balance,currency').eq('id', uid).maybeSingle(),
          fetchPinStatus().catch(() => false),
        ]);

        if (uerr) throw uerr;

        const cur = normalizeCurrency(String((urow as any)?.currency || 'USDT'));
        setUserCurrency(cur);

        // ✅ base stored in USDT
        setWalletBalanceUSDT(Number((urow as any)?.wallet_balance ?? 0));

        setPinSet(Boolean(isSet));
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Could not load page.' });
      } finally {
        setLoadingWallet(false);
        setCheckingPin(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = useMemo(() => {
    if (!form.formState.isValid) return false;
    if (loadingWallet) return false;
    if (!selectedBundle) return false;

    if ((Number(walletBalanceUSDT) || 0) < (Number(payUSDT) || 0)) return false;

    return !busy;
  }, [form.formState.isValid, loadingWallet, selectedBundle, walletBalanceUSDT, payUSDT, busy]);

  const onSelectNetwork = (name: string) => {
    form.setValue('network', name, { shouldValidate: true });
    form.setValue('bundleId', '', { shouldValidate: true });

    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const onContinue = async () => {
    if (checkingPin) return;
    if (!pinSet) {
      setSetPinOpen(true);
      return;
    }
    setPinValue('');
    setPinEntryOpen(true);
  };

  const doPurchase = async () => {
    const values = form.getValues();
    const token = await getAccessToken();
    if (!token) {
      toast({ variant: 'destructive', title: 'Session expired', description: 'Please login again.' });
      router.push('/login');
      return;
    }

    const cleanPin = (pinValue || '').replace(/\D/g, '').slice(0, 4);
    if (cleanPin.length !== 4) return;

    if (!selectedBundle) {
      toast({ variant: 'destructive', title: 'Select a bundle', description: 'Please select a data bundle.' });
      return;
    }

    const plan = `${selectedBundle.label} • ${selectedBundle.days}`;
    const amountToChargeUSDT = Number(payUSDT) || 0;

    setBusy(true);
    try {
      const res = await fetch('/api/data/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          network: values.network,
          phone: values.phone,
          plan,
          amount: amountToChargeUSDT,
          currency: 'USDT',
          pin: cleanPin,
          meta: {
            real_price_usdt: realUSDT,
            pay_price_usdt: payUSDT,
            discount_percent: DISCOUNT_PERCENT,
            user_currency: userCurrency,
          },
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Purchase failed');

      // refresh wallet
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        const { data: urow } = await supabase.from('users').select('wallet_balance').eq('id', uid).maybeSingle();
        setWalletBalanceUSDT(Number((urow as any)?.wallet_balance ?? walletBalanceUSDT));
      }

      setPinEntryOpen(false);

      const txId = String(json.txId || '');
      const createdAt = new Date().toLocaleString();

      const payText = format(convert(amountToChargeUSDT));

      const receiptText = buildReceiptText({
        appName: 'Eco-solar-Investments',
        txId,
        network: String(values.network),
        phone: String(values.phone),
        plan,
        payAmountText: payText,
        createdAt,
      });

      setSuccess({
        txId,
        network: String(values.network),
        phone: String(values.phone),
        plan,
        payAmountText: payText,
        createdAt,
        receiptText,
      });

      toast({ title: 'Successful', description: 'Data purchase completed.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e?.message || 'Could not complete purchase.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSetPin = async (v: z.infer<typeof setPinSchema>) => {
    setBusy(true);
    try {
      await setWithdrawalPin(v.pin);
      setPinSet(true);
      toast({ title: 'PIN Set', description: 'Withdrawal PIN saved successfully.' });
      setSetPinOpen(false);

      setPinValue('');
      setPinEntryOpen(true);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e?.message || 'Could not set PIN.' });
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Receipt copied to clipboard.' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy.' });
    }
  };

  if (success) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="mb-4 flex items-center gap-2">
            <Button variant="ghost" className="rounded-2xl" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>

          <Card className="overflow-hidden border-muted/60 shadow-xl bg-neutral-950 text-white">
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3">
                  <NetworkLogo name={success.network} size={60} />
                </div>
                <div className="text-xl font-semibold">{success.network}</div>

                <div className="mt-3 text-5xl font-extrabold tracking-tight">{success.payAmountText}</div>

                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Successful</span>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/5 p-4">
                <div className="text-sm font-semibold mb-3">Transaction Details</div>

                <div className="space-y-3 text-sm">
                  <Row label="Recipient Mobile" value={success.phone} />
                  <Row label="Transaction Type" value="Data" />
                  <Row label="Payment Method" value="Wallet" />
                  <Row label="Plan" value={success.plan} />
                  <Row label="Transaction ID" value={success.txId} mono copy={() => copyToClipboard(success.txId)} />
                  <Row label="Transaction Date" value={success.createdAt} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  className="rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => downloadTextFile(`receipt-${success.txId}.txt`, success.receiptText)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Save Receipt
                </Button>

                <Button
                  className="rounded-2xl h-12 bg-white/10 hover:bg-white/15 text-white"
                  onClick={() => copyToClipboard(success.receiptText)}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share / Copy
                </Button>
              </div>

              <div className="mt-3">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl h-12 border-white/15 bg-transparent text-white hover:bg-white/10"
                  onClick={() => {
                    setSuccess(null);
                    form.reset({ network: '', phone: '', bundleId: '' });
                  }}
                >
                  Buy Again
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" className="rounded-2xl" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        <Card className="border-muted/60 shadow-xl overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/60" />
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Buy Data
            </CardTitle>
            <CardDescription>Select network, then choose a bundle and pay with wallet.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ✅ Wallet Balance (SAME as Wallet page display) */}
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Wallet Balance</div>
              <div className="mt-1 text-2xl font-extrabold">{loadingWallet ? 'Loading...' : format(walletDisplay)}</div>
            </div>

            <Form {...form}>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* Network big logo buttons */}
                <FormField
                  control={form.control}
                  name="network"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Network</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-3">
                          {NETWORKS.map((n) => {
                            const active = field.value === n;
                            return (
                              <motion.button
                                key={n}
                                type="button"
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onSelectNetwork(n)}
                                className={cn(
                                  'w-full rounded-2xl border p-4 text-left transition',
                                  'min-h-[96px]',
                                  'flex items-center gap-4',
                                  'bg-background hover:bg-muted/40',
                                  active ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-muted'
                                )}
                              >
                                <NetworkLogo name={n} size={56} />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{n}</div>
                                  <div className="text-xs text-muted-foreground">{active ? 'Selected' : 'Tap to select'}</div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div ref={detailsRef} />

                {watchedNetwork ? (
                  <div className="rounded-2xl border bg-muted/20 p-4 flex items-center gap-3">
                    <NetworkLogo name={watchedNetwork} size={48} />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Selected Network</div>
                      <div className="truncate font-semibold">{watchedNetwork}</div>
                    </div>
                  </div>
                ) : null}

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.12 }}>
                          <Input className="rounded-2xl h-12" placeholder="e.g. 08012345678" inputMode="tel" {...field} />
                        </motion.div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bundles */}
                <FormField
                  control={form.control}
                  name="bundleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Choose Bundle</FormLabel>
                      <FormControl>
                        {!watchedNetwork ? (
                          <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                            Select a network to see available bundles.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {bundles.map((b) => {
                              const active = field.value === b.id;

                              const realUser = convert(ngnToUsdt(b.baseNGN));
                              const payUser = convert(ngnToUsdt(b.baseNGN * PAY_FACTOR));

                              return (
                                <motion.button
                                  key={b.id}
                                  type="button"
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => field.onChange(b.id)}
                                  className={cn(
                                    'rounded-2xl border p-4 text-left transition',
                                    'bg-background hover:bg-muted/40',
                                    active ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-muted'
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-base font-bold">
                                        {b.label} <span className="text-muted-foreground font-medium">• {b.days}</span>
                                      </div>

                                      <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs rounded-full bg-emerald-500/15 text-emerald-700 px-2 py-1 font-semibold">
                                          {DISCOUNT_PERCENT}% OFF
                                        </span>
                                        {active ? (
                                          <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-1 font-semibold">
                                            Selected
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Real price</div>
                                      <div className="text-sm line-through text-muted-foreground font-semibold">{format(realUser)}</div>

                                      <div className="mt-1 text-xs text-muted-foreground">You pay</div>
                                      <div className="text-lg font-extrabold text-emerald-700">{format(payUser)}</div>
                                    </div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Summary */}
                {selectedBundle ? (
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="text-sm font-semibold">Summary</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      You selected <b className="text-foreground">{selectedBundle.label}</b> ({selectedBundle.days})
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pay</span>
                      <span className="font-extrabold">{format(payDisplay)}</span>
                    </div>
                  </div>
                ) : null}

                <Alert className="rounded-2xl">
                  <AlertDescription>
                    You’ll be asked for your <b>Withdrawal PIN</b> at the final step.
                  </AlertDescription>
                </Alert>

                {selectedBundle && Number(walletBalanceUSDT) < Number(payUSDT) ? (
                  <Alert className="rounded-2xl">
                    <AlertDescription className="text-destructive">
                      Insufficient wallet balance for this purchase.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }}>
                  <Button className="w-full rounded-2xl h-12" disabled={!canContinue} onClick={onContinue}>
                    Continue
                  </Button>
                </motion.div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Set PIN */}
        <Dialog open={setPinOpen} onOpenChange={(o) => !busy && setSetPinOpen(o)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Set Withdrawal PIN
              </DialogTitle>
              <DialogDescription>Create a 4-digit PIN (same one used for withdrawals).</DialogDescription>
            </DialogHeader>

            <Form {...setPinForm}>
              <form className="space-y-4" onSubmit={setPinForm.handleSubmit(handleSetPin)}>
                <FormField
                  control={setPinForm.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New PIN</FormLabel>
                      <FormControl>
                        <Input className="rounded-2xl h-12" inputMode="numeric" maxLength={4} placeholder="4 digits" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={setPinForm.control}
                  name="confirmPin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm PIN</FormLabel>
                      <FormControl>
                        <Input className="rounded-2xl h-12" inputMode="numeric" maxLength={4} placeholder="4 digits" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }}>
                  <Button className="w-full rounded-2xl h-12" disabled={busy || !setPinForm.formState.isValid} type="submit">
                    {busy && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Save PIN
                  </Button>
                </motion.div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Enter PIN */}
        <Dialog open={pinEntryOpen} onOpenChange={(o) => !busy && setPinEntryOpen(o)}>
          <DialogContent className="rounded-2xl bg-sky-50 border-sky-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-sky-600" />
                Enter Withdrawal PIN
              </DialogTitle>
              <DialogDescription>
                You will pay <b>{format(payDisplay)}</b>.
              </DialogDescription>
            </DialogHeader>

            <PinKeypad
              value={pinValue}
              disabled={busy}
              onChange={(next) => setPinValue((next || '').replace(/\D/g, '').slice(0, 4))}
              onSubmit={doPurchase}
              submitLabel={busy ? 'Processing...' : 'Confirm & Pay'}
            />

            {busy ? (
              <div className="text-center text-xs text-muted-foreground">
                <Loader className="inline-block mr-2 h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  copy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-white/60">{label}</div>
      <div className={cn('text-right', mono ? 'font-mono text-xs break-all' : 'font-semibold')}>
        <span>{value}</span>
        {copy ? (
          <button
            type="button"
            onClick={copy}
            className="ml-2 inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 p-1"
            aria-label="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
