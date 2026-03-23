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

const FIXED_USDT_PER_COIN: Record<SupportedCryptoCurrency, number> = {
  USDT: 1,
  USDC: 1,
  ETH: 3500,
  BNB: 550,
  BTC: 65000,
  SOL: 150,
};

const FIXED_RATES_FROM_USDT: Record<SupportedCryptoCurrency, number> = {
  USDT: 1,
  USDC: 1,
  ETH: clampToPrecision(1 / FIXED_USDT_PER_COIN.ETH),
  BNB: clampToPrecision(1 / FIXED_USDT_PER_COIN.BNB),
  BTC: clampToPrecision(1 / FIXED_USDT_PER_COIN.BTC),
  SOL: clampToPrecision(1 / FIXED_USDT_PER_COIN.SOL),
};

const REFRESH_MS = 45_000;

export function useCurrencyConverter(userCurrency: string = BASE_CURRENCY) {
  const currency = toSupportedCurrency(userCurrency);

  const [state, setState] = useState<ConverterState>({
    ratesFromUsdt: FIXED_RATES_FROM_USDT,
    fetchedAt: 0,
  });

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const snapshot = await fetchCryptoMarketSnapshot();
        if (!mounted || !snapshot?.ratesFromUsdt) return;

        setState({
          ratesFromUsdt: snapshot.ratesFromUsdt,
          fetchedAt: snapshot.fetchedAt,
        });
      } catch (error) {
        console.error('currency rate fetch failed, using fixed rates:', error);

        if (mounted) {
          setState({
            ratesFromUsdt: FIXED_RATES_FROM_USDT,
            fetchedAt: Date.now(),
          });
        }
      } finally {
        if (mounted) {
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
      if (!Number.isFinite(n)) return 0;
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
      const safeAmount = Number.isFinite(n) ? n : 0;
      const decimals = currency === 'USDT' || currency === 'USDC' ? 2 : 6;

      return `${currency} ${safeAmount.toLocaleString(undefined, {
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
