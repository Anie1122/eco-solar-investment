'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  createInitialMarketRows,
  evolveMarketRows,
  formatMarketPrice,
  type MarketDirection,
  type MarketRow,
} from '@/lib/market-sim';

type BoardRow = MarketRow & { flash: MarketDirection };

export default function LiveMarketBoard() {
  const [rows, setRows] = useState<BoardRow[]>(() =>
    createInitialMarketRows().map((r) => ({ ...r, flash: 'neutral' }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRows((prev) =>
        evolveMarketRows(prev).map((row, idx) => ({
          ...row,
          flash: row.direction === 'neutral' ? prev[idx].flash : row.direction,
        }))
      );
    }, 1600);

    return () => clearInterval(interval);
  }, []);

  const topRows = useMemo(() => rows.slice(0, 10), [rows]);

  return (
    <section className="w-full max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#090d14] p-3 text-zinc-100 shadow-[0_20px_48px_rgba(0,0,0,0.45)] sm:p-4">
      <div className="mb-3 rounded-full bg-[#151c27] px-4 py-2 text-sm text-zinc-400">Search USDT pairs</div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="rounded-full bg-[#1b2432] px-3 py-1.5 font-semibold text-white">Hot</span>
        <span className="text-zinc-500">Gainers</span>
        <span className="text-zinc-500">Losers</span>
      </div>

      <div className="space-y-2">
        {topRows.map((row) => {
          const up = row.changePercent > 0;
          const down = row.changePercent < 0;
          return (
            <div
              key={row.symbol}
              className={cn(
                'flex items-center justify-between rounded-xl px-2.5 py-2.5 transition-colors duration-300',
                row.flash === 'up' ? 'bg-emerald-500/10' : row.flash === 'down' ? 'bg-rose-500/10' : 'bg-transparent'
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {row.symbol} <span className="text-zinc-500">/ USDT</span>
                </p>
                <p className="text-xs text-zinc-500">{formatMarketPrice(row.price)} USDT</p>
              </div>

              <div className="flex items-center gap-3">
                <p className="font-mono text-base font-semibold">{formatMarketPrice(row.price)}</p>
                <div
                  className={cn(
                    'min-w-[88px] rounded-full px-3 py-1.5 text-center font-semibold tabular-nums',
                    up ? 'bg-emerald-500 text-white' : down ? 'bg-rose-500 text-white' : 'bg-zinc-700 text-zinc-100'
                  )}
                >
                  {up ? '+' : ''}
                  {row.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
