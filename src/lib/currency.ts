'use client';

import { useMemo } from 'react';
import {
  BASE_CURRENCY,
  clampToPrecision,
  toSupportedCurrency,
  type SupportedCryptoCurrency,
} from '@/lib/crypto-rates';

const FALLBACK_RATES: Record<SupportedCryptoCurrency, number> = {
  USDT: 1,
  USDC: 1,
  ETH: 0.0004,
  BNB: 0.0018,
  BTC: 0.000015,
  SOL: 0.006,
};

export function useCurrencyConverter(userCurrency: string = BASE_CURRENCY) {
  const currency = toSupportedCurrency(userCurrency);
  const rate = FALLBACK_RATES[currency] || 1;

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
    loading: false,
    fetchedAt: 0,
  };
}
