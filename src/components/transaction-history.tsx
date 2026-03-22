'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  CircleHelp,
  History as HistoryIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { cn, getStatusBadgeVariant } from '@/lib/utils';
import { useCurrencyConverter } from '@/lib/currency';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type TxRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  status: string;
  amount: number; // USDT base
  currency: string | null;
  description: string | null;
  created_at: string;
};

const normType = (t: string) => String(t || '').trim().toLowerCase();

const getTransactionIcon = (type: string) => {
  const t = normType(type);
  switch (t) {
    case 'deposit':
      return <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />;
    case 'withdrawal':
      return <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />;
    case 'profit':
      return <TrendingUp className="h-3.5 w-3.5 text-blue-500" />;

    // ✅ referral/bonus types
    case 'bonus':
    case 'invite_bonus':
    case 'referral_bonus':
      return <Award className="h-3.5 w-3.5 text-yellow-500" />;

    case 'investment':
      return <Wallet className="h-3.5 w-3.5 text-gray-500" />;

    // optional support
    case 'airtime':
    case 'airtime_purchase':
    case 'data':
    case 'data_purchase':
      return <Wallet className="h-3.5 w-3.5 text-indigo-600" />;

    default:
      return <CircleHelp className="h-3.5 w-3.5 text-gray-400" />;
  }
};

const cleanTitle = (tType: string, desc?: string | null) => {
  const t = normType(tType);
  const d = String(desc || '').trim();

  if (d) return d;
  if (t === 'invite_bonus' || t === 'referral_bonus') return 'Invite Bonus';
  if (t === 'data_purchase') return 'Data Purchase';
  if (t === 'airtime_purchase') return 'Airtime Purchase';

  return t || 'transaction';
};

const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

export default function TransactionHistory() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState<string>('USDT');

  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { format, convert } = useCurrencyConverter(userCurrency);

  // ✅ session
  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const run = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('getSession error:', error);

      setUserId(data.session?.user?.id ?? null);

      unsub = supabase.auth.onAuthStateChange((_e, s) => {
        setUserId(s?.user?.id ?? null);
      });
    };

    run();
    return () => {
      if (unsub) unsub.data.subscription.unsubscribe();
    };
  }, []);

  // ✅ currency
  useEffect(() => {
    const run = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .schema('public')
        .from('users')
        .select('currency')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('load user currency error:', error);
        return;
      }
      if (data?.currency) setUserCurrency(data.currency);
    };

    run();
  }, [userId]);

  // ✅ load top 3
  useEffect(() => {
    const load = async () => {
      setLoadError(null);

      if (!userId) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .schema('public')
        .from('transactions')
        .select('id,user_id,transaction_type,status,amount,currency,description,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('❌ load transactions error:', error);
        setLoadError(error.message);
        setTransactions([]);
      } else {
        setTransactions((data as TxRow[]) ?? []);
      }

      setLoading(false);
    };

    load();
  }, [userId]);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">Loading...</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">Could not load transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
            <div className="font-semibold text-red-600">Error:</div>
            <div className="mt-1 break-words">{loadError}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions.length) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription className="text-xs">A log of your recent activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
            <HistoryIcon className="h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">No transactions yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription className="text-xs">A log of your recent account activity.</CardDescription>
          </div>

          <Link href="/history" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {transactions.map((t, idx) => {
          const type = normType(t.transaction_type);

          // ✅ FIX: add referral bonus types
          const isCredit = ['deposit', 'profit', 'bonus', 'refund', 'invite_bonus', 'referral_bonus'].includes(type);

          const amountUser = convert(Number(t.amount || 0));

          return (
            <Link key={t.id} href={`/history/receipt/${t.id}`} className="block" prefetch={false}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className="rounded-xl border bg-background p-3 hover:bg-muted/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">{getTransactionIcon(type)}</div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {cleanTitle(type, t.description)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={getStatusBadgeVariant(t.status as any)}
                      className="text-[10px] px-2 py-0.5 capitalize"
                    >
                      {t.status}
                    </Badge>

                    <div
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-semibold',
                        isCredit
                          ? 'bg-green-100/60 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-red-100/60 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      )}
                    >
                      {isCredit ? '+' : '-'}
                      {format(amountUser)}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-muted-foreground">Tap to view receipt</div>
              </motion.div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
