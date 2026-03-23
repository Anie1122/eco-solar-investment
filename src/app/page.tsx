'use client';

import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  ChevronDown,
  History,
  LayoutGrid,
  LogOut,
  Settings,
  Sun,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';

import WalletCard from '@/components/wallet-card';
import AiSuggestionCard from '@/components/ai-suggestion-card';
import TransactionHistory from '@/components/transaction-history';
import AuthGuard from '@/components/auth-guard';
import NotificationBell from '@/components/notification-bell';

import { supabase } from '@/lib/supabaseClient';
import type { User as UserEntity } from '@/lib/types';

import PolicyGate from '@/components/policy-gate';
import LiveCryptoTicker from '@/components/live-crypto-ticker';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  country: string | null;
  currency: string | null;
  wallet_balance: number | null;
  bonus_balance: number | null;
  profile_completed: boolean | null;
  status: string | null;
  created_at?: string | null;
  has_invested?: boolean | null;
  withdrawal_account?: any | null;
  policy_accepted?: boolean | null;
};

function mapUserRowToEntity(row: UserRow): UserEntity {
  return {
    id: row.id,
    fullName: row.full_name ?? '',
    email: row.email ?? '',
    photoURL: '',
    country: row.country ?? '',
    currency: row.currency ?? 'USDT',
    phoneNumber: row.phone_number ?? '',
    walletBalance: Number(row.wallet_balance ?? 0),
    bonusBalance: Number(row.bonus_balance ?? 1.5),
    hasInvested: Boolean(row.has_invested ?? false),
    profileCompleted: Boolean(row.profile_completed ?? false),
    status: (row.status ?? 'active') as any,
    createdAt: row.created_at as any,
    withdrawalAccount: (row.withdrawal_account ?? null) as any,
  } as UserEntity;
}

const DashboardSkeleton = () => (
  <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="sm:col-span-2 h-[250px]" />
        <Skeleton className="sm:col-span-2 h-[250px]" />
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  </div>
);

const DashboardHeader = ({
  userProfile,
  authEmail,
  onLogout,
}: {
  userProfile: UserEntity | null;
  authEmail: string | null;
  onLogout: () => Promise<void>;
}) => {
  const router = useRouter();

  const appName = 'Eco Solar Investment';
  const sentence = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { delay: 0.5, staggerChildren: 0.08 },
    },
  };

  const letter = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
  };

  const displayName = userProfile?.fullName || authEmail || 'Account';

  // ✅ FIXED: url must be inside backticks
  const avatarSrc =
    userProfile?.photoURL ||
    (authEmail ? `https://avatar.vercel.sh/${authEmail}.png` : undefined);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="sm:hidden" />

      <motion.div
        className="hidden items-center gap-2 text-xl font-bold md:flex"
        variants={sentence}
        initial="hidden"
        animate="visible"
      >
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
              <AvatarImage src={avatarSrc} alt="User avatar" />
              <AvatarFallback>
                {(authEmail || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
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
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

const SidebarNav = ({
  userProfile,
  authEmail,
  onLogout,
}: {
  userProfile: UserEntity | null;
  authEmail: string | null;
  onLogout: () => Promise<void>;
}) => {
  const router = useRouter();
  const activeItem = 'dashboard';

  const displayName = userProfile?.fullName || authEmail || 'Account';

  // ✅ FIXED: url must be inside backticks
  const avatarSrc =
    userProfile?.photoURL ||
    (authEmail ? `https://avatar.vercel.sh/${authEmail}.png` : undefined);

  return (
    <>
      <SidebarHeader className="border-b">
        <motion.div
          className="flex items-center gap-2 p-2"
          animate={{
            scale: [1, 1.02, 1],
            transition: { duration: 2, ease: 'easeInOut', repeat: Infinity },
          }}
        >
          <Sun className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Eco Solar Investment</h1>
        </motion.div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/">
              <SidebarMenuButton
                isActive={activeItem === 'dashboard'}
                tooltip="Dashboard"
              >
                <LayoutGrid />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/investments">
              <SidebarMenuButton
                isActive={activeItem === 'investments'}
                tooltip="Investments"
              >
                <TrendingUp />
                <span>Investments</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/wallet">
              <SidebarMenuButton
                isActive={activeItem === 'wallet'}
                tooltip="Wallet"
              >
                <Wallet />
                <span>Wallet</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <Link href="/history">
              <SidebarMenuButton
                isActive={activeItem === 'history'}
                tooltip="History"
              >
                <History />
                <span>History</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative m-2 flex w-[calc(100%-1rem)] items-center justify-start gap-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarSrc} alt="User avatar" />
                <AvatarFallback>
                  {(authEmail || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
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
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
};

const Home: NextPage = () => {
  const router = useRouter();

  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserEntity | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [policyDismissed, setPolicyDismissed] = useState(false);

  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null =
      null;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      setSessionUserId(user?.id ?? null);
      setAuthEmail(user?.email ?? null);
      setAuthLoading(false);

      unsub = supabase.auth.onAuthStateChange((_event, newSession) => {
        const newUser = newSession?.user ?? null;
        setSessionUserId(newUser?.id ?? null);
        setAuthEmail(newUser?.email ?? null);
        setAuthLoading(false);
      });
    };

    run();

    return () => {
      if (unsub) unsub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!sessionUserId) {
        setUserProfile(null);
        setPolicyAccepted(false);
        return;
      }

      setProfileLoading(true);

      const { data: row, error } = await supabase
        .from('users')
        .select('*, policy_accepted')
        .eq('id', sessionUserId)
        .maybeSingle();

      if (error) {
        console.error('❌ Failed to load profile:', error);
        setUserProfile(null);
        setPolicyAccepted(false);
        setProfileLoading(false);
        return;
      }

      setUserProfile(row ? mapUserRowToEntity(row as UserRow) : null);
      setPolicyAccepted(Boolean((row as any)?.policy_accepted ?? false));
      setProfileLoading(false);
    };

    run();
  }, [sessionUserId]);

  useEffect(() => {
    try {
      if (!sessionUserId) {
        setPolicyDismissed(false);
        return;
      }

      const key = `eco_policy_dismissed_at:${sessionUserId}`;
      const raw = localStorage.getItem(key);
      const ts = raw ? Number(raw) : 0;

      const within24h = ts > 0 && Date.now() - ts < 24 * 60 * 60 * 1000;
      setPolicyDismissed(within24h);
    } catch {
      setPolicyDismissed(false);
    }
  }, [sessionUserId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    router.push('/login');
  };

  const isLoading = authLoading || profileLoading;

  const shouldShowPolicy =
    Boolean(sessionUserId) && !policyAccepted && !policyDismissed;

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full flex-col">
          {shouldShowPolicy && sessionUserId && (
            <PolicyGate
              userId={sessionUserId}
              onAccepted={() => setPolicyAccepted(true)}
              onDismiss={() => {
                try {
                  const key = `eco_policy_dismissed_at:${sessionUserId}`;
                  localStorage.setItem(key, String(Date.now()));
                } catch {}
                setPolicyDismissed(true);
              }}
            />
          )}

          <Sidebar collapsible="icon">
            <SidebarNav
              userProfile={userProfile}
              authEmail={authEmail}
              onLogout={handleLogout}
            />
          </Sidebar>

          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <DashboardHeader
              userProfile={userProfile}
              authEmail={authEmail}
              onLogout={handleLogout}
            />

            <main>
              {isLoading ? (
                <DashboardSkeleton />
              ) : (
                <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                  <div className="grid auto-rows-max items-start gap-4 md:gap-8">
                    <LiveCryptoTicker />
                    <motion.div
                      className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <WalletCard userProfile={userProfile} isLoading={isLoading} />
                      <AiSuggestionCard userProfile={userProfile} isLoading={isLoading} />
                    </motion.div>

                    <TransactionHistory />
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default Home;
