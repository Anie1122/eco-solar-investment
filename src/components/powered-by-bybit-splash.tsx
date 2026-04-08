'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { STARTUP_SPLASH_DURATION_MS } from '@/lib/startup-transition';
import { useTheme } from 'next-themes';

type PoweredByBybitSplashProps = {
  onComplete?: () => void;
  playSound?: boolean;
};

function playStartupTone() {
  if (typeof window === 'undefined') return;
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;

  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.22);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.03, context.currentTime + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);

    setTimeout(() => {
      context.close().catch(() => undefined);
    }, 400);
  } catch {
    // Non-blocking fallback by design.
  }
}

export default function PoweredByBybitSplash({ onComplete, playSound = false }: PoweredByBybitSplashProps) {
  const prefersReducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onComplete?.();
    }, STARTUP_SPLASH_DURATION_MS);

    if (playSound && navigator.userActivation?.hasBeenActive) {
      playStartupTone();
    }

    return () => window.clearTimeout(timeout);
  }, [onComplete, playSound]);

  const reduced = Boolean(prefersReducedMotion);

  return (
    <motion.div
      className={`fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden ${
        isDark ? 'bg-black' : 'bg-zinc-100'
      }`}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.2 : 0.35, ease: 'easeOut' }}
      aria-live="polite"
      aria-label="Startup splash"
    >
      <motion.div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
          isDark ? 'bg-[#f7a600]/25' : 'bg-[#f7a600]/18'
        }`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: reduced ? 1 : 1.3, opacity: reduced ? 0.25 : [0, 0.35, 0.2] }}
        transition={{ duration: reduced ? 0.4 : 1.2, ease: 'easeOut' }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-px w-56 -translate-x-1/2 -translate-y-[76px] bg-gradient-to-r from-transparent via-[#f7a600] to-transparent"
        initial={{ opacity: 0, scaleX: 0.3 }}
        animate={{ opacity: reduced ? 0.75 : [0, 1, 0.65], scaleX: reduced ? 1 : [0.3, 1.05, 1] }}
        transition={{ duration: reduced ? 0.3 : 0.8, delay: reduced ? 0 : 0.4 }}
      />

      <div className="relative flex flex-col items-center px-6 text-center select-none">
        <motion.p
          className={`mb-4 text-[11px] tracking-[0.35em] sm:text-xs ${
            isDark ? 'text-white/80' : 'text-zinc-700'
          }`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.55 }}
        >
          POWERED BY
        </motion.p>

        <motion.h1
          className={`relative text-5xl font-extrabold tracking-[0.15em] sm:text-6xl ${
            isDark
              ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]'
              : 'text-zinc-900 drop-shadow-[0_0_24px_rgba(0,0,0,0.12)]'
          }`}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduced ? 0.2 : 0.7, delay: reduced ? 0.1 : 1.0, ease: 'easeOut' }}
        >
          BYB<span className="text-[#f7a600]">I</span>T
          <motion.span
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#f7a600]/30 to-transparent"
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ x: reduced ? '0%' : ['-120%', '120%'], opacity: reduced ? 0 : [0, 0.6, 0] }}
            transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 1.35 }}
          />
        </motion.h1>

        <motion.div
          className="mt-6 h-1 w-24 rounded-full bg-[#f7a600] shadow-[0_0_24px_rgba(247,166,0,0.8)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: reduced ? 0.65 : [0.25, 0.85, 0.45] }}
          transition={{ duration: reduced ? 0.25 : 1.6, delay: reduced ? 0.2 : 1.35, repeat: reduced ? 0 : 1 }}
        />
      </div>
    </motion.div>
  );
}
