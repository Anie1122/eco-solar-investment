'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import PoweredByBybitSplash from '@/components/powered-by-bybit-splash';
import {
  consumeQueuedStartupSplash,
  isStartupSoundEnabled,
  queueStartupSplash,
  shouldShowAppOpenSplash,
} from '@/lib/startup-transition';
import { supabase } from '@/lib/supabaseClient';

export default function StartupTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(false);
  const hasShownOnPathRef = useRef<string | null>(null);

  useEffect(() => {
    const queued = consumeQueuedStartupSplash();
    if (queued) {
      setShowSplash(true);
      return;
    }

    if (shouldShowAppOpenSplash() && hasShownOnPathRef.current !== pathname) {
      hasShownOnPathRef.current = pathname;
      setShowSplash(true);
    }
  }, [pathname]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        queueStartupSplash('logout');
        setShowSplash(true);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <PoweredByBybitSplash
            playSound={isStartupSoundEnabled()}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
