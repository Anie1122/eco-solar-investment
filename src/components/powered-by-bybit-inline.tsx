'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type PoweredByBybitInlineProps = {
  className?: string;
  centered?: boolean;
};

export default function PoweredByBybitInline({ className, centered = true }: PoweredByBybitInlineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-lg border border-[#f7a600]/25 bg-black/70 px-3 py-2 text-white/90 shadow-[0_0_24px_rgba(247,166,0,0.12)] backdrop-blur-sm',
        centered ? 'mx-auto w-fit text-center' : 'w-full',
        className
      )}
    >
      <span className="block text-[10px] uppercase tracking-[0.24em] text-white/75">Powered by</span>
      <span className="relative block text-sm font-bold tracking-[0.18em]">
        BYB<span className="text-[#f7a600]">I</span>T
        <motion.span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#f7a600]/25 to-transparent"
          initial={{ x: '-120%', opacity: 0 }}
          animate={{ x: ['-120%', '120%'], opacity: [0, 0.5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
        />
      </span>
    </motion.div>
  );
}
