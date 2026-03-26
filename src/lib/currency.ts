'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BASE_CURRENCY,
  clampToPrecision,
  FIXED_RATES_FROM_USDT,
  toSupportedCurrency,
  type SupportedCryptoCurrency,
} from '@/lib/crypto-rates';

type ConverterState = {
  ratesFromUsdt: Record<SupportedCryptoCurrency, number>;
  fetchedAt: number;
};

const FALLBACK_RATES: Record<SupportedCryptoCurrency, number> = FIXED_RATES_FROM_USDT;

export function useCurrencyConverter(userCurrency: string = BASE_CURRENCY) {
  const currency = toSupportedCurrency(userCurrency);

  const [state, setState] = useState<ConverterState>({
    ratesFromUsdt: FALLBACK_RATES,
    fetchedAt: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Deterministic conversion: fixed rates only.
    setState({
      ratesFromUsdt: FIXED_RATES_FROM_USDT,
      fetchedAt: Date.now(),
    });
    setLoading(false);
  }, []);

  const rate = state.ratesFromUsdt[currency] || 1;

  const convert = useMemo(() => {
    return (amountBaseUsdt: number) => {
      const n = Number(amountBaseUsdt || 0);
      return clampToPrecision(n * rate);
    };
  }, [rate]);

  const toBase = useMemo(() => {
    return (amountInUserCurrency: number) => {
      const n = Number(amountInUserCurrency || 0);
      if (!Number.isFinite(n) || rate <= 0) return 0;
      return clampToPrecision(n / rate);
    };
  }, [rate]);

  const format = useMemo(() => {
    return (amountInUserCurrency: number) => {
      const n = Number(amountInUserCurrency || 0);
      const decimals = currency === 'USDT' || currency === 'USDC' ? 2 : 6;
      return `${currency} ${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals,
      })}`;
    };
  }, [currency]);

  return {
    convert,
    toBase,
    format,
    rate,
    currency,
    loading,
    fetchedAt: state.fetchedAt,
  };
}
