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

export function fetchCryptoMarketSnapshot(): Promise<Snapshot> {
  const usdtPerCoin: Record<SupportedCryptoCurrency, number> = {
    USDT: 1,
    USDC: 1,
    ETH: 3500,
    BNB: 550,
    BTC: 65000,
    SOL: 150,
  };

  const ratesFromUsdt: Record<SupportedCryptoCurrency, number> = {
    USDT: 1,
    USDC: 1,
    ETH: clampToPrecision(1 / usdtPerCoin.ETH),
    BNB: clampToPrecision(1 / usdtPerCoin.BNB),
    BTC: clampToPrecision(1 / usdtPerCoin.BTC),
    SOL: clampToPrecision(1 / usdtPerCoin.SOL),
  };

  const ticker: TickerItem[] = [
    { symbol: 'USDT', priceUsd: 1, change24h: 0 },
    { symbol: 'USDC', priceUsd: 1, change24h: 0 },
    { symbol: 'ETH', priceUsd: 3500, change24h: 0 },
    { symbol: 'BNB', priceUsd: 550, change24h: 0 },
    { symbol: 'BTC', priceUsd: 65000, change24h: 0 },
    { symbol: 'SOL', priceUsd: 150, change24h: 0 },
  ];

  return Promise.resolve({
    fetchedAt: Date.now(),
    ratesFromUsdt,
    ticker,
  });
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
