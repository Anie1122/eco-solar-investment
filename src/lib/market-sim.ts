export type MarketDirection = 'up' | 'down' | 'neutral';

export type MarketRow = {
  symbol: string;
  basePrice: number;
  price: number;
  changePercent: number;
  direction: MarketDirection;
};

export const MARKET_SEED: Array<{ symbol: string; price: number }> = [
  { symbol: 'BTC', price: 65000 },
  { symbol: 'ETH', price: 3500 },
  { symbol: 'SOL', price: 150 },
  { symbol: 'BNB', price: 550 },
  { symbol: 'XRP', price: 0.62 },
  { symbol: 'ADA', price: 0.45 },
  { symbol: 'DOGE', price: 0.18 },
  { symbol: 'TON', price: 6.8 },
  { symbol: 'TRX', price: 0.13 },
  { symbol: 'AVAX', price: 38 },
  { symbol: 'LINK', price: 18 },
  { symbol: 'DOT', price: 8.2 },
  { symbol: 'MATIC', price: 0.95 },
  { symbol: 'LTC', price: 92 },
  { symbol: 'BCH', price: 510 },
  { symbol: 'SHIB', price: 0.000028 },
  { symbol: 'UNI', price: 11 },
  { symbol: 'ATOM', price: 10.5 },
  { symbol: 'XLM', price: 0.14 },
  { symbol: 'ETC', price: 31 },
];

const round = (value: number, places = 2) => {
  const p = 10 ** places;
  return Math.round(value * p) / p;
};

export const createInitialMarketRows = (): MarketRow[] =>
  MARKET_SEED.map((m) => ({
    symbol: m.symbol,
    basePrice: m.price,
    price: m.price,
    changePercent: 0,
    direction: 'neutral',
  }));

export const evolveMarketRows = (rows: MarketRow[]) =>
  rows.map((asset) => {
    const jumpBoost = Math.random() < 0.14 ? 3.2 : 1;
    const drift = (Math.random() - 0.5) * 0.012 * jumpBoost;
    const nextPrice = Math.max(asset.basePrice * 0.08, asset.price * (1 + drift));
    const direction: MarketDirection =
      nextPrice > asset.price ? 'up' : nextPrice < asset.price ? 'down' : 'neutral';

    return {
      ...asset,
      price: nextPrice,
      changePercent: round(((nextPrice - asset.basePrice) / asset.basePrice) * 100, 2),
      direction,
    };
  });

export const formatMarketPrice = (value: number) => {
  if (value >= 1000) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (value >= 0.01) return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return value.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 });
};
