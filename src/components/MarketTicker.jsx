'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const BASE_MARKETS = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', price: 68420, change: 2.34, volatility: 0.005 },
  { symbol: 'ETH/USDT', name: 'Ethereum', price: 3525, change: 1.82, volatility: 0.007 },
  { symbol: 'SOL/USDT', name: 'Solana', price: 162.45, change: 3.12, volatility: 0.012 },
  { symbol: 'USDC/USDT', name: 'USD Coin', price: 0.9998, change: -0.01, volatility: 0.0004 },
];

const formatPrice = (value) =>
  value >= 1000
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

export default function MarketTicker() {
  const [markets, setMarkets] = useState(BASE_MARKETS);
  const [flashState, setFlashState] = useState({});
  const clearTimers = useRef({});
  const prevPricesRef = useRef(
    Object.fromEntries(BASE_MARKETS.map((m) => [m.symbol, m.price]))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMarkets((prev) => {
        const next = prev.map((m) => {
          const drift = (Math.random() - 0.5) * 2 * m.volatility;
          const nextPrice = Math.max(0.0001, m.price * (1 + drift));
          const nextChange = m.change + drift * 100;
          return {
            ...m,
            price: Number(nextPrice.toFixed(6)),
            change: Number(nextChange.toFixed(2)),
          };
        });

        setFlashState((flashPrev) => {
          const flashNext = { ...flashPrev };

          next.forEach((m) => {
            const oldPrice = prevPricesRef.current[m.symbol];
            if (typeof oldPrice !== 'number' || oldPrice === m.price) return;

            const direction = m.price > oldPrice ? 'up' : 'down';
            flashNext[m.symbol] = direction;

            if (clearTimers.current[m.symbol]) {
              clearTimeout(clearTimers.current[m.symbol]);
            }

            clearTimers.current[m.symbol] = setTimeout(() => {
              setFlashState((current) => ({ ...current, [m.symbol]: null }));
            }, 520);
          });

          return flashNext;
        });

        prevPricesRef.current = Object.fromEntries(next.map((m) => [m.symbol, m.price]));
        return next;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      Object.values(clearTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  const rows = useMemo(() => markets, [markets]);

   return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1221] text-white shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-base font-semibold tracking-wide">Market</h3>
        <span className="text-xs text-zinc-400">Updates every 2s</span>
      </div>

      <div className="divide-y divide-white/10">
        {rows.map((row) => {
          const positive = row.change >= 0;
          const flash = flashState[row.symbol];
          return (
            <div
              key={row.symbol}
              className={`grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 px-4 py-3 transition-colors duration-500 ${
                flash === 'up'
                  ? 'bg-emerald-500/20'
                  : flash === 'down'
                    ? 'bg-rose-500/20'
                    : 'bg-transparent'
              }`}
            >
              <div>
                <p className="font-semibold">{row.symbol}</p>
                <p className="text-xs text-zinc-400">{row.name}</p>
              </div>
              <p className="font-mono text-right tabular-nums">{formatPrice(row.price)}</p>

              <div
                className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                  positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {positive ? '+' : ''}
                {row.change.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
