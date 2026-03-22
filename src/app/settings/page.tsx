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
  Loader,
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

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import AuthGuard from '@/components/auth-guard';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import NotificationBell from '@/components/notification-bell';
import CurrencySwitcher from '@/components/currency-switcher';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { supabase } from '@/lib/supabaseClient';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  currency?: string | null;
};

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
});

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

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setRow(null);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id,email,full_name,currency')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ load user row error:', error);
        setRow(null);
      } else {
        setRow((data as UserRow) ?? null);
      }
    };

    run();
  }, [userId]);

  return row;
}

const DashboardHeader = () => {
  const router = useRouter();
  const userId = useSupabaseSessionUser();
  const row = useSupabaseUserRow(userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    router.push('/login');
  };

  const appName = 'Eco Solar Investment';
  const sentence = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { delay: 0.5, staggerChildren: 0.08 } } };
  const letter = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 } };

  const displayName = row?.full_name || row?.email || 'Account';
  const emailForAvatar = row?.email || 'user';

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
  const activeItem = 'settings';
  const userId = useSupabaseSessionUser();
  const row = useSupabaseUserRow(userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    router.push('/login');
  };

  const displayName = row?.full_name || row?.email || 'Account';
  const emailForAvatar = row?.email || 'user';

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

const SettingsPage: NextPage = () => {
  const userId = useSupabaseSessionUser();
  const row = useSupabaseUserRow(userId);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const handleLogout = async (router: any) => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.clear();
    router.push('/login');
  };

  const router = useRouter();

  const onSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!row?.email) return;

    setLoading(true);
    try {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: row.email,
        password: values.currentPassword,
      });
      if (reauthErr) throw reauthErr;

      const { error: updateErr } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (updateErr) throw updateErr;

      toast({ title: 'Password Updated', description: 'Your password has been successfully changed.' });
      form.reset();
      setDialogOpen(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e?.message || 'Could not update password. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!row?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'No email found.' });
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(row.email, {
        redirectTo: redirectUrl,
        // @ts-ignore
        emailRedirectTo: redirectUrl,
      });
      if (error) throw error;

      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox (and spam) for the reset link.',
      });

      await handleLogout(router);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: e?.message || 'Could not send reset email.',
      });
    }
  };

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full flex-col">
          <Sidebar collapsible="icon">
            <SidebarNav />
          </Sidebar>

          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
            <DashboardHeader />

            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Manage your account settings.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>Change Password</Button>
                      </DialogTrigger>

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Password</DialogTitle>
                          <DialogDescription>Enter your current and new password.</DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={loading}>
                                  Cancel
                                </Button>
                              </DialogClose>

                              <Button type="submit" disabled={loading}>
                                {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">Reset Password</Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div>
                              A password reset link will be sent to your email ({row?.email || 'your email'}). You will be logged out after sending it.
                              <p className="mt-4 rounded-md bg-destructive/10 p-3 font-semibold text-destructive">
                                If the message does not appear in your inbox, kindly check your spam folder.
                              </p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSendResetEmail}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {userId ? (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                      <h3 className="mb-2 text-sm font-semibold">Trading Preferences</h3>
                      <CurrencySwitcher userId={userId} value={row?.currency} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};

export default SettingsPage;
