'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import AppLogo from '@/components/app-logo';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  inviteCode: z.string().optional(),
});

function RollingTape() {
  return (
    <div className="w-full overflow-hidden rounded-lg bg-primary shadow-sm border border-primary/60">
      <div className="whitespace-nowrap py-2">
        <div className="inline-flex animate-[marquee_10s_linear_infinite]">
          <span className="mx-6 text-white font-extrabold tracking-wide">
            ! WELCOME TO ECO-SOLAR-INVESTMENTS!
          </span>
          <span className="mx-6 text-white font-extrabold tracking-wide">
            ! WELCOME TO ECO-SOLAR-INVESTMENTS!
          </span>
          <span className="mx-6 text-white font-extrabold tracking-wide">
            ! WELCOME TO ECO-SOLAR-INVESTMENTS!
          </span>
          <span className="mx-6 text-white font-extrabold tracking-wide">
            ! WELCOME TO ECO-SOLAR-INVESTMENTS!
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

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const searchParams = useSearchParams();
  const refFromLink = (searchParams.get('ref') ?? '').trim().toUpperCase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      inviteCode: refFromLink || '',
    },
  });

  useEffect(() => {
    if (refFromLink) form.setValue('inviteCode', refFromLink);
  }, [refFromLink, form]);

  async function onEmailSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const email = values.email.trim().toLowerCase();
      const fullName = values.fullName.trim();
      const inviteCode = (values.inviteCode ?? '').trim().toUpperCase() || null;

      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: { full_name: fullName, ref: inviteCode },
        },
      });

      if (error) {
        const msg =
          error.message.toLowerCase().includes('already') ||
          error.message.toLowerCase().includes('registered')
            ? 'This email is already registered. Please login instead.'
            : `Registration failed: ${error.message}`;

        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: msg,
        });
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: 'Account created but user ID is missing. Please try again or login.',
        });
        return;
      }

      const ensureRes = await fetch('/api/users/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, fullName }),
      });

      const ensureData = await ensureRes.json().catch(() => ({}));

      if (!ensureRes.ok) {
        toast({
          variant: 'destructive',
          title: 'Profile Setup Failed',
          description:
            ensureData?.message ||
            'Account created but profile could not be initialized. Please try again.',
        });
        return;
      }

      if (inviteCode) {
        try {
          await fetch('/api/referrals/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newUserId: userId, refCode: inviteCode }),
          });
        } catch (e) {
          console.warn('Referral award call failed (ignored):', e);
        }
      }

      toast({
        title: 'Registration Successful',
        description: 'Your account has been created. Please complete your profile.',
      });

      router.refresh();
      router.replace('/complete-profile');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: err?.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
        <motion.div
          className="w-full max-w-sm space-y-4"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* ✅ BIG LOGO + TAPE (same as login) */}
          <div className="flex flex-col items-center">
            <AppLogo logoSize={140} />
            <div className="mt-4 w-full">
              <RollingTape />
            </div>
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription>Enter your details to get started.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="m@example.com" {...field} disabled={loading} />
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inviteCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Code (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. XA9J8MT3" {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </Form>
            </CardContent>

            <CardFooter>
              <div className="mt-4 text-center text-sm w-full">
                Already have an account?{' '}
                <Link href="/login" className="underline">
                  Login
                </Link>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </AuthGuard>
  );
}
