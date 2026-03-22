'use client';

import type { NextPage } from 'next';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronDown,
  History as HistoryIcon,
  LayoutGrid,
  LogOut,
  Settings,
  Sun,
  TrendingUp,
  User,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  CircleHelp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import AuthGuard from '@/components/auth-guard';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn, getStatusBadgeVariant } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/notification-bell';
import { motion } from 'framer-motion';
import { useCurrencyConverter } from '@/lib/currency';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Progress } from '@/components/ui/progress';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  currency: string | null;
};

type TxRow = {
  id: string; // ✅ FIX: use real primary key
  user_id: string;
  transaction_type: string;
  status: string;
  amount: number; // NGN base
  currency: string | null;
  description: string | null;
  metadata: any | null;
  created_at: string;
};

type InvestmentRow = {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_name: string | null;
  duration_days: number | null;
  amount: number | null; // NGN base
  daily_profit: number | null; // NGN base
  total_return: number | null; // NGN base
  currency: string | null;
  status: 'active' | 'completed' | 'cancelled' | string;
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

const formatNGN = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normType = (t: string) => String(t || '').trim().toLowerCase();

const getTransactionIcon = (type: string) => {
  const t = normType(type);

  switch (t) {
    case 'deposit':
      return <ArrowDownLeft className="h-3 w-3 text-green-500" />;
    case 'withdrawal':
      return <ArrowUpRight className="h-3 w-3 text-red-500" />;

    // ✅ Bonus/referral/profit credits
    case 'bonus':
    case 'invite_bonus':
    case 'referral_bonus':
      return <Award className="h-3 w-3 text-yellow-500" />;

    case 'profit':
      return <TrendingUp className="h-3 w-3 text-blue-500" />;

    case 'investment':
      return <Wallet className="h-3 w-3 text-gray-500" />;

    // ✅ Purchases (handle multiple names)
    case 'data':
    case 'data_purchase':
      return <Wallet className="h-3 w-3 text-purple-600" />;

    case 'airtime':
    case 'airtime_purchase':
      return <Wallet className="h-3 w-3 text-indigo-600" />;

    default:
      return <CircleHelp className="h-3 w-3 text-gray-400" />;
  }
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

const DashboardHeader = () => {
  const router = useRouter();
  const userId = useSupabaseSessionUser();
  const { row: userRow } = useSupabaseUserRow(userId);

  const appName = 'Eco Solar Investment';

  const sentence = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { delay: 0.5, staggerChildren: 0.08 } },
  };

  const letter = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  const displayName = userRow?.full_name || userRow?.email || 'Account';
  const emailForAvatar = userRow?.email || 'user';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="sm:hidden" />

      <motion.div className="hidden items-center gap-2 text-xl font-bold md:flex" variants={sentence} initial="hidden" animate="visible">
        <Sun className="h-6 w-6 text-primary" />
        {appName.split('').map((char, index) => (
          <motion.span key={char + '-' + index} variants={letter}>
            {char}
          </motion.span>
        ))}
      </motion.div>

      <div className="flex items-center gap-2 text-lg font-bold md:hidden">
        <Sun className="h-5 w-5 text-primary" />
        <span>Eco Solar Investment</span>
      </div>

      <div className="relative ml-auto flex-1 md:grow-0" />
      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://avatar.vercel.sh/${emailForAvatar}.png`} alt="User avatar" />
              <AvatarFallback>{emailForAvatar.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block">{displayName}</span>
            <ChevronDown className="hidden h-4 w-4 sm:inline-block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await supabase.auth.signOut();
              sessionStorage.clear();
              localStorage.clear();
              router.push('/login');
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

const SidebarNav = () => {
  const router = useRouter();
  const activeItem = 'history';

  const userId = useSupabaseSessionUser();
  const { row: userRow } = useSupabaseUserRow(userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    router.push('/login');
  };

  const displayName = userRow?.full_name || userRow?.email || 'Account';
  const emailForAvatar = userRow?.email || 'user';

  return (
    <>
      <SidebarHeader className="border-b">
        <motion.div
          className="flex items-center gap-2 p-2"
          animate={{ scale: [1, 1.02, 1], transition: { duration: 2, ease: 'easeInOut', repeat: Infinity } }}
        >
          <Sun className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Eco Solar Investment</h1>
        </motion.div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/">
              <SidebarMenuButton isActive={activeItem === 'dashboard'} tooltip="Dashboard">
                <LayoutGrid />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/investments">
              <SidebarMenuButton isActive={activeItem === 'investments'} tooltip="Investments">
                <TrendingUp />
                <span>Investments</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/wallet">
              <SidebarMenuButton isActive={activeItem === 'wallet'} tooltip="Wallet">
                <Wallet />
                <span>Wallet</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/history">
              <SidebarMenuButton isActive={activeItem === 'history'} tooltip="History">
                <HistoryIcon />
                <span>History</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative m-2 flex w-[calc(100%-1rem)] items-center justify-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://avatar.vercel.sh/${emailForAvatar}.png`} alt="User avatar" />
                <AvatarFallback>{emailForAvatar.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="font-medium">{displayName}</div>
                <div className="text-xs text-muted-foreground">View Profile</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
};

const cleanTxTitle = (tType: string, desc?: string | null, metadata?: any | null) => {
  const type = normType(tType);
  const d = String(desc || '').trim();

  // ✅ if metadata contains a title, prefer it
  const metaTitle = String(metadata?.title || '').trim();
  if (metaTitle) return metaTitle;

  // ✅ normalize common types
  if (type === 'invite_bonus' || type === 'referral_bonus') return 'Invite Bonus';
  if (type === 'data_purchase') return 'Data Purchase';
  if (type === 'airtime_purchase') return 'Airtime Purchase';

  if (!d) return type || 'transaction';
  if (type === 'bonus' && d.toLowerCase().includes('signup bonus')) return 'Signup Bonus';
  return d;
};

const TransactionList = () => {
  const userId = useSupabaseSessionUser();
  const { row: userRow, loading: userLoading } = useSupabaseUserRow(userId);

  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { format, convert } = useCurrencyConverter(userRow?.currency || 'NGN');

  const loadTx = async () => {
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ load transactions error:', error);
      setTxs([]);
    } else {
      setTxs((data as TxRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`tx-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, () => loadTx())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading || userLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border p-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!txs || txs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
        <HistoryIcon className="h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-semibold">No Transactions Found</h3>
        <p className="mt-1 text-xs text-muted-foreground">Your transaction history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {txs.map((t) => {
        const tType = normType(t.transaction_type);

        // ✅ FIX: treat invite bonus as CREDIT too
        const isCredit = ['deposit', 'bonus', 'profit', 'refund', 'invite_bonus', 'referral_bonus'].includes(tType);

        const amountNGN = Number(t.amount || 0);
        const amountUser = convert(amountNGN);

        const receiptHref = `/history/receipt/${t.id}`;

        return (
          <Link key={t.id} href={receiptHref} className="block">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('rounded-lg border p-2 transition', 'hover:bg-muted/30 hover:border-primary/30 active:scale-[0.998]')}
            >
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-muted p-1.5">{getTransactionIcon(tType)}</div>

                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium capitalize">
                    {cleanTxTitle(tType, t.description, t.metadata)}
                  </div>

                  <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                    <span>{formatDate(t.created_at)}</span>
                    <span className="opacity-70">•</span>
                    <span className="opacity-80">Tap to view receipt</span>
                  </div>
                </div>

                <Badge className="capitalize text-[10px] px-2 py-0.5" variant={getStatusBadgeVariant(t.status as any)}>
                  {t.status}
                </Badge>
              </div>

              <div
                className={cn(
                  'mt-1 rounded-md px-2 py-1 text-right text-xs font-semibold',
                  isCredit
                    ? 'bg-green-100/60 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-red-100/60 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                )}
              >
                {isCredit ? '+' : '-'}
                {format(amountUser)}
                <div className="mt-0.5 text-[10px] text-muted-foreground">Base: {formatNGN(amountNGN)}</div>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};

const CompletedOnlyBanner = () => {
  return (
    <motion.div
      className="mb-3 rounded-lg border px-3 py-2"
      animate={{
        opacity: [0, 1, 1, 0],
        backgroundColor: ['rgba(59,130,246,0.12)', 'rgba(16,185,129,0.12)', 'rgba(236,72,153,0.12)', 'rgba(245,158,11,0.16)'],
        borderColor: ['rgba(59,130,246,0.30)', 'rgba(16,185,129,0.30)', 'rgba(236,72,153,0.30)', 'rgba(245,158,11,0.30)'],
      }}
      transition={{ duration: 4, times: [0, 0.25, 0.75, 1], ease: 'easeInOut', repeat: Infinity }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold">
          ✅ Investments tab shows <span className="underline">COMPLETED</span> only
        </div>
        <Badge variant="secondary" className="capitalize text-[10px] px-2 py-0.5">
          Completed
        </Badge>
      </div>
    </motion.div>
  );
};

const InvestmentList = () => {
  const userId = useSupabaseSessionUser();
  const { row: userRow, loading: userLoading } = useSupabaseUserRow(userId);

  const [items, setItems] = useState<InvestmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { format, convert } = useCurrencyConverter(userRow?.currency || 'NGN');

  const loadInvestments = async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.schema('public').from('investments').select('*').eq('user_id', userId).order('created_at', { ascending: false });

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${userId}` }, () => loadInvestments())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const completedItems = useMemo(() => {
    const now = Date.now();
    return (items || []).filter((inv) => {
      const status = String(inv.status || '').toLowerCase();
      const endsAtMs = inv.ends_at ? new Date(inv.ends_at).getTime() : NaN;
      return status === 'completed' || (Number.isFinite(endsAtMs) && endsAtMs <= now);
    });
  }, [items]);

  const calcProgress = (startedAt?: string | null, endsAt?: string | null) => {
    if (!startedAt || !endsAt) return { pct: 100, day: 0, total: 0 };
    const start = new Date(startedAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { pct: 100, day: 0, total: 0 };
    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return { pct: 100, day: totalDays, total: totalDays };
  };

  if (loading || userLoading) {
    return (
      <div className="space-y-3">
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

  if (!completedItems || completedItems.length === 0) {
    return (
      <>
        <CompletedOnlyBanner />
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">NO COMPLETED INVESTMENTS</h3>
          <p className="mt-1 text-xs text-muted-foreground">Completed investments will appear here after your plan ends.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <CompletedOnlyBanner />
      <div className="space-y-3">
        {completedItems.map((inv) => {
          const { pct, day, total } = calcProgress(inv.started_at, inv.ends_at);

          const investedUser = convert(Number(inv.amount || 0));
          const dailyUser = convert(Number(inv.daily_profit || 0));
          const totalReturnUser = convert(Number(inv.total_return || 0));

          return (
            <Card key={inv.id}>
              <CardHeader className="flex-row items-center justify-between p-3">
                <CardTitle className="text-sm">{inv.plan_name || 'Investment'}</CardTitle>
                <Badge variant="secondary" className="capitalize text-[10px] px-2 py-0.5">
                  completed
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="font-semibold">Invested</div>
                  <div className="text-right font-mono">{format(investedUser)}</div>

                  <div className="font-semibold">Daily Profit</div>
                  <div className="text-right font-mono text-green-600">{format(dailyUser)}</div>

                  <div className="font-semibold">Total Return</div>
                  <div className="text-right font-mono">{format(totalReturnUser)}</div>

                  <div className="font-semibold">Started</div>
                  <div className="text-right">{formatDate(inv.started_at)}</div>

                  <div className="font-semibold">Ended</div>
                  <div className="text-right">{formatDate(inv.ends_at)}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progress</span>
                    <span>
                      Day {day} of {total}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
};

const HistoryPage: NextPage = () => {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full flex-col">
          <Sidebar collapsible="icon">
            <SidebarNav />
          </Sidebar>

          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <DashboardHeader />

            <main className="flex-1 p-4 sm:px-6 sm:py-0">
              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                  <CardDescription>View your transaction and investment history.</CardDescription>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="transactions">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="transactions">Transactions</TabsTrigger>
                      <TabsTrigger value="investments">Investments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transactions" className="mt-4">
                      <TransactionList />
                    </TabsContent>

                    <TabsContent value="investments" className="mt-4">
                      <InvestmentList />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default HistoryPage;
