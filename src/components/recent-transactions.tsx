'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrencyConverter } from '@/lib/currency';
import { cn, getStatusBadgeVariant } from '@/lib/utils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Award, CircleHelp, TrendingUp, Wallet } from 'lucide-react';

type UserRow = {
  id: string;
  currency: string | null;
};

type TxRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  status: string;
  amount: number; // USDT base
  currency: string | null;
  description: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
};

const normType = (t: string) => String(t || '').trim().toLowerCase();

function formatDate(date: string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function cleanTitle(tType: string, desc?: string | null) {
  const t = normType(tType);
  const d = String(desc || '').trim();

  if (d) return d;
  if (t === 'invite_bonus' || t === 'referral_bonus') return 'Invite Bonus';
  if (t === 'data_purchase') return 'Data Purchase';
  if (t === 'airtime_purchase') return 'Airtime Purchase';

  return t || 'transaction';
}

function getTxIcon(type: string) {
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
}

export default function RecentTransactions() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);

  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { format, convert } = useCurrencyConverter(userRow?.currency || 'USDT');

  const shouldShowInRecent = (tx: TxRow) => {
    const t = normType(tx.transaction_type);
    if (t !== 'deposit') return true;
    const method = String(tx.metadata?.paymentMethod || '').toLowerCase();
    const submitted = Boolean(tx.metadata?.submittedForReviewAt);
    if (method === 'crypto_checkout' || method === 'local_bank_transfer') {
      return submitted;
    }
    return true;
  };

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

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setUserRow(null);
        return;
      }

      const { data, error } = await supabase.schema('public').from('users').select('id,currency').eq('id', userId).maybeSingle();

      if (error) {
        console.error('load user currency error:', error);
        setUserRow(null);
        return;
      }

      setUserRow((data as UserRow) ?? null);
    };

    run();
  }, [userId]);

  const loadTop3 = async () => {
    setLoadError(null);

    if (!userId) {
      setTxs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .schema('public')
      .from('transactions')
      .select('id,user_id,transaction_type,status,amount,currency,description,metadata,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ load recent tx error:', error);
      setLoadError(error.message);
      setTxs([]);
    } else {
      setTxs((((data as TxRow[]) ?? []).filter(shouldShowInRecent).slice(0, 3)));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTop3();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`recent-tx-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, () => loadTop3())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const containerAnim = useMemo(
    () => ({
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: 'easeOut', staggerChildren: 0.06 },
      },
    }),
    []
  );

  const itemAnim = useMemo(
    () => ({
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    }),
    []
  );

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="visible" className="w-full">
      <Card className="w-full overflow-hidden rounded-2xl border bg-background/60 shadow-sm">
        <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <CardDescription className="text-[11px]">A log of your recent account activity.</CardDescription>
          </div>

          <Button asChild variant="outline" size="sm" className="h-8 px-2 text-xs rounded-xl">
            <Link href="/history">View All</Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border p-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-56" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
              <div className="font-semibold text-red-600">Error loading transactions:</div>
              <div className="mt-1 break-words">{loadError}</div>
            </div>
          ) : txs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center">
              <h3 className="text-sm font-semibold">No Transactions Yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">Your deposits, withdrawals, and earnings will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {txs.map((t) => {
                const tType = normType(t.transaction_type);

                // ✅ FIX: add referral bonus types
                const isCredit = ['deposit', 'bonus', 'profit', 'refund', 'invite_bonus', 'referral_bonus'].includes(tType);

                const amountUser = convert(Number(t.amount || 0));

                return (
                  <Link key={t.id} href={`/history/receipt/${t.id}`} className="block" prefetch={false}>
                    <motion.div
                      variants={itemAnim}
                      whileHover={{ scale: 1.01 }}
                      className="rounded-xl border bg-card/60 p-3 shadow-sm hover:bg-muted/30 transition"
                    >
                      <div className="flex w-full min-w-0 items-start justify-between gap-2 overflow-hidden">
                        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                          <div className="shrink-0 rounded-full bg-muted p-1.5">{getTxIcon(tType)}</div>

                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="truncate text-[13px] font-semibold capitalize">
                              {cleanTitle(tType, t.description)}
                            </div>
                            <div className="truncate text-[10px] text-muted-foreground">{formatDate(t.created_at)}</div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <Badge className="capitalize text-[10px] px-2 py-0.5" variant={getStatusBadgeVariant(t.status as any)}>
                            {t.status}
                          </Badge>

                          <div
                            className={cn(
                              'max-w-[160px] whitespace-nowrap rounded-lg px-2 py-1 text-[12px] font-semibold',
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
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
