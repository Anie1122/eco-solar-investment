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
  History,
  LayoutGrid,
  LogOut,
  Settings,
  Sun,
  TrendingUp,
  User,
  Wallet,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvestmentPlans from '@/components/investment-plans';
import AuthGuard from '@/components/auth-guard';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/notification-bell';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { queueStartupSplash } from '@/lib/startup-transition';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  country: string | null;
  currency: string | null;
  profile_completed: boolean | null;
  status: string | null;
};

function useSupabaseUserRow() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);

  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      setSessionUserId(user?.id ?? null);

      unsub = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSessionUserId(newSession?.user?.id ?? null);
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
        setUserRow(null);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id,email,full_name,country,currency,profile_completed,status')
        .eq('id', sessionUserId)
        .maybeSingle();

      if (error) {
        console.error('❌ Failed to load header user row:', error);
        setUserRow(null);
        return;
      }

      setUserRow((data as UserRow) ?? null);
    };

    run();
  }, [sessionUserId]);

  return useMemo(() => ({ sessionUserId, userRow }), [sessionUserId, userRow]);
}

const DashboardHeader = () => {
  const router = useRouter();
  const { userRow } = useSupabaseUserRow();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    queueStartupSplash('logout');
    router.push('/login');
  };

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
          <DropdownMenuItem onClick={handleLogout}>
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
  const activeItem = 'investments';
  const { userRow } = useSupabaseUserRow();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    queueStartupSplash('logout');
    router.push('/login');
  };

  const displayName = userRow?.full_name || userRow?.email || 'Account';
  const emailForAvatar = userRow?.email || 'user';

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

const InvestmentsPage: NextPage = () => {
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
                  <CardTitle>Solar Investment Plans</CardTitle>
                  <p className="text-muted-foreground">Choose a plan to start earning weekly profits.</p>
                </CardHeader>
                <CardContent>
                  <InvestmentPlans />
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default InvestmentsPage;
