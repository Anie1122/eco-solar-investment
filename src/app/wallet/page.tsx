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
import AuthGuard from '@/components/auth-guard';
import { useAuth, useFirebase, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User as UserEntity } from '@/lib/types';
import WalletCard from '@/components/wallet-card';
import NotificationBell from '@/components/notification-bell';
import { motion } from 'framer-motion';
import { useCurrencyConverter } from '@/lib/currency';

const DashboardHeader = () => {
  const { user, firestore } = useFirebase();
  const auth = useAuth();
  const router = useRouter();
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<UserEntity>(userDocRef);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.clear();
    localStorage.clear();
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
              <AvatarImage
                src={userData?.photoURL || `https://avatar.vercel.sh/${user?.email}.png`}
                alt="User avatar"
              />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block">
              {userData?.fullName || user?.displayName || user?.email}
            </span>
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
  const activeItem = 'wallet';
  const { user, firestore } = useFirebase();
  const auth = useAuth();
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<UserEntity>(userDocRef);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.clear();
    localStorage.clear();
    router.push('/login');
  };

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
            <Button
              variant="ghost"
              className="relative m-2 flex w-[calc(100%-1rem)] items-center justify-start gap-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={userData?.photoURL || `https://avatar.vercel.sh/${user?.email}.png`}
                  alt="User avatar"
                />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="text-left">
                <div className="font-medium">{userData?.fullName || user?.displayName || user?.email}</div>
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

const WalletPage: NextPage = () => {
  const { firestore, user } = useFirebase();
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading } = useDoc<UserEntity>(userDocRef);

  // ✅ Convert USDT base balances → user currency BEFORE passing to WalletCard
  const currency = (userData as any)?.currency || 'USDT';
  const { convert } = useCurrencyConverter(currency);

  const walletNGN =
    Number((userData as any)?.wallet_balance ?? (userData as any)?.walletBalance ?? 0) || 0;
  const bonusNGN =
    Number((userData as any)?.bonus_balance ?? (userData as any)?.bonusBalance ?? 0) || 0;

  // IMPORTANT: We only convert for DISPLAY. DB stays USDT base.
  const walletDisplay = convert(walletNGN);
  const bonusDisplay = convert(bonusNGN);

  const patchedUserData = userData
    ? ({
        ...(userData as any),
        // cover both common naming styles so WalletCard will read the converted value
        wallet_balance: walletDisplay,
        bonus_balance: bonusDisplay,
        walletBalance: walletDisplay,
        bonusBalance: bonusDisplay,
        // keep the user currency as-is (WalletCard should show PKR/USD/etc)
        currency,
        // optional debug flag
        __displayConverted: true,
      } as UserEntity)
    : userData;

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
              <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <WalletCard userProfile={patchedUserData} isLoading={isLoading} />
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default WalletPage;
