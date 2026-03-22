'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyConverter } from '@/lib/currency';
import { cn, getStatusBadgeVariant } from '@/lib/utils';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Info,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  TrendingUp,
  XCircle,
  CircleHelp,
  Share2,
  Copy,
} from 'lucide-react';

type UserRow = {
  id: string;
  currency: string | null;
  email: string | null;
  full_name: string | null;
};

type TxRow = {
  id: string; // ✅ real ID in table (primary key)
  user_id: string;
  transaction_type: string;
  amount: number; // NGN base
  currency: string | null;
  status: string;
  description: string | null;
  metadata: any | null;
  created_at: string;
};

function formatDateTime(date: any): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleString();
}

const formatNGN = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function getTransactionIcon(type: string) {
  switch ((type || '').toLowerCase()) {
    case 'deposit':
      return <ArrowDownLeft className="h-6 w-6 text-green-600" />;
    case 'withdrawal':
      return <ArrowUpRight className="h-6 w-6 text-red-600" />;
    case 'bonus':
      return <Award className="h-6 w-6 text-yellow-600" />;
    case 'profit':
      return <TrendingUp className="h-6 w-6 text-blue-600" />;
    case 'investment':
      return <Wallet className="h-6 w-6 text-gray-700" />;
    case 'data':
      return <Wallet className="h-6 w-6 text-purple-700" />;
    case 'airtime':
      return <Wallet className="h-6 w-6 text-indigo-700" />;
    default:
      return <CircleHelp className="h-6 w-6 text-muted-foreground" />;
  }
}

function cleanTitle(type: string, desc?: string | null) {
  const d = String(desc || '').trim();
  if (!d) return (type || 'transaction').toUpperCase();
  if (String(type || '').toLowerCase() === 'bonus' && d.toLowerCase().includes('signup bonus')) return 'SIGNUP BONUS';
  return d;
}

function safeStr(v: any) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return '';
  }
}

function pickMoney(md: any, keys: string[]) {
  for (const k of keys) {
    const v = md?.[k];
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default function ReceiptPage() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useParams();

  // ✅ route param name is [id]
  const txId = String((params as any)?.id || '').trim();

  const [user, setUser] = useState<UserRow | null>(null);
  const [tx, setTx] = useState<TxRow | null>(null);
  const [loading, setLoading] = useState(true);

  const userCurrency = user?.currency || 'NGN';
  const { format, convert } = useCurrencyConverter(userCurrency);

  useEffect(() => {
    const run = async () => {
      if (!txId) return;

      setLoading(true);
      try {
        const { data: sess, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        const uid = sess.session?.user?.id;
        if (!uid) {
          router.push('/login');
          return;
        }

        const { data: urow, error: uerr } = await supabase
          .schema('public')
          .from('users')
          .select('id,currency,email,full_name')
          .eq('id', uid)
          .maybeSingle();

        if (uerr) throw uerr;
        setUser((urow as UserRow) ?? null);

        // ✅ IMPORTANT: use id, not transaction_id
        const { data: trow, error: terr } = await supabase
          .schema('public')
          .from('transactions')
          .select('id,user_id,transaction_type,amount,currency,status,description,metadata,created_at')
          .eq('user_id', uid)
          .eq('id', txId)
          .maybeSingle();

        if (terr) throw terr;

        if (!trow) {
          toast({
            variant: 'destructive',
            title: 'Receipt not found',
            description: 'This transaction does not exist or is not yours.',
          });
          router.push('/history');
          return;
        }

        setTx(trow as TxRow);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: e?.message || 'Could not load receipt.',
        });
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId]);

  const md = tx?.metadata || {};
  const txType = useMemo(() => String(tx?.transaction_type || 'transaction').toLowerCase(), [tx?.transaction_type]);

  const statusLower = String(tx?.status || '').toLowerCase();
  const isSuccess = statusLower === 'success' || statusLower === 'successful';
  const isFailed = statusLower === 'failed';

  const baseAmountNGN = Number(tx?.amount || 0);

  const originalNGN =
    pickMoney(md, ['real_amount', 'original_amount', 'real_price', 'original_price', 'real_price_ngn', 'original_price_ngn']) ??
    baseAmountNGN;

  const voucherNGN =
    pickMoney(md, ['voucher_used', 'voucher_amount', 'voucher', 'discount_voucher', 'voucher_ngn']) ?? 0;

  const paidNGN =
    pickMoney(md, ['amount_paid', 'paid_amount', 'charged_amount', 'pay_amount', 'paid_ngn']) ?? baseAmountNGN;

  const originalUser = convert(originalNGN);
  const voucherUser = convert(voucherNGN);
  const paidUser = convert(paidNGN);

  const network = safeStr(md?.network || md?.provider_network || md?.telco);
  const phone = safeStr(md?.phone || md?.recipient_mobile || md?.recipient);
  const plan = safeStr(md?.plan || md?.bundle || md?.data_bundle || md?.package);
  const provider = safeStr(md?.provider || md?.gateway || md?.service || md?.payment_method);
  const reference = safeStr(md?.reference || md?.ref || md?.provider_ref || md?.transaction_ref || md?.flw_ref || md?.paystack_ref);

  const onDownload = () => window.print();

  const onCopyId = async () => {
    try {
      await navigator.clipboard.writeText(String(tx?.id || ''));
      toast({ title: 'Copied', description: 'Transaction ID copied.' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed', description: 'Could not copy.' });
    }
  };

  const onShare = async () => {
    const shareText = `Eco Solar Investment Receipt\nTransaction ID: ${tx?.id}\nStatus: ${tx?.status}\nAmount: ${format(paidUser)}\nDate: ${formatDateTime(tx?.created_at)}`;
    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title: 'Receipt', text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(shareText + `\n${window.location.href}`);
        toast({ title: 'Copied', description: 'Receipt info copied (share not supported on this device).' });
      }
    } catch {
      // user cancelled share
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <Card className="overflow-hidden rounded-2xl border-muted/60 shadow-lg">
          <div className="h-2 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/60" />
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tx) return null;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="no-print mb-4 flex items-center gap-2">
          <Button variant="ghost" className="rounded-2xl" onClick={() => router.push('/history')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>

        <Card className="print-card overflow-hidden rounded-2xl border-muted/60 shadow-lg">
          <div className="h-2 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/60" />

          <CardHeader className="text-center">
            <div
              className={cn(
                'mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl',
                isSuccess ? 'bg-green-500/10' : isFailed ? 'bg-red-500/10' : 'bg-muted/40'
              )}
            >
              {isSuccess ? (
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              ) : isFailed ? (
                <XCircle className="h-9 w-9 text-red-600" />
              ) : (
                <Info className="h-9 w-9 text-muted-foreground" />
              )}
            </div>

            <CardTitle className="text-2xl">{isSuccess ? 'Successful' : isFailed ? 'Failed' : 'Transaction Receipt'}</CardTitle>

            <CardDescription className="flex items-center justify-center gap-2">
              <span className="capitalize">{txType}</span>
              <span className="opacity-60">•</span>
              <Badge className="capitalize" variant={getStatusBadgeVariant(tx.status as any)}>
                {tx.status}
              </Badge>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl border bg-background flex items-center justify-center">
                  {getTransactionIcon(txType)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">Transaction</div>
                  <div className="truncate text-sm font-semibold">{cleanTitle(txType, tx.description)}</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-extrabold tracking-tight">{format(paidUser)}</div>
                <div className="mt-1 text-xs text-muted-foreground">Base NGN: {formatNGN(paidNGN)}</div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{format(originalUser)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Voucher Used</span>
                  <span className="font-semibold">{voucherNGN > 0 ? `- ${format(voucherUser)}` : '—'}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-extrabold">{format(paidUser)}</span>
                </div>
              </div>

              <Separator />

              <div className="rounded-xl border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono break-all">{tx.id}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 no-print" onClick={onCopyId}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Date</span>
                  <span className="text-xs font-semibold">{formatDateTime(tx.created_at)}</span>
                </div>

                {network ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Network</span>
                    <span className="text-xs font-semibold">{network}</span>
                  </div>
                ) : null}

                {phone ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Recipient Mobile</span>
                    <span className="text-xs font-semibold">{phone}</span>
                  </div>
                ) : null}

                {plan ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Bundle / Plan</span>
                    <span className="text-xs font-semibold text-right">{plan}</span>
                  </div>
                ) : null}

                {provider ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Payment Method</span>
                    <span className="text-xs font-semibold">{provider}</span>
                  </div>
                ) : null}

                {reference ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Reference</span>
                    <span className="text-xs font-semibold break-all text-right">{reference}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="no-print grid gap-2">
              <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }}>
                <Button className="w-full rounded-2xl h-12" onClick={onDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download / Save Receipt
                </Button>
              </motion.div>

              <Button variant="outline" className="w-full rounded-2xl h-12" onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Receipt
              </Button>

              <Button variant="outline" className="w-full rounded-2xl h-12" asChild>
                <Link href="/history">Back to History</Link>
              </Button>
            </div>

            <div className="no-print rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="font-semibold">TIP:</span> After tapping Download, choose <b>Save as PDF</b> to keep the receipt.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
