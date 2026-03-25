'use client';

import type { NextPage } from 'next';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronDown,
  Loader,
  LogOut,
  Settings,
  Sun,
  User,
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
const setPinFormSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits.'),
    confirmPin: z.string().regex(/^\d{4}$/, 'Confirm PIN must be exactly 4 digits.'),
  })
  .refine((v) => v.pin === v.confirmPin, {
    path: ['confirmPin'],
    message: 'PINs do not match.',
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
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('eco_'))
        .forEach((key) => sessionStorage.removeItem(key));
      Object.keys(localStorage)
        .filter((key) => key.startsWith('eco_'))
        .forEach((key) => localStorage.removeItem(key));
    } catch {}
    router.push('/login');
  };

  const appName = 'Eco Solar Investment';
  const sentence = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { delay: 0.5, staggerChildren: 0.08 } } };
  const letter = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 } };

  const displayName = row?.full_name || row?.email || 'Account';
  const emailForAvatar = row?.email || 'user';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
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

const SettingsPage: NextPage = () => {
  const userId = useSupabaseSessionUser();
  const row = useSupabaseUserRow(userId);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [forgotPinOpen, setForgotPinOpen] = useState(false);
  const [forgotPinBusy, setForgotPinBusy] = useState(false);
  const [setPinOpen, setSetPinOpen] = useState(false);
  const [setPinBusy, setSetPinBusy] = useState(false);

  const form = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const forgotPinForm = useForm<{ password: string }>({
    defaultValues: { password: '' },
    mode: 'onChange',
  });
  const setPinForm = useForm<z.infer<typeof setPinFormSchema>>({
    resolver: zodResolver(setPinFormSchema),
    defaultValues: { pin: '', confirmPin: '' },
    mode: 'onChange',
  });

  const handleLogout = async (router: any) => {
    await supabase.auth.signOut();
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('eco_'))
        .forEach((key) => sessionStorage.removeItem(key));
      Object.keys(localStorage)
        .filter((key) => key.startsWith('eco_'))
        .forEach((key) => localStorage.removeItem(key));
    } catch {}
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

  const clearWithdrawalPin = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Session expired. Please log in again.');

    const res = await fetch('/api/withdrawal-pin/clear', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) throw new Error(json?.message || 'Could not reset transaction PIN.');
  };

  const setWithdrawalPin = async (pin: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Session expired. Please log in again.');

    const res = await fetch('/api/withdrawal-pin/set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pin }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) throw new Error(json?.message || 'Could not set new transaction PIN.');
  };

  const handleForgotPin = async (values: { password: string }) => {
    if (!row?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'No email found.' });
      return;
    }

    setForgotPinBusy(true);
    try {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: row.email,
        password: values.password,
      });
      if (reauthErr) throw reauthErr;

      await clearWithdrawalPin();

      toast({
        title: 'Old PIN Cleared',
        description: 'Please create your new 4-digit transaction PIN now.',
      });

      forgotPinForm.reset({ password: '' });
      setForgotPinOpen(false);
      setSetPinOpen(true);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: e?.message || 'Could not reset transaction PIN.',
      });
    } finally {
      setForgotPinBusy(false);
    }
  };

  const handleSetNewPin = async (values: z.infer<typeof setPinFormSchema>) => {
    setSetPinBusy(true);
    try {
      await setWithdrawalPin(values.pin);
      toast({
        title: 'PIN Created',
        description: 'Your new 4-digit transaction PIN is now active.',
      });
      setPinForm.reset({ pin: '', confirmPin: '' });
      setSetPinOpen(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'PIN Setup Failed',
        description: e?.message || 'Could not set new transaction PIN.',
      });
    } finally {
      setSetPinBusy(false);
    }
  };

  return (
    <AuthGuard>
        <div className="flex min-h-screen w-full flex-col">
          <div className="flex flex-col sm:gap-4 sm:py-4">
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

                    <Dialog open={forgotPinOpen} onOpenChange={setForgotPinOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">Forgot 4-digit Transaction PIN</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset Transaction PIN</DialogTitle>
                          <DialogDescription>
                            Enter your account password to clear your current 4-digit transaction PIN.
                          </DialogDescription>
                        </DialogHeader>

                        <Form {...forgotPinForm}>
                          <form onSubmit={forgotPinForm.handleSubmit(handleForgotPin)} className="space-y-4">
                            <FormItem>
                              <FormLabel>Account Password</FormLabel>
                              <Input
                                type="password"
                                placeholder="Your password"
                                {...forgotPinForm.register('password', { required: true })}
                              />
                            </FormItem>

                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={forgotPinBusy}>
                                  Cancel
                                </Button>
                              </DialogClose>
                              <Button type="submit" disabled={forgotPinBusy}>
                                {forgotPinBusy && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Reset PIN
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <Dialog
                      open={setPinOpen}
                      onOpenChange={(open) => {
                        setSetPinOpen(open);
                        if (!open) setPinForm.reset({ pin: '', confirmPin: '' });
                      }}
                    >
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Transaction PIN</DialogTitle>
                          <DialogDescription>
                            Your old PIN was cleared. Set a new 4-digit transaction PIN now.
                          </DialogDescription>
                        </DialogHeader>

                        <Form {...setPinForm}>
                          <form onSubmit={setPinForm.handleSubmit(handleSetNewPin)} className="space-y-4">
                            <FormField
                              control={setPinForm.control}
                              name="pin"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New PIN</FormLabel>
                                  <FormControl>
                                    <Input
                                      inputMode="numeric"
                                      maxLength={4}
                                      placeholder="Enter 4 digits"
                                      {...field}
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        field.onChange(clean);
                                      }}
                                    />
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
                                    <Input
                                      inputMode="numeric"
                                      maxLength={4}
                                      placeholder="Re-enter 4 digits"
                                      {...field}
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        field.onChange(clean);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button type="submit" disabled={setPinBusy}>
                                {setPinBusy && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Save New PIN
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
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
    </AuthGuard>
  );
};

export default SettingsPage;
