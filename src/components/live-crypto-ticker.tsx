'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Dir = 'up' | 'down' | 'neutral';

type MarketRow = {
  symbol: string;
  basePrice: number;
  price: number;
  changePercent: number;
  direction: Dir;
  flash: Dir;
};

const MARKET_SEED: Array<{ symbol: string; price: number }> = [
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

const formatPrice = (value: number) => {
  if (value >= 1000) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (value >= 0.01) return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return value.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 });
};

const buildInitialRows = (): MarketRow[] =>
  MARKET_SEED.map((m) => ({
    symbol: m.symbol,
    basePrice: m.price,
    price: m.price,
    changePercent: 0,
    direction: 'neutral',
    flash: 'neutral',
  }));

export default function LiveCryptoTicker() {
  const [rows, setRows] = useState<MarketRow[]>(() => buildInitialRows());
  const clearFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setRows((prev) =>
        prev.map((asset) => {
          const jumpBoost = Math.random() < 0.14 ? 3.2 : 1;
          const drift = (Math.random() - 0.5) * 0.012 * jumpBoost;
          const nextPrice = Math.max(asset.basePrice * 0.08, asset.price * (1 + drift));
          const dir: Dir = nextPrice > asset.price ? 'up' : nextPrice < asset.price ? 'down' : 'neutral';
          const changePercent = round(((nextPrice - asset.basePrice) / asset.basePrice) * 100, 2);

          if (dir !== 'neutral') {
            if (clearFlashTimers.current[asset.symbol]) {
              clearTimeout(clearFlashTimers.current[asset.symbol]);
            }
            clearFlashTimers.current[asset.symbol] = setTimeout(() => {
              setRows((latest) =>
                latest.map((item) => (item.symbol === asset.symbol ? { ...item, flash: 'neutral' } : item))
              );
            }, 420);
          }

          return {
            ...asset,
            price: nextPrice,
            changePercent,
            direction: dir,
            flash: dir === 'neutral' ? asset.flash : dir,
          };
        })
      );
    }, 1400);

    return () => {
      clearInterval(interval);
      Object.values(clearFlashTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const loopRows = useMemo(() => [...rows, ...rows], [rows]);

  return (
    <section className="ticker-shell">
      <div className="ticker-track flex w-max items-center gap-2.5 py-2">
        {loopRows.map((row, idx) => {
          const isUp = row.changePercent > 0;
          const isDown = row.changePercent < 0;
          return (
            <article
              key={`${row.symbol}-${idx}`}
              className={cn(
                'ticker-item',
                row.flash === 'up' && 'price-flash-up',
                row.flash === 'down' && 'price-flash-down'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-zinc-100">{row.symbol}</span>
                <span className="ticker-pair">/USDT</span>
              </div>

              <div className="ticker-price">${formatPrice(row.price)}</div>

              <div
                className={cn(
                  'ticker-change',
                  isUp && 'text-emerald-400',
                  isDown && 'text-rose-400',
                  !isUp && !isDown && 'text-zinc-400'
                )}
              >
                {row.direction === 'up' ? '▲' : row.direction === 'down' ? '▼' : '•'}{' '}
                {isUp ? '+' : ''}
                {row.changePercent.toFixed(2)}%
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
