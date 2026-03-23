export const BASE_CURRENCY = 'USDT' as const;

export const SUPPORTED_CRYPTO_CURRENCIES = [
  'USDT',
  'USDC',
  'ETH',
  'BNB',
  'BTC',
  'SOL',
] as const;

export type SupportedCryptoCurrency =
  (typeof SUPPORTED_CRYPTO_CURRENCIES)[number];

type TickerItem = {
  symbol: SupportedCryptoCurrency;
  priceUsd: number;
  change24h: number;
};

type Snapshot = {
  fetchedAt: number;
  ratesFromUsdt: Record<SupportedCryptoCurrency, number>;
  ticker: TickerItem[];
};

const PRECISION = 8;

const FALLBACK_USD_PRICES: Record<SupportedCryptoCurrency, number> = {
  USDT: 1,
  USDC: 1,
  ETH: 3500,
  BNB: 550,
  BTC: 65000,
  SOL: 150,
};

const FALLBACK_24H_CHANGE: Record<SupportedCryptoCurrency, number> = {
  USDT: 0,
  USDC: 0,
  ETH: 0,
  BNB: 0,
  BTC: 0,
  SOL: 0,
};

function roundTo(value: number, decimals = PRECISION) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clampToPrecision(value: number) {
  if (!Number.isFinite(value)) return 0;
  return roundTo(value, PRECISION);
}

function isSupportedCurrency(value: string): value is SupportedCryptoCurrency {
  return (SUPPORTED_CRYPTO_CURRENCIES as readonly string[]).includes(value);
}

function normalizeTickerRow(raw: unknown): TickerItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const symbol = String(record.symbol || '').toUpperCase();

  if (!isSupportedCurrency(symbol)) return null;

  const priceUsd = Number(record.priceUsd ?? record.price_usd ?? 0);
  const change24h = Number(record.change24h ?? record.change_24h ?? 0);

  return {
    symbol,
    priceUsd: clampToPrecision(priceUsd),
    change24h: Number.isFinite(change24h) ? change24h : 0,
  };
}

function buildFallbackSnapshot(): Snapshot {
  const usdtUsd = FALLBACK_USD_PRICES.USDT || 1;

  const ratesFromUsdt = SUPPORTED_CRYPTO_CURRENCIES.reduce(
    (acc, symbol) => {
      const usd = FALLBACK_USD_PRICES[symbol] || 0;
      acc[symbol] =
        symbol === 'USDT' ? 1 : clampToPrecision(usd / usdtUsd);
      return acc;
    },
    {} as Record<SupportedCryptoCurrency, number>
  );

  const ticker = SUPPORTED_CRYPTO_CURRENCIES.map((symbol) => ({
    symbol,
    priceUsd: clampToPrecision(FALLBACK_USD_PRICES[symbol] || 0),
    change24h: FALLBACK_24H_CHANGE[symbol] || 0,
  }));

  return {
    fetchedAt: Date.now(),
    ratesFromUsdt,
    ticker,
  };
}

function normalizeSnapshot(raw: unknown): Snapshot {
  const fallback = buildFallbackSnapshot();

  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const rawTicker = Array.isArray(record.ticker) ? record.ticker : [];

  const parsedTicker = rawTicker
    .map(normalizeTickerRow)
    .filter((item): item is TickerItem => Boolean(item));

  const tickerBySymbol = new Map<SupportedCryptoCurrency, TickerItem>();
  for (const item of parsedTicker) {
    tickerBySymbol.set(item.symbol, item);
  }

  const finalTicker = SUPPORTED_CRYPTO_CURRENCIES.map((symbol) => {
    const item = tickerBySymbol.get(symbol);
    if (item) return item;

    return {
      symbol,
      priceUsd: clampToPrecision(FALLBACK_USD_PRICES[symbol] || 0),
      change24h: FALLBACK_24H_CHANGE[symbol] || 0,
    };
  });

  const usdtUsd =
    finalTicker.find((item) => item.symbol === 'USDT')?.priceUsd || 1;
  const safeUsdtUsd = usdtUsd > 0 ? usdtUsd : 1;

  const ratesFromUsdt = SUPPORTED_CRYPTO_CURRENCIES.reduce(
    (acc, symbol) => {
      const priceUsd =
        finalTicker.find((item) => item.symbol === symbol)?.priceUsd || 0;

      acc[symbol] =
        symbol === 'USDT' ? 1 : clampToPrecision(priceUsd / safeUsdtUsd);

      return acc;
    },
    {} as Record<SupportedCryptoCurrency, number>
  );

  return {
    fetchedAt: Number(record.fetchedAt) || Date.now(),
    ratesFromUsdt,
    ticker: finalTicker,
  };
}

export async function fetchCryptoMarketSnapshot(): Promise<Snapshot> {
  try {
    const res = await fetch('/api/crypto/prices', {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Local crypto API failed: ${res.status}`);
    }

    const json = await res.json();
    return normalizeSnapshot(json);
  } catch (error) {
    console.error('Failed to fetch crypto market snapshot:', error);
    return buildFallbackSnapshot();
  }
}

export function toSupportedCurrency(
  value?: string | null
): SupportedCryptoCurrency {
  const normalized = String(value || BASE_CURRENCY).toUpperCase();
  if (isSupportedCurrency(normalized)) {
    return normalized;
  }
  return BASE_CURRENCY;
}
