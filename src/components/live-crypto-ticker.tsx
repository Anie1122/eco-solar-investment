'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type TickerRow = {
  symbol: string;
  priceUsd: number;
  change24h: number;
};

export default function LiveCryptoTicker() {
  const [rows, setRows] = useState<TickerRow[]>([]);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch('/api/crypto/prices', { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;
        if (json?.ok && Array.isArray(json?.ticker)) {
          setRows(json.ticker);
        }
      } catch (error) {
        console.error('ticker fetch failed', error);
      } finally {
        if (mounted) timer = setTimeout(load, 20_000);
      }
    };

    load();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const scrollingRows = useMemo(() => (rows.length ? [...rows, ...rows] : []), [rows]);

  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-md">
      <div className="ticker-track flex min-w-max gap-6 px-4 py-2">
        {scrollingRows.map((row, index) => {
          const positive = row.change24h >= 0;
          return (
            <div key={`${row.symbol}-${index}`} className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{row.symbol}</span>
              <span className="font-mono text-foreground/90">${row.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
              <span
                className={cn(
                  'font-medium',
                  positive ? 'text-emerald-500' : 'text-rose-500'
                )}
              >
                {positive ? '+' : ''}
                {row.change24h.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
