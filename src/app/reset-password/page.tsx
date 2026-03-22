'use client';

import { useState, useEffect } from 'react';
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sun, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';

const formSchema = z
  .object({
    newPassword: z.string().min(6, {
      message: 'Password must be at least 6 characters.',
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

async function safeCreateNotification(userId: string) {
  const nowIso = new Date().toISOString();

  // Try full insert (in case you have extra columns)
  const first = await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Password Changed',
    message: 'Your password was successfully changed.',
    type: 'success',
    is_read: false,
    created_at: nowIso,
    metadata: { kind: 'password_changed' },
  } as any);

  if (!first.error) return;

  // Fallback minimal insert (if optional columns do not exist)
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Password Changed',
    message: 'Your password was successfully changed.',
    type: 'success',
    is_read: false,
    created_at: nowIso,
  } as any);
}

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  // ✅ Check if recovery session exists
  useEffect(() => {
    const checkRecovery = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setError('Invalid or expired password reset link.');
      }

      setCheckingSession(false);
    };

    checkRecovery();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) throw error;

      setSuccess(true);

      toast({
        title: 'Password Reset Successful',
        description: 'You can now log in with your new password.',
      });

      // ✅ Create notification (only if session exists)
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        await safeCreateNotification(uid);
      }

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');

      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description: err.message || 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <motion.div
        className="mb-8 flex items-center gap-2 text-primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Sun className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Eco Solar Investment</h1>
      </motion.div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {checkingSession && 'Verifying reset link...'}
            {error && 'There was a problem'}
            {!checkingSession && !error && !success && 'Enter your new password below.'}
            {success && 'Your password has been changed.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {checkingSession && (
            <div className="flex justify-center items-center p-8">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 p-4 space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
              <p>{error}</p>
              <Button asChild>
                <Link href="/login">Return to Login</Link>
              </Button>
            </div>
          )}

          {success && (
            <div className="text-center text-green-500 p-4 space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto" />
              <p>Password successfully reset.</p>
            </div>
          )}

          {!checkingSession && !error && !success && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Set New Password
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
