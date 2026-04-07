'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  createInitialMarketRows,
  evolveMarketRows,
  formatMarketPrice,
  type MarketDirection,
  type MarketRow,
} from '@/lib/market-sim';

type TickerRow = MarketRow & { flash: MarketDirection };

export default function LiveCryptoTicker() {
  const [rows, setRows] = useState<TickerRow[]>(() =>
    createInitialMarketRows().map((m) => ({ ...m, flash: 'neutral' }))
  );
  const clearFlashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setRows((prev) => {
        const nextRows = evolveMarketRows(prev);
        return nextRows.map((asset, idx) => {
          const dir = asset.direction;

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
            flash: dir === 'neutral' ? prev[idx].flash : dir,
          };
        });
      });
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

              <div className="ticker-price">${formatMarketPrice(row.price)}</div>

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
