'use client';

import Image from 'next/image';
import { investmentPlans } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { Loader, Zap, Lock } from 'lucide-react';
import type { InvestmentPlan as InvestmentPlanType } from '@/lib/types';
import { useCurrencyConverter } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  phone_number: string | null;
  country: string | null;
  currency: string | null;
  wallet_balance: number | null;
  bonus_balance: number | null;
  has_invested: boolean | null;
  profile_completed: boolean | null;
  status: string | null;
};

export default function InvestmentPlans() {
  const { toast } = useToast();
  const [investingPlanId, setInvestingPlanId] = useState<string | null>(null);

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // 1) get session user id + subscribe
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

  // 2) load user row from public.users
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingUser(true);

        if (!sessionUserId) {
          setUserRow(null);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUserId)
          .maybeSingle();

        if (error) {
          console.error('❌ Failed to load user row:', error);
          setUserRow(null);
          return;
        }

        setUserRow((data as UserRow) ?? null);
      } finally {
        setLoadingUser(false);
      }
    };

    run();
  }, [sessionUserId]);

  const currencyCode = userRow?.currency ?? 'USDT';
  const { convert, format } = useCurrencyConverter(currencyCode);

  const isProfileCompleted = Boolean(userRow?.profile_completed);

  const getImageForPlan = (index: number) => {
    return PlaceHolderImages[index % PlaceHolderImages.length];
  };

  const handleInvest = async (plan: InvestmentPlanType) => {
    if (!sessionUserId) {
      toast({
        variant: 'destructive',
        title: 'Login Required',
        description: 'Please login to invest.',
      });
      return;
    }

    if (!userRow) {
      toast({
        variant: 'destructive',
        title: 'Profile Error',
        description: 'Could not load your profile. Please refresh.',
      });
      return;
    }

    if (!isProfileCompleted) {
      toast({
        variant: 'destructive',
        title: 'Complete Profile',
        description: 'Please complete your profile before investing.',
      });
      return;
    }

    const investmentAmountInUserCurrency = convert(plan.amount);
    const walletBalance = Number(userRow.wallet_balance ?? 0);

    if (walletBalance < investmentAmountInUserCurrency) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `You need ${format(investmentAmountInUserCurrency)} to invest, but you only have ${format(walletBalance)}.`,
      });
      return;
    }

    setInvestingPlanId(plan.id);

    try {
      // Use Supabase session access token (NOT Firebase)
      const { data: sessData } = await supabase.auth.getSession();
      const accessToken = sessData.session?.access_token;

      const response = await fetch('/api/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ planId: plan.id }),
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      const result = isJson ? await response.json() : { message: await response.text() };

      if (!response.ok) {
        throw new Error(result.message || 'Investment failed to process.');
      }

      toast({
        title: 'Investment Successful!',
        description: `You are now invested in ${plan.name}.`,
      });

      // Refresh profile after invest (wallet balance / has_invested may change)
      const { data: refreshed, error: refreshErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionUserId)
        .maybeSingle();

      if (!refreshErr) setUserRow((refreshed as UserRow) ?? null);
    } catch (error: any) {
      console.error('Investment Error:', error);
      toast({
        variant: 'destructive',
        title: 'Investment Failed',
        description: error?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setInvestingPlanId(null);
    }
  };

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <motion.div
      className="grid gap-4 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {investmentPlans.map((plan, index) => {
        const placeholder = getImageForPlan(index);
        const isInvesting = investingPlanId === plan.id;

        const investmentAmountInUserCurrency = userRow ? convert(plan.amount) : 0;

        const disabledBecauseProfile =
          !loadingUser && !!sessionUserId && !isProfileCompleted;

        const disabled =
          loadingUser ||
          !sessionUserId ||
          !userRow ||
          disabledBecauseProfile ||
          isInvesting;

        return (
          <motion.div key={plan.id} variants={itemVariants}>
            <Card className="flex h-full flex-col overflow-hidden transition-all hover:shadow-lg">
              <CardHeader className="relative h-48 w-full p-0">
                {placeholder && (
                  <Image
                    src={placeholder.imageUrl}
                    alt={placeholder.description}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    data-ai-hint={placeholder.imageHint}
                  />
                )}
                <div className="absolute inset-0 bg-black/40" />
                <CardTitle className="absolute bottom-4 left-4 text-2xl font-bold text-white">
                  {plan.name}
                </CardTitle>
                <Badge
                  variant="destructive"
                  className="absolute right-4 top-4 bg-accent text-accent-foreground"
                >
                  {plan.duration} Days
                </Badge>
              </CardHeader>

              <CardContent className="flex-grow p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="font-semibold">Investment</div>
                  <div className="text-right font-mono">
                    {userRow ? format(investmentAmountInUserCurrency) : '...'}
                  </div>

                  <div className="font-semibold">Daily Profit</div>
                  <div className="text-right font-mono text-green-600">
                    +{userRow ? format(convert(plan.dailyProfit)) : '...'}
                  </div>

                  <div className="font-semibold">Total Return</div>
                  <div className="text-right font-mono font-bold text-primary">
                    {userRow ? format(convert(plan.totalReturn)) : '...'}
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div className="w-full" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="w-full" disabled={disabled}>
                        {isInvesting ? (
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : disabledBecauseProfile ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        {loadingUser
                          ? 'Loading...'
                          : !sessionUserId
                          ? 'Login to Invest'
                          : disabledBecauseProfile
                          ? 'Complete Profile'
                          : isInvesting
                          ? 'Processing...'
                          : 'Invest Now'}
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    {!sessionUserId ? (
                      <>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Login required</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please login to invest.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogAction>OK</AlertDialogAction>
                        </AlertDialogFooter>
                      </>
                    ) : !isProfileCompleted ? (
                      <>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Complete your profile</AlertDialogTitle>
                          <AlertDialogDescription>
                            You must complete your profile before investing.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Close</AlertDialogCancel>
                        </AlertDialogFooter>
                      </>
                    ) : (
                      <>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Investment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to invest in{' '}
                            <span className="font-semibold text-foreground">{plan.name}</span> for{' '}
                            <span className="font-semibold text-foreground">
                              {format(investmentAmountInUserCurrency)}
                            </span>
                            ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleInvest(plan)}>
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </>
                    )}
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
