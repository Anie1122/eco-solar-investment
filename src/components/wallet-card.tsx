'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
  Loader,
  Lock,
  Wallet,
  Trash2,
  Banknote,
  ShieldCheck,
  KeyRound,
  Phone,
  Wifi,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { useCurrencyConverter } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
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
} from './ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import GiftCardPaymentForm from '@/components/gift-card-payment-form';

interface WalletCardProps {
  userProfile: any | null;
  isLoading: boolean;
}

type WithdrawalAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  country?: string | null;
  lastUsedAt?: string | null;
};

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  country: string | null;
  currency: string | null;

  // IMPORTANT: these are assumed to be USDT base in your project
  wallet_balance: number | null;
  bonus_balance: number | null;

  bonus_unlocked?: boolean | null;
  has_invested: boolean | null;
  profile_completed: boolean | null;
  status: string | null;
  withdrawal_account?: WithdrawalAccount | null;
};

const depositFormSchema = z.object({
  amount: z.coerce.number().positive('Please enter a valid amount.'),
});

const DepositDialog = ({
  userProfile,
  children,
}: {
  userProfile: UserRow;
  children: React.ReactNode;
}) => {
  const { toast } = useToast();
  const currencyCode = userProfile?.currency || 'USDT';
  const { convert, format } = useCurrencyConverter(currencyCode);

  const [isDepositing, setIsDepositing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'flutterwave' | 'gift_card'>('flutterwave');

  const minDepositNGN = 5000;
  const maxDepositNGN = 1000000;
  const minDepositUserCurrency = convert(minDepositNGN);
  const maxDepositUserCurrency = convert(maxDepositNGN);

  const form = useForm<z.infer<typeof depositFormSchema>>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: { amount: '' as any },
    mode: 'onChange',
  });

  const handleDeposit = async (values: z.infer<typeof depositFormSchema>) => {
    if (
      values.amount < minDepositUserCurrency ||
      values.amount > maxDepositUserCurrency
    ) {
      form.setError('amount', {
        message: `Amount must be between ${format(
          minDepositUserCurrency
        )} and ${format(maxDepositUserCurrency)}.`,
      });
      return;
    }

    setIsDepositing(true);

    try {
      if (!userProfile.profile_completed) {
        toast({
          variant: 'destructive',
          title: 'Complete Profile',
          description: 'Please complete your profile before making a deposit.',
        });
        setIsDepositing(false);
        return;
      }

      if (
        !userProfile.phone_number ||
        !userProfile.email ||
        !userProfile.full_name ||
        !userProfile.id
      ) {
        toast({
          variant: 'destructive',
          title: 'Profile Incomplete',
          description:
            'Your profile is missing required info. Please update your profile.',
        });
        setIsDepositing(false);
        return;
      }

      // Deposit is paid in user's selected currency (Flutterwave)
      const payload = {
        amount: values.amount,
        email: userProfile.email,
        fullName: userProfile.full_name,
        phoneNumber: userProfile.phone_number,
        userId: userProfile.id,
        currency: userProfile.currency || 'USDT',
      };

      const response = await fetch('/api/flutterwave/create-deposit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data?.message || 'Failed to create payment session.');

      const checkoutUrl = data.checkout_url;
      if (!checkoutUrl)
        throw new Error('Could not retrieve payment URL from the server.');

      window.location.href = checkoutUrl;
    } catch (error: any) {
      console.error('Deposit Error:', error);
      toast({
        variant: 'destructive',
        title: 'Deposit Failed',
        description:
          error?.message || 'An unexpected error occurred. Please try again.',
      });
      setIsDepositing(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset({ amount: '' as any });
      setIsDepositing(false);
      setPaymentMethod('flutterwave');
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Add funds to your wallet using your preferred payment method.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border p-3">
          <FormLabel>Payment Method</FormLabel>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as any)}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            <div className="flex items-center gap-2 rounded-md border p-2">
              <RadioGroupItem value="flutterwave" id="pm-flutterwave" />
              <Label htmlFor="pm-flutterwave" className="cursor-pointer">Card / Flutterwave</Label>
            </div>
            <div className="flex items-center gap-2 rounded-md border p-2">
              <RadioGroupItem value="gift_card" id="pm-gift-card" />
              <Label htmlFor="pm-gift-card" className="cursor-pointer">Gift Card Payment</Label>
            </div>
          </RadioGroup>
        </div>

        {paymentMethod === 'flutterwave' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleDeposit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({currencyCode})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={`e.g., ${minDepositUserCurrency.toFixed(0)}`}
                      {...field}
                      disabled={isDepositing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Min deposit: {format(minDepositUserCurrency)}. Max deposit:{' '}
                {format(maxDepositUserCurrency)}.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isDepositing}>
                  Cancel
                </Button>
              </DialogClose>

              <Button
                type="submit"
                disabled={isDepositing || !form.formState.isValid}
              >
                {isDepositing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                {isDepositing ? 'Redirecting...' : 'Proceed to Payment'}
              </Button>
            </DialogFooter>
            </form>
          </Form>
        ) : (
          <GiftCardPaymentForm onSuccess={() => setDialogOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
};

const withdrawalFormSchema = z.object({
  amount: z.coerce.number().positive('Please enter a valid amount.'),
  bankName: z.string().min(2, 'Please enter a bank name.'),
  accountNumber: z
    .string()
    .regex(/^\d{8,12}$/, 'Please enter a valid account number (8-12 digits).'),
  accountName: z.string().min(2, 'Account holder name is required.'),
});

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits.'),
});

const setPinSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits.'),
    confirmPin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits.'),
  })
  .refine((v) => v.pin === v.confirmPin, {
    message: 'PIN does not match.',
    path: ['confirmPin'],
  });

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function fetchPinStatus(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const res = await fetch('/api/withdrawal-pin/status', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json().catch(() => ({}));
  return Boolean(json?.isSet);
}

async function setWithdrawalPin(pin: string) {
  const token = await getAccessToken();
  if (!token) throw new Error('No session token');

  const res = await fetch('/api/withdrawal-pin/set', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pin }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed to set PIN');
  return true;
}

async function clearWithdrawalPin() {
  const token = await getAccessToken();
  if (!token) throw new Error('No session token');

  const res = await fetch('/api/withdrawal-pin/clear', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed to clear PIN');
  return true;
}

async function requestWithdrawal(payload: {
  amount: number; // USDT base (fixed)
  bankName: string;
  accountNumber: string;
  accountName: string;
  pin: string;
}) {
  const token = await getAccessToken();
  if (!token) throw new Error('No session token');

  const res = await fetch('/api/withdrawals/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.message || 'Withdrawal failed');
  return true;
}

function PinKeypad({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 4);
  const arr = digits.split('');

  const add = (n: string) => {
    if (disabled) return;
    if (digits.length >= 4) return;
    onChange((digits + n).slice(0, 4));
  };

  const backspace = () => {
    if (disabled) return;
    if (!digits.length) return;
    onChange(digits.slice(0, -1));
  };

  const clear = () => {
    if (disabled) return;
    onChange('');
  };

  const canSubmit = digits.length === 4 && !disabled;
  const activeIndex = Math.min(digits.length, 3);

  const keyAnim = {
    rest: { scale: 1 },
    tap: { scale: 0.96 },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        {[0, 1, 2, 3].map((i) => {
          const filled = Boolean(arr[i]);
          const isActive = i === activeIndex && digits.length < 4;

          return (
            <motion.div
              key={i}
              layout
              animate={isActive ? { scale: 1.03 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={cn(
                'h-12 w-12 rounded-2xl border bg-muted/30 shadow-sm flex items-center justify-center',
                filled ? 'border-primary/50' : 'border-muted',
                isActive ? 'ring-2 ring-primary/30' : ''
              )}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {filled ? (
                  <motion.div
                    key="dot"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="h-3 w-3 rounded-full bg-foreground/80"
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 0.6 }}
                    className="h-3 w-3 rounded-full bg-transparent"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <motion.button
            key={n}
            type="button"
            variants={keyAnim}
            initial="rest"
            whileTap="tap"
            onClick={() => add(n)}
            disabled={disabled}
            className={cn(
              'h-12 rounded-2xl border bg-background shadow-sm transition',
              'text-lg font-semibold active:shadow-none',
              disabled ? 'opacity-60' : ''
            )}
          >
            {n}
          </motion.button>
        ))}

        <motion.button
          type="button"
          variants={keyAnim}
          initial="rest"
          whileTap="tap"
          onClick={clear}
          disabled={disabled}
          className={cn(
            'h-12 rounded-2xl border bg-background shadow-sm transition',
            'text-sm font-medium',
            disabled ? 'opacity-60' : ''
          )}
        >
          Clear
        </motion.button>

        <motion.button
          type="button"
          variants={keyAnim}
          initial="rest"
          whileTap="tap"
          onClick={() => add('0')}
          disabled={disabled}
          className={cn(
            'h-12 rounded-2xl border bg-background shadow-sm transition',
            'text-lg font-semibold',
            disabled ? 'opacity-60' : ''
          )}
        >
          0
        </motion.button>

        <motion.button
          type="button"
          variants={keyAnim}
          initial="rest"
          whileTap="tap"
          onClick={backspace}
          disabled={disabled}
          className={cn(
            'h-12 rounded-2xl border bg-background shadow-sm transition',
            'text-sm font-medium',
            disabled ? 'opacity-60' : ''
          )}
        >
          ⌫
        </motion.button>
      </div>

      <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }}>
        <Button
          type="button"
          className="w-full rounded-xl"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          Confirm & Withdraw
        </Button>
      </motion.div>
    </div>
  );
}

const WithdrawalDialogContent = ({
  userProfile,
  setDialogOpen,
  onProfileRefresh,
}: {
  userProfile: UserRow;
  setDialogOpen: (open: boolean) => void;
  onProfileRefresh: () => Promise<void>;
}) => {
  const { toast } = useToast();

  const currencyCode = userProfile.currency || 'USDT';
  const { convert, format, currency } = useCurrencyConverter(currencyCode);

  // ✅ helper: convert a user-currency amount back to USDT base safely
  const toNGN = (amountUserCurrency: number) => {
    const oneNgnInUser = convert(1);
    if (!Number.isFinite(oneNgnInUser) || oneNgnInUser <= 0) return amountUserCurrency;
    return amountUserCurrency / oneNgnInUser;
  };

  const savedAccount = (userProfile.withdrawal_account ?? null) as
    | WithdrawalAccount
    | null;
  const [accountOption, setAccountOption] = useState<'saved' | 'new'>(
    savedAccount ? 'saved' : 'new'
  );

  const minWithdrawalNGN = 15000;
  const minWithdrawalUserCurrency = convert(minWithdrawalNGN);

  const walletBalanceNGN = Number(userProfile.wallet_balance ?? 0);
  const walletBalanceUserCurrency = convert(walletBalanceNGN);

  const [pinSet, setPinSet] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  const [pinEntryOpen, setPinEntryOpen] = useState(false);
  const [setPinOpen, setSetPinOpen] = useState(false);
  const [forgotPinOpen, setForgotPinOpen] = useState(false);

  const [pendingWithdrawal, setPendingWithdrawal] =
    useState<z.infer<typeof withdrawalFormSchema> | null>(null);

  const pinForm = useForm<z.infer<typeof pinSchema>>({
    resolver: zodResolver(pinSchema),
    defaultValues: { pin: '' },
    mode: 'onChange',
  });

  const setPinForm = useForm<z.infer<typeof setPinSchema>>({
    resolver: zodResolver(setPinSchema),
    defaultValues: { pin: '', confirmPin: '' },
    mode: 'onChange',
  });

  const [busy, setBusy] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const formMethods = useForm<z.infer<typeof withdrawalFormSchema>>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      amount: '' as any,
      bankName: savedAccount?.bankName ?? '',
      accountNumber: savedAccount?.accountNumber ?? '',
      accountName: savedAccount?.accountName ?? '',
    },
  });

  useEffect(() => {
    const run = async () => {
      setCheckingPin(true);
      try {
        const isSet = await fetchPinStatus();
        setPinSet(isSet);
      } catch {
        setPinSet(false);
      } finally {
        setCheckingPin(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const option = savedAccount ? 'saved' : 'new';
    setAccountOption(option);

    if (option === 'saved' && savedAccount) {
      formMethods.reset({
        amount: '' as any,
        bankName: savedAccount.bankName,
        accountNumber: savedAccount.accountNumber,
        accountName: savedAccount.accountName,
      });
    } else {
      formMethods.reset({
        amount: '' as any,
        bankName: '',
        accountNumber: '',
        accountName: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAccount]);

  const handleRemoveAccount = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ withdrawal_account: null })
        .eq('id', userProfile.id);
      if (error) throw error;

      toast({
        title: 'Account Removed',
        description: 'Your saved withdrawal account has been removed.',
      });

      setAccountOption('new');
      formMethods.reset({
        amount: formMethods.getValues('amount'),
        bankName: '',
        accountNumber: '',
        accountName: '',
      });

      await onProfileRefresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error?.message || 'Could not remove saved account. Please try again.',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof withdrawalFormSchema>) => {
    if (!userProfile.profile_completed) {
      formMethods.setError('amount', {
        message: 'Please complete your profile before withdrawing.',
      });
      return;
    }

    // ✅ compare in SAME currency (user currency)
    if (values.amount < minWithdrawalUserCurrency) {
      formMethods.setError('amount', {
        message: `Minimum withdrawal is ${format(minWithdrawalUserCurrency)}.`,
      });
      return;
    }

    if (values.amount > walletBalanceUserCurrency) {
      formMethods.setError('amount', {
        message: 'You cannot withdraw more than your wallet balance.',
      });
      return;
    }

    setPendingWithdrawal(values);

    if (checkingPin) return;

    if (!pinSet) {
      setSetPinOpen(true);
      return;
    }

    pinForm.reset({ pin: '' });
    setPinEntryOpen(true);
  };

  const handleSetPin = async (v: z.infer<typeof setPinSchema>) => {
    setBusy(true);
    try {
      await setWithdrawalPin(v.pin);
      setPinSet(true);
      toast({
        title: 'PIN Set',
        description: 'Withdrawal PIN saved successfully.',
      });

      setSetPinOpen(false);

      pinForm.reset({ pin: '' });
      setPinEntryOpen(true);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: e?.message || 'Could not set PIN.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPinAndWithdraw = async (v: z.infer<typeof pinSchema>) => {
    if (!pendingWithdrawal) return;

    setBusy(true);
    try {
      // ✅ send USDT base to backend (so DB stays consistent)
      const amountNGN = toNGN(Number(pendingWithdrawal.amount));

      await requestWithdrawal({
        amount: Number(amountNGN),
        bankName: pendingWithdrawal.bankName,
        accountNumber: pendingWithdrawal.accountNumber,
        accountName: pendingWithdrawal.accountName,
        pin: v.pin,
      });

      toast({
        title: 'Withdrawal Request Submitted',
        description:
          'Your request is being processed and can take up to 12 hours.',
        duration: 5000,
      });

      setPinEntryOpen(false);
      setDialogOpen(false);
      setPendingWithdrawal(null);

      await onProfileRefresh();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Withdrawal Failed',
        description: e?.message || 'Could not process withdrawal.',
        duration: 6000,
      });
    } finally {
      setBusy(false);
    }
  };

  const forgotForm = useForm<{ password: string }>({
    defaultValues: { password: '' },
    mode: 'onChange',
  });

  const handleForgotPin = async (v: { password: string }) => {
    setForgotBusy(true);
    try {
      const email = userProfile.email;
      if (!email) throw new Error('No email found on your account.');

      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: v.password,
      });
      if (reauthErr) throw reauthErr;

      await clearWithdrawalPin();
      setPinSet(false);

      toast({
        title: 'PIN Reset',
        description: 'Your PIN has been cleared. Please set a new PIN.',
      });

      setForgotPinOpen(false);
      setPinEntryOpen(false);
      setSetPinOpen(true);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: e?.message || 'Could not reset PIN.',
      });
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Withdraw Funds</DialogTitle>
        <DialogDescription>
          Transfer funds from your wallet to your bank account.
        </DialogDescription>
      </DialogHeader>

      <FormProvider {...formMethods}>
        {savedAccount && (
          <div className="space-y-4">
            <RadioGroup
              value={accountOption}
              onValueChange={(value: 'saved' | 'new') => setAccountOption(value)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="saved" id="saved" className="peer sr-only" />
                <FormLabel
                  htmlFor="saved"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition"
                >
                  <Banknote className="mb-3 h-6 w-6" />
                  Use Saved Account
                </FormLabel>
              </div>

              <div>
                <RadioGroupItem value="new" id="new" className="peer sr-only" />
                <FormLabel
                  htmlFor="new"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition"
                >
                  <Banknote className="mb-3 h-6 w-6" />
                  Use New Account
                </FormLabel>
              </div>
            </RadioGroup>

            {accountOption === 'saved' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive rounded-xl"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove Saved Account
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove your saved withdrawal account
                      details.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, remove it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={formMethods.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ({currency})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={`e.g., ${minWithdrawalUserCurrency.toFixed(0)}`}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Country</FormLabel>
            <Input value={userProfile.country ?? ''} disabled readOnly />
          </FormItem>

          <FormField
            control={formMethods.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={accountOption === 'saved'} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={formMethods.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input {...field} disabled={accountOption === 'saved'} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={formMethods.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Holder Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={accountOption === 'saved'} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Minimum withdrawal is {format(minWithdrawalUserCurrency)}.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }} className="w-full">
              <Button type="submit" className="w-full rounded-xl" disabled={busy}>
                {busy && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Request Withdrawal
              </Button>
            </motion.div>
          </DialogFooter>
        </form>
      </FormProvider>

      <Dialog open={setPinOpen} onOpenChange={setSetPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Set Withdrawal PIN
            </DialogTitle>
            <DialogDescription>
              Create a 4-digit PIN. You will use it to confirm withdrawals.
            </DialogDescription>
          </DialogHeader>

          <Form {...setPinForm}>
            <form
              onSubmit={setPinForm.handleSubmit(handleSetPin)}
              className="space-y-4"
            >
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
                        placeholder="4 digits"
                        {...field}
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
                        placeholder="4 digits"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }} className="w-full">
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={busy || !setPinForm.formState.isValid}
                  >
                    {busy && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Save PIN
                  </Button>
                </motion.div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pinEntryOpen}
        onOpenChange={(o) => {
          setPinEntryOpen(o);
          if (!o) pinForm.reset({ pin: '' });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Enter Withdrawal PIN
            </DialogTitle>
            <DialogDescription>
              Enter your 4-digit PIN to confirm this withdrawal.
            </DialogDescription>
          </DialogHeader>

          <Form {...pinForm}>
            <form
              onSubmit={pinForm.handleSubmit(handleConfirmPinAndWithdraw)}
              className="space-y-4"
            >
              <FormField
                control={pinForm.control}
                name="pin"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PinKeypad
                value={pinForm.watch('pin') || ''}
                disabled={busy}
                onChange={(next) => {
                  const clean = (next || '').replace(/\D/g, '').slice(0, 4);
                  pinForm.setValue('pin', clean, { shouldValidate: true });
                }}
                onSubmit={() => {
                  const v = (pinForm.getValues('pin') || '').trim();
                  if (v.length !== 4) return;
                  pinForm.handleSubmit(handleConfirmPinAndWithdraw)();
                }}
              />

              <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setForgotPinOpen(true)}
                  disabled={busy}
                >
                  Forgot PIN?
                </Button>
              </motion.div>

              {pinForm.formState.errors.pin?.message ? (
                <p className="text-xs text-destructive">
                  {pinForm.formState.errors.pin.message as any}
                </p>
              ) : null}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotPinOpen} onOpenChange={setForgotPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Withdrawal PIN</DialogTitle>
            <DialogDescription>
              Enter your account password to clear your PIN, then you will set a
              new PIN.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={forgotForm.handleSubmit(handleForgotPin)}
            className="space-y-4"
          >
            <FormItem>
              <FormLabel>Account Password</FormLabel>
              <Input
                type="password"
                placeholder="Your password"
                {...forgotForm.register('password', { required: true })}
              />
            </FormItem>

            <DialogFooter>
              <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: 0.1 }} className="w-full">
                <Button type="submit" className="w-full rounded-xl" disabled={forgotBusy}>
                  {forgotBusy && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                  Reset PIN
                </Button>
              </motion.div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const WithdrawalDialog = ({
  userProfile,
  children,
  onProfileRefresh,
}: {
  userProfile: UserRow;
  children: React.ReactNode;
  onProfileRefresh: () => Promise<void>;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <WithdrawalDialogContent
          userProfile={userProfile}
          setDialogOpen={setDialogOpen}
          onProfileRefresh={onProfileRefresh}
        />
      </DialogContent>
    </Dialog>
  );
};

export default function WalletCard({ userProfile, isLoading }: WalletCardProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [liveProfile, setLiveProfile] = useState<UserRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    let unsub:
      | { data: { subscription: { unsubscribe: () => void } } }
      | null = null;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      setSessionUserId(user?.id ?? null);

      unsub = supabase.auth.onAuthStateChange((_e, s) => {
        setSessionUserId(s?.user?.id ?? null);
      });
    };

    run();
    return () => {
      if (unsub) unsub.data.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const id = sessionUserId || userProfile?.id || null;
    if (!id) return;

    setLoadingProfile(true);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Wallet Error',
        description: 'Could not load wallet data. Please refresh.',
      });
      setLiveProfile(null);
    } else {
      setLiveProfile((data as UserRow) ?? null);
    }

    setLoadingProfile(false);
  };

  useEffect(() => {
    if (!sessionUserId && !userProfile?.id) return;
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUserId]);

  useEffect(() => {
    const id = sessionUserId || userProfile?.id || null;
    if (!id) return;

    const channel = supabase
      .channel(`users-wallet-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) setLiveProfile(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUserId, userProfile?.id]);

  const profileToUse = useMemo(() => liveProfile, [liveProfile]);

  const currencyCode = profileToUse?.currency || 'USDT';
  const { convert, format } = useCurrencyConverter(currencyCode);

  if (isLoading || loadingProfile || !profileToUse) {
    return (
      <Card className="sm:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <span>My Wallet</span>
          </CardTitle>
          <CardDescription>Manage your funds and transactions.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg bg-primary/5 p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-48" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/70 p-4">
            <div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="mt-1 h-8 w-32" />
            </div>
          </div>
        </CardContent>

        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // ✅ Treat DB values as USDT base
  const walletBalanceNGN = Number(profileToUse.wallet_balance ?? 0);
  const bonusBalanceNGN = Number(profileToUse.bonus_balance ?? 0);

  // ✅ Convert for display
  const walletBalanceUser = convert(walletBalanceNGN);
  const bonusBalanceUser = convert(bonusBalanceNGN);

  const bonusUnlocked = Boolean(profileToUse.bonus_unlocked ?? false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="sm:col-span-2"
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <span>My Wallet</span>
          </CardTitle>
          <CardDescription>Manage your funds and transactions.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <motion.div
            className="space-y-2 rounded-xl bg-primary/5 p-4"
            whileHover={{ y: -1 }}
            transition={{ duration: 0.15 }}
          >
            <div className="text-sm font-medium text-muted-foreground">
              Total Balance
            </div>
            <div className="text-4xl font-bold text-primary">
              {format(walletBalanceUser)}
            </div>
          </motion.div>

          <div className="flex items-center justify-between rounded-xl bg-muted/70 p-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Bonus Balance
              </div>
              <div className="text-2xl font-semibold">
                {format(bonusBalanceUser)}
              </div>
            </div>

            {!bonusUnlocked && bonusBalanceNGN > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Make first deposit to unlock</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <motion.div
            className="min-w-0"
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.1 }}
          >
            <DepositDialog userProfile={profileToUse}>
              <Button className="w-full min-w-0 justify-center gap-2 rounded-xl">
                <ArrowDownToLine className="h-4 w-4 shrink-0" />
                <span className="truncate">Deposit</span>
              </Button>
            </DepositDialog>
          </motion.div>

          <motion.div
            className="min-w-0"
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.1 }}
          >
            <WithdrawalDialog
              userProfile={profileToUse}
              onProfileRefresh={refreshProfile}
            >
              <Button
                variant="outline"
                className="w-full min-w-0 justify-center gap-2 rounded-xl"
              >
                <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                <span className="truncate">Withdraw</span>
              </Button>
            </WithdrawalDialog>
          </motion.div>
        </CardContent>

        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Airtime & Data</div>
            <div className="text-xs text-muted-foreground">Top up</div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <motion.div
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.1 }}
              className="min-w-0"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full min-w-0 justify-between rounded-xl py-6"
                onClick={() => router.push('/airtime')}
              >
                <span className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  <span className="font-semibold">Buy Airtime</span>
                </span>
                <span className="text-xs text-muted-foreground">Top up</span>
              </Button>
            </motion.div>

            <motion.div
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.1 }}
              className="min-w-0"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full min-w-0 justify-between rounded-xl py-6"
                onClick={() => router.push('/data')}
              >
                <span className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  <span className="font-semibold">Buy Data</span>
                </span>
                <span className="text-xs text-muted-foreground">Bundles</span>
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
