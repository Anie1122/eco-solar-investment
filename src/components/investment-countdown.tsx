'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface InvestmentCountdownProps {
  nextProfitAt: string | null;
  endsAt: string | null;
}

const pad = (num: number) => String(num).padStart(2, '0');

const CountdownDisplay = ({ time, label }: { time: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="font-mono text-lg font-semibold text-primary">{pad(time)}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default function InvestmentCountdown({ nextProfitAt, endsAt }: InvestmentCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      if (!nextProfitAt || !endsAt) {
        setTimeRemaining(-1);
        return;
      }

      const now = Date.now();
      const next = new Date(nextProfitAt).getTime();
      const end = new Date(endsAt).getTime();

      if (!Number.isFinite(next) || !Number.isFinite(end)) {
        setTimeRemaining(-1);
        return;
      }

      // Investment finished
      if (now >= end) {
        setTimeRemaining(-2);
        return;
      }

      // If next profit is after end date, stop countdown
      if (next > end) {
        setTimeRemaining(-2);
        return;
      }

      const remaining = Math.max(0, next - now);
      setTimeRemaining(remaining);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [nextProfitAt, endsAt]);

  if (timeRemaining === null) {
    return (
      <div className="mt-2 flex items-center justify-center gap-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Calculating next profit time...</span>
      </div>
    );
  }

  // No countdown data
  if (timeRemaining === -1) {
    return (
      <div className="mt-2 rounded-md bg-muted/50 p-2 text-center text-sm text-muted-foreground">
        Countdown unavailable
      </div>
    );
  }

  // Completed
  if (timeRemaining === -2) {
    return (
      <div className="mt-2 rounded-md bg-muted/50 p-2 text-center text-sm text-muted-foreground">
        Investment Completed
      </div>
    );
  }

  // If time is up, show processing state (cron / backend will credit soon)
  if (timeRemaining <= 0) {
    return (
      <div className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary/10 p-2 text-sm text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Profit processing...</span>
      </div>
    );
  }

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  return (
    <div className="mt-4 rounded-lg bg-muted/50 p-3">
      <div className="mb-2 text-center text-xs font-semibold text-muted-foreground">
        NEXT PROFIT IN
      </div>
      <div className="flex items-center justify-center gap-4">
        <CountdownDisplay time={hours} label="HRS" />
        <span className="-translate-y-2 text-2xl font-bold text-primary/50">:</span>
        <CountdownDisplay time={minutes} label="MINS" />
        <span className="-translate-y-2 text-2xl font-bold text-primary/50">:</span>
        <CountdownDisplay time={seconds} label="SECS" />
      </div>
    </div>
  );
}
