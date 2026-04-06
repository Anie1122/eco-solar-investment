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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { BASE_CURRENCY } from '@/lib/crypto-rates';
import { getSignupBonusUsdtToday } from '@/lib/bonus';

const schema = z.object({
  country: z.string().min(2, 'Select your country'),
  dial: z.string().min(1),
  phone: z
    .string()
    .min(6, 'Enter a valid phone number')
    .max(20, 'Enter a valid phone number'),
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
      : [{ name: 'Nigeria', code: 'NG', dial: '+234', currency: BASE_CURRENCY }];
  }, []);

  const defaultCountryName = useMemo(() => {
    const nigeria = COUNTRIES.find(
      (c) => c.code === 'NG' || c.name.toLowerCase() === 'nigeria'
    );
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

  const selectedCountryName = form.watch('country');

  const selectedCountry = useMemo(() => {
    let found = COUNTRIES.find((x) => x.name === selectedCountryName);
    if (!found) {
      const lower = (selectedCountryName ?? '').toLowerCase();
      found = COUNTRIES.find((x) => x.name.toLowerCase() === lower);
    }
    return found ?? COUNTRIES[0];
  }, [COUNTRIES, selectedCountryName]);

  useEffect(() => {
    if (!selectedCountry) return;
    form.setValue('dial', selectedCountry.dial, { shouldValidate: true });
  }, [selectedCountry, form]);

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
            const ci = COUNTRIES.find(
              (c) => c.name.toLowerCase() === r.country!.toLowerCase()
            );
            if (ci) {
              form.setValue('country', ci.name, { shouldValidate: true });
            }
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
        toast({
          variant: 'destructive',
          title: 'Not logged in',
          description: 'Please login again.',
        });
        router.replace('/login');
        return;
      }

      const currency = BASE_CURRENCY;
      const signupBonusUsdt = await getSignupBonusUsdtToday();
      const phone_number = `${values.dial} ${values.phone}`.trim();

      const res = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email ?? '',
          fullName: (user.user_metadata as any)?.full_name ?? '',
          country: selectedCountry?.name ?? values.country,
          phone_number,
          currency,
          bonus_balance: signupBonusUsdt,
          profile_completed: true,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || 'Could not save profile.');
      }

      toast({
        title: 'Profile saved',
        description: 'Redirecting to dashboard...',
      });
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
          <CardDescription>
            Choose your country and add your phone number.
          </CardDescription>
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger className="rounded-md">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80 rounded-md">
                          {COUNTRIES.map((c) => (
                            <SelectItem
                              key={`${c.code}-${c.currency}-${c.dial}`}
                              value={c.name}
                            >
                              {c.name} ({c.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Input
                          placeholder="e.g. 8012345678"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !form.formState.isValid}
              >
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
