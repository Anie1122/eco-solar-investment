// src/app/complete-profile/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

import type { CountryItem } from '@/lib/countries';
import { buildCountriesAtoZ } from '@/lib/countries';
import { DEFAULT_SIGNUP_BONUS_NGN, convertAmount } from '@/lib/fx';

const schema = z.object({
  country: z.string().min(2, 'Select your country'),
  dial: z.string().min(1),
  phone: z.string().min(6, 'Enter a valid phone number').max(20, 'Enter a valid phone number'),
});

type UserRowMini = {
  country: string | null;
  phone_number: string | null;
  profile_completed: boolean | null;
  bonus_balance: number | null;
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(true);

  const COUNTRIES: CountryItem[] = useMemo(() => {
    const list = buildCountriesAtoZ('en');
    return list.length
      ? list
      : [{ name: 'Nigeria', code: 'NG', dial: '+234', currency: 'NGN' }];
  }, []);

  const defaultCountryName = useMemo(() => {
    const nigeria = COUNTRIES.find((c) => c.code === 'NG' || c.name.toLowerCase() === 'nigeria');
    return (nigeria ?? COUNTRIES[0]).name;
  }, [COUNTRIES]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: defaultCountryName,
      dial: COUNTRIES.find((c) => c.name === defaultCountryName)?.dial ?? '+234',
      phone: '',
    },
    mode: 'onChange',
  });

  // ✅ IMPORTANT FIX: make selectedCountry depend on the watched value
  const selectedCountryName = form.watch('country');

  const selectedCountry = useMemo(() => {
    let found = COUNTRIES.find((x) => x.name === selectedCountryName);
    if (!found) {
      const lower = (selectedCountryName ?? '').toLowerCase();
      found = COUNTRIES.find((x) => x.name.toLowerCase() === lower);
    }
    return found ?? COUNTRIES[0];
  }, [COUNTRIES, selectedCountryName]);

  // ✅ Keep dial synced to selected country
  useEffect(() => {
    if (!selectedCountry) return;
    form.setValue('dial', selectedCountry.dial, { shouldValidate: true });
  }, [selectedCountry, form]);

  // Prefill + redirect if already completed
  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;

        if (!user) {
          router.replace('/login');
          return;
        }

        const { data: row, error } = await supabase
          .from('users')
          .select('country, phone_number, profile_completed, bonus_balance')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && row) {
          const r = row as UserRowMini;

          if (r.profile_completed) {
            router.replace('/');
            return;
          }

          if (r.country) {
            const ci = COUNTRIES.find((c) => c.name.toLowerCase() === r.country!.toLowerCase());
            if (ci) form.setValue('country', ci.name, { shouldValidate: true });
          }

          if (r.phone_number) {
            const phoneStr = String(r.phone_number);
            const match = phoneStr.match(/^(\+\d{1,4})\s*(.*)$/);
            if (match) {
              form.setValue('dial', match[1], { shouldValidate: true });
              form.setValue('phone', match[2], { shouldValidate: true });
            } else {
              form.setValue('phone', phoneStr, { shouldValidate: true });
            }
          }
        }
      } finally {
        setLoadingPrefill(false);
      }
    };

    run();
  }, [router, form, COUNTRIES]);

  const handleSave = async (values: z.infer<typeof schema>) => {
    setLoading(true);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const user = authData.user;

      if (authErr || !user) {
        toast({ variant: 'destructive', title: 'Not logged in', description: 'Please login again.' });
        router.replace('/login');
        return;
      }

      const currency = (selectedCountry?.currency ?? 'USD').toUpperCase();

      // ✅ LIVE BONUS conversion (NGN -> user currency), cached, fallback-safe
      const bonusConvertedRaw = await convertAmount(DEFAULT_SIGNUP_BONUS_NGN, 'NGN', currency);
      const bonusConverted = Math.round(bonusConvertedRaw * 100) / 100;

      const phone_number = `${values.dial} ${values.phone}`.trim();

      // Update profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          country: selectedCountry?.name ?? values.country,
          phone_number,
          currency,
          profile_completed: true,
        })
        .eq('id', user.id);

      // If update fails (row missing), upsert
      if (updateError) {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(
            {
              id: user.id,
              email: user.email ?? '',
              full_name: (user.user_metadata as any)?.full_name ?? '',
              country: selectedCountry?.name ?? values.country,
              phone_number,
              currency,
              wallet_balance: 0,
              bonus_balance: bonusConverted,
              has_invested: false,
              profile_completed: true,
              status: 'active',
              created_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (upsertError) throw upsertError;
      }

      // ✅ FIX: convert bonus ONCE if it's still the default NGN 1500
      const { data: rowCheck, error: checkErr } = await supabase
        .from('users')
        .select('bonus_balance')
        .eq('id', user.id)
        .maybeSingle();

      if (checkErr) throw checkErr;

      const currentBonus = Number(rowCheck?.bonus_balance);

      const looksLikeDefaultNGNBonus =
        isFinite(currentBonus) &&
        Math.abs(currentBonus - DEFAULT_SIGNUP_BONUS_NGN) < 0.0001;

      // Convert only if user is NOT NGN and bonus is still 1500
      if (currency !== 'NGN' && looksLikeDefaultNGNBonus) {
        await supabase.from('users').update({ bonus_balance: bonusConverted }).eq('id', user.id);
      }

      toast({ title: 'Profile saved', description: 'Redirecting to dashboard...' });
      router.replace('/');
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e?.message || 'Could not save profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingPrefill) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>Choose your country and add your phone number.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={loading}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={`${c.code}-${c.currency}-${c.dial}`} value={c.name}>
                            {c.name} ({c.currency})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="dial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} disabled readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 8012345678" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !form.formState.isValid}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Continue
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
