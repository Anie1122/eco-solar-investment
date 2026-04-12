'use client';

import type { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AuthGuard from '@/components/auth-guard';
import NotificationBell from '@/components/notification-bell';

import { supabase } from '@/lib/supabaseClient';
import { useCurrencyConverter } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { queueStartupSplash } from '@/lib/startup-transition';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

import { Sun, TrendingUp, LogOut } from 'lucide-react';
import InvestmentCountdown from '@/components/investment-countdown';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  currency: string | null;
};

type InvestmentRow = {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_name: string | null;
  duration_days: number | null;
  amount: number | null; // ✅ stored in NGN base
  daily_profit: number | null; // weekly profit amount (legacy column name)
  total_return: number | null; // ✅ stored in NGN base
  currency: string | null;
  status: string | null;
  started_at: string | null;
  ends_at: string | null;
  last_profit_at: string | null;
  next_profit_at: string | null;
  created_at: string;
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

function useSupabaseSessionUser() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
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

  return userId;
}

function useSupabaseUserRow(userId: string | null) {
  const [row, setRow] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setRow(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .schema('public')
        .from('users')
        .select('id,email,full_name,currency')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ load users row error:', error);
        setRow(null);
      } else {
        setRow((data as UserRow) ?? null);
      }

      setLoading(false);
    };

    run();
  }, [userId]);

  return { row, loading };
}

/** ✅ Rolling tape marquee (no-jump, TV ticker style) */
function ProfitTicker({ text }: { text: string }) {
  const line = `${text}  •  ${text}  •  ${text}  •  `;

  return (
    <div className="relative overflow-hidden rounded-md border border-yellow-400 bg-yellow-300">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-yellow-300 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-yellow-300 to-transparent" />

      <div className="py-2">
        <div className="flex whitespace-nowrap will-change-transform">
          <div className="ticker-track font-bold text-black">
            <span className="px-6">{line}</span>
          </div>
          <div className="ticker-track font-bold text-black" aria-hidden="true">
            <span className="px-6">{line}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          display: inline-block;
          animation: ticker 18s linear infinite;
        }
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

const InvestmentsOnlyList = () => {
  const userId = useSupabaseSessionUser();
  const { row: userRow, loading: userLoading } = useSupabaseUserRow(userId);

  const [items, setItems] = useState<InvestmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ IMPORTANT CHANGE:
  // amounts are stored in NGN, but we DISPLAY in user currency like wallet page
  const { format, convert } = useCurrencyConverter(userRow?.currency || 'NGN');

  const loadInvestments = async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .schema('public')
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ load investments error:', error);
      setItems([]);
    } else {
      setItems((data as InvestmentRow[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadInvestments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inv-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${userId}` }, () =>
        loadInvestments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const calcProgress = (startedAt?: string | null, endsAt?: string | null) => {
    if (!startedAt || !endsAt) return { pct: 0, cycle: 0, total: 6 };

    const start = new Date(startedAt).getTime();
    const end = new Date(endsAt).getTime();
    const now = Date.now();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { pct: 0, cycle: 0, total: 6 };

    const elapsedDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const elapsedCycles = Math.floor(Math.max(0, elapsedDays) / 7);
    const clampedElapsed = Math.min(Math.max(elapsedCycles, 0), 6);
    const pct = Math.min(100, Math.max(0, (clampedElapsed / 6) * 100));

    return { pct, cycle: clampedElapsed, total: 6 };
  };

  if (loading || userLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2 rounded-md border p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Investments Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">Your active and completed investments will appear here.</p>
        <Button asChild className="mt-4">
          <Link href="/investments">Explore Plans</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((inv) => {
        const { pct, cycle, total } = calcProgress(inv.started_at, inv.ends_at);

        const isActive = String(inv.status || '').toLowerCase() === 'active';
        const endMs = inv.ends_at ? new Date(inv.ends_at).getTime() : NaN;
        const isCompleted = !isActive || (Number.isFinite(endMs) && Date.now() >= endMs);

        // ✅ convert NGN -> user currency for display
        const investedUser = convert(Number(inv.amount || 0));
        const weeklyUser = convert(Number(inv.daily_profit || 0));

        return (
          <Card key={inv.id}>
            <CardHeader className="flex-row items-center justify-between p-4">
              <CardTitle className="text-lg">{inv.plan_name || 'Investment'}</CardTitle>
              <Badge variant={isCompleted ? 'secondary' : 'default'} className="capitalize">
                {isCompleted ? 'completed' : inv.status || 'active'}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold">Invested Amount</div>
                <div className="text-right font-mono">{format(investedUser)}</div>

                <div className="font-semibold">Weekly Profit</div>
                <div className={cn('text-right font-mono', 'text-green-600')}>{format(weeklyUser)}</div>

                <div className="font-semibold">Started On</div>
                <div className="text-right">{formatDate(inv.started_at)}</div>

                <div className="font-semibold">Ends On</div>
                <div className="text-right">{formatDate(inv.ends_at)}</div>
              </div>

              <div className="space-y-2">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>
                    Week {Math.min(cycle, total)} of {total}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>

              {/* ✅ Countdown */}
              {isActive && !isCompleted && inv.ends_at && (
                <InvestmentCountdown nextProfitAt={inv.next_profit_at} endsAt={inv.ends_at} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const MyInvestmentsPage: NextPage = () => {
  const router = useRouter();
  const userId = useSupabaseSessionUser();
  const { row: userRow } = useSupabaseUserRow(userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    queueStartupSplash('logout');
    router.push('/login');
  };

  const displayName = userRow?.full_name || userRow?.email || 'Account';

  const labelText =
    'Pending profits are automatically detected and credited weekly. If you miss a cycle, the system automatically catches up.';

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
          <div className="flex items-center gap-2 font-bold">
            <Sun className="h-5 w-5 text-primary" />
            <span>Eco Solar Investment</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
          <ProfitTicker text={labelText} />

          <Card>
            <CardHeader>
              <CardTitle>My Investments</CardTitle>
              <CardDescription>
                Active and completed investments for <span className="font-medium">{displayName}</span>.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <InvestmentsOnlyList />
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default MyInvestmentsPage;
