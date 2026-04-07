'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader, Lock, Mail, Sparkles } from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import AppLogo from '@/components/app-logo';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

function RollingTape() {
  return (
    <div className="w-full overflow-hidden rounded-xl bg-primary shadow-sm border border-primary/30">
      <div className="whitespace-nowrap py-2">
        <div className="inline-flex animate-[marquee_10s_linear_infinite]">
          <span className="mx-6 text-white/95 font-extrabold tracking-wide">
            ✨ WELCOME TO ECO-SOLAR-INVESTMENTS ✨
          </span>
          <span className="mx-6 text-white/95 font-extrabold tracking-wide">
            ✨ WELCOME TO ECO-SOLAR-INVESTMENTS ✨
          </span>
          <span className="mx-6 text-white/95 font-extrabold tracking-wide">
            ✨ WELCOME TO ECO-SOLAR-INVESTMENTS ✨
          </span>
          <span className="mx-6 text-white/95 font-extrabold tracking-wide">
            ✨ WELCOME TO ECO-SOLAR-INVESTMENTS ✨
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

function GlowBG() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_60%)]" />
    </div>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  });

  const emailValue = form.watch('email');
  const greeting = useMemo(() => {
    const e = (emailValue || '').trim();
    if (!e.includes('@')) return 'Welcome back';
    return `Welcome back, ${e.split('@')[0]}`;
  }, [emailValue]);

  async function onEmailSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const normalizedEmail = values.email.trim().toLowerCase();

      // Attempt admin login first so admins can use the same login form/button.
      const adminRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: values.password }),
      });

      if (adminRes.ok) {
        router.push('/admin/deposits');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: values.password,
      });

      if (error) {
        const msg =
          error.message.toLowerCase().includes('invalid') ||
          error.message.toLowerCase().includes('credentials')
            ? 'Invalid email or password.'
            : `Login failed: ${error.message}`;

        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: msg,
        });
        setLoading(false);
        return;
      }

      router.refresh();
      router.replace('/');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err?.message || 'An unexpected error occurred.',
      });
      setLoading(false);
    }
  }

  async function onForgotPasswordSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setResetLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
        redirectTo: redirectUrl,
        // @ts-ignore
        emailRedirectTo: redirectUrl,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Request Failed',
          description: `Failed to send email: ${error.message}`,
        });
        setResetLoading(false);
        return;
      }

      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for a link to reset your password.',
      });

      setDialogOpen(false);
      forgotPasswordForm.reset({ email: values.email.trim() });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: err?.message || 'An unexpected error occurred.',
      });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <GlowBG />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <motion.div
          className="mb-5 flex flex-col items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="flex flex-col items-center"
          >
            <AppLogo logoSize={130} />
          </motion.div>

          <div className="mt-4 w-full">
            <RollingTape />
          </div>
        </motion.div>

        <Card className="border-primary/15 shadow-xl rounded-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/60" />

          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{greeting}</CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Secure login
              </div>
            </div>
            <CardDescription>Enter your details to continue to your dashboard.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Email</FormLabel>
                      <FormControl>
                        <motion.div
                          whileFocusWithin={{ scale: 1.01 }}
                          transition={{ duration: 0.12 }}
                          className="relative"
                        >
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="m@example.com"
                            {...field}
                            disabled={loading}
                            className="pl-10 rounded-xl"
                          />
                        </motion.div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start justify-between gap-3">
                        <FormLabel className="text-xs pt-1">Password</FormLabel>

                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="link"
                              type="button"
                              className="h-auto p-0 text-xs text-primary"
                            >
                              Forgot password?
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="rounded-2xl">
                            <DialogHeader>
                              <DialogTitle>Reset Password</DialogTitle>
                              <DialogDescription>
                                Enter your email and we’ll send you a reset link.
                              </DialogDescription>
                            </DialogHeader>

                            {/* ✅ IMPORTANT INFO TEXT */}
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                              <span className="font-semibold">IMPORTANT:</span>{' '}
                              IF MESSAGE DOES NOT APPEAR IN G-MAIL INBOX, CHECK SPAM FOLDER INSIDE YOUR G-MAIL
                            </div>

                            <Form {...forgotPasswordForm}>
                              <form
                                onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
                                className="space-y-4"
                              >
                                <FormField
                                  control={forgotPasswordForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Email</FormLabel>
                                      <FormControl>
                                        <motion.div
                                          whileFocusWithin={{ scale: 1.01 }}
                                          transition={{ duration: 0.12 }}
                                          className="relative"
                                        >
                                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                          <Input
                                            placeholder="m@example.com"
                                            {...field}
                                            disabled={resetLoading}
                                            className="pl-10 rounded-xl"
                                          />
                                        </motion.div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <DialogFooter>
                                  <motion.div whileTap={{ scale: 0.99 }} className="w-full">
                                    <Button
                                      type="submit"
                                      disabled={resetLoading}
                                      className="w-full rounded-xl"
                                    >
                                      {resetLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                      Send Reset Link
                                    </Button>
                                  </motion.div>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <FormControl>
                        <motion.div
                          whileFocusWithin={{ scale: 1.01 }}
                          transition={{ duration: 0.12 }}
                          className="relative"
                        >
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            disabled={loading}
                            className="pl-10 rounded-xl"
                          />
                        </motion.div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }}>
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={loading || !form.formState.isValid}
                  >
                    {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>
                </motion.div>
              </form>
            </Form>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

        <motion.p
          className="mt-5 text-center text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          By continuing you agree to our platform policies.
        </motion.p>
      </motion.div>
    </div>
  );
}
