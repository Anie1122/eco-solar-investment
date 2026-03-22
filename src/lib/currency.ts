// src/lib/currency.ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLiveRate } from '@/lib/fx';

export function useCurrencyConverter(userCurrency: string = 'NGN') {
  const currency = (userCurrency || 'NGN').toUpperCase();

  const [rate, setRate] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      const r = await getLiveRate('NGN', currency);
      if (!mounted) return;
      setRate(r || 1);
      setLoading(false);
    };

    run();

    return () => {
      mounted = false;
    };
  }, [currency]);

  const convert = useMemo(() => {
    return (amountNGN: number) => {
      const n = Number(amountNGN || 0);
      return n * (rate || 1);
    };
  }, [rate]);

  const format = useMemo(() => {
    return (amountInUserCurrency: number) => {
      const n = Number(amountInUserCurrency || 0);
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
          maximumFractionDigits: 2,
        }).format(n);
      } catch {
        // if Intl doesn't like the currency, still show a safe string
        return `${currency} ${n.toFixed(2)}`;
      }
    };
  }, [currency]);

  return { convert, format, rate, currency, loading };
                                  }
