'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BASE_CURRENCY,
  clampToPrecision,
  fetchCryptoMarketSnapshot,
  toSupportedCurrency,
  type SupportedCryptoCurrency,
} from '@/lib/crypto-rates';

type ConverterState = {
  ratesFromUsdt: Record<SupportedCryptoCurrency, number>;
  fetchedAt: number;
};

const FALLBACK_RATES: Record<SupportedCryptoCurrency, number> = {
  USDT: 1,
  USDC: 1,
  ETH: 0.0004,
  BNB: 0.0018,
  BTC: 0.000015,
  SOL: 0.006,
};

const REFRESH_MS = 45_000;

export function useCurrencyConverter(userCurrency: string = BASE_CURRENCY) {
  const currency = toSupportedCurrency(userCurrency);

  const [state, setState] = useState<ConverterState>({
    ratesFromUsdt: FALLBACK_RATES,
    fetchedAt: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const snapshot = await fetchCryptoMarketSnapshot();
        if (!mounted) return;

        setState({
          ratesFromUsdt: snapshot.ratesFromUsdt,
          fetchedAt: snapshot.fetchedAt,
        });
      } catch (error) {
        console.error('currency rate fetch failed:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          timer = setTimeout(load, REFRESH_MS);
        }
      }
    };

    load();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
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
