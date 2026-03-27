'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const BASE_MARKETS = [
  { symbol: 'BTC', price: 68760.0, change: -3.51, volume: '844.77M USDT', volatility: 0.0022 },
  { symbol: 'ETH', price: 2060.74, change: -4.8, volume: '272.13M USDT', volatility: 0.0028 },
  { symbol: 'SOL', price: 86.37, change: -5.78, volume: '94.89M USDT', volatility: 0.0042 },
  { symbol: 'USDC', price: 1.0004, change: 0.02, volume: '176.08M USDT', volatility: 0.00008 },
];

const COIN_BRAND = {
  BTC: { icon: '₿', bg: 'bg-[#f7931a]', fg: 'text-black' },
  ETH: { icon: '◆', bg: 'bg-zinc-100', fg: 'text-black' },
  SOL: { icon: '◈', bg: 'bg-white', fg: 'text-violet-600' },
  USDC: { icon: '$', bg: 'bg-[#2775ca]', fg: 'text-white' },
};

function formatPrice(value) {
  if (value >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (value >= 10) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export default function MarketTicker() {
  const [markets, setMarkets] = useState(BASE_MARKETS);
  const [flashDirection, setFlashDirection] = useState({});
  const previousPriceRef = useRef(Object.fromEntries(BASE_MARKETS.map((m) => [m.symbol, m.price])));
  const flashTimersRef = useRef({});

  useEffect(() => {
    const interval = setInterval(() => {
      setMarkets((current) => {
        const next = current.map((coin) => {
          const randomDrift = (Math.random() - 0.5) * 2 * coin.volatility;
          const nextPrice = Math.max(0.0001, coin.price * (1 + randomDrift));
          const nextChange = Math.max(-99, Math.min(99, coin.change + randomDrift * 45));

          return {
            ...coin,
            price: Number(nextPrice.toFixed(6)),
            change: Number(nextChange.toFixed(2)),
          };
        });

        setFlashDirection((currentFlash) => {
          const flashUpdate = { ...currentFlash };

          next.forEach((coin) => {
            const previous = previousPriceRef.current[coin.symbol];
            if (typeof previous !== 'number' || previous === coin.price) return;

            flashUpdate[coin.symbol] = coin.price > previous ? 'up' : 'down';

            if (flashTimersRef.current[coin.symbol]) {
              clearTimeout(flashTimersRef.current[coin.symbol]);
            }

            flashTimersRef.current[coin.symbol] = setTimeout(() => {
              setFlashDirection((latest) => ({ ...latest, [coin.symbol]: null }));
            }, 420);
          });

          return flashUpdate;
        });

        previousPriceRef.current = Object.fromEntries(next.map((coin) => [coin.symbol, coin.price]));
        return next;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      Object.values(flashTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const rows = useMemo(() => markets, [markets]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0d14] p-3 text-white shadow-[0_22px_65px_rgba(0,0,0,0.45)]">
      <div className="mb-2 flex items-center px-2 py-1">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-200">Live Market</h3>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const positive = row.change >= 0;
          const flash = flashDirection[row.symbol];
          const brand = COIN_BRAND[row.symbol] || { icon: row.symbol.slice(0, 1), bg: 'bg-zinc-700', fg: 'text-white' };

          return (
            <div
              key={row.symbol}
              className={`grid grid-cols-[1.5fr_1fr_auto] items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 ${
                flash === 'up'
                  ? 'price-flash-up'
                  : flash === 'down'
                    ? 'price-flash-down'
                    : 'bg-[#111522]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold ${brand.bg} ${brand.fg}`}>
                  {brand.icon}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold leading-tight">
                    {row.symbol}
                    <span className="ml-1 text-zinc-400">/ USDT</span>
                  </p>
                  <p className="truncate text-sm text-zinc-500">{row.volume}</p>
                </div>
              </div>

              <p className="text-right font-mono text-xl font-semibold tabular-nums">{formatPrice(row.price)}</p>

              <div
                className={`inline-flex min-w-[104px] justify-center rounded-full px-3 py-2 text-lg font-semibold tabular-nums ${
                  positive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {positive ? '+' : ''}
                {row.change.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
