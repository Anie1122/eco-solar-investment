export const BASE_CURRENCY = 'USDT' as const;

export const SUPPORTED_CRYPTO_CURRENCIES = [
  'USDT',
  'USDC',
  'ETH',
  'BNB',
  'BTC',
  'SOL',
] as const;

export type SupportedCryptoCurrency = (typeof SUPPORTED_CRYPTO_CURRENCIES)[number];

const COINGECKO_IDS: Record<SupportedCryptoCurrency, string> = {
  USDT: 'tether',
  USDC: 'usd-coin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  BTC: 'bitcoin',
  SOL: 'solana',
};

type CoinGeckoRow = {
  usd?: number;
  usd_24h_change?: number;
};

type CoinGeckoResponse = Record<string, CoinGeckoRow>;

const PRECISION = 8;

function roundTo(value: number, decimals = PRECISION) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clampToPrecision(value: number) {
  if (!Number.isFinite(value)) return 0;
  return roundTo(value, PRECISION);
}

export async function fetchCryptoMarketSnapshot() {
  const ids = SUPPORTED_CRYPTO_CURRENCIES.map((c) => COINGECKO_IDS[c]).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`CoinGecko request failed: ${res.status}`);
  }

  const json = (await res.json()) as CoinGeckoResponse;

  const usdtUsd = Number(json[COINGECKO_IDS.USDT]?.usd || 1);
  const safeUsdtUsd = usdtUsd > 0 ? usdtUsd : 1;

  const ratesFromUsdt: Record<SupportedCryptoCurrency, number> = {
    USDT: 1,
    USDC: 1,
    ETH: 0,
    BNB: 0,
    BTC: 0,
    SOL: 0,
  };

  const ticker = SUPPORTED_CRYPTO_CURRENCIES.map((symbol) => {
    const row = json[COINGECKO_IDS[symbol]] || {};
    const usd = Number(row.usd || 0);
    const change24h = Number(row.usd_24h_change || 0);

    const rate = symbol === 'USDT' ? 1 : clampToPrecision(usd / safeUsdtUsd);
    ratesFromUsdt[symbol] = rate;

    return {
      symbol,
      priceUsd: clampToPrecision(usd),
      change24h: Number.isFinite(change24h) ? change24h : 0,
    };
  });

  return {
    fetchedAt: Date.now(),
    ratesFromUsdt,
    ticker,
  };
}

export function toSupportedCurrency(value?: string | null): SupportedCryptoCurrency {
  const normalized = String(value || BASE_CURRENCY).toUpperCase();
  if ((SUPPORTED_CRYPTO_CURRENCIES as readonly string[]).includes(normalized)) {
    return normalized as SupportedCryptoCurrency;
  }
  return BASE_CURRENCY;
}
