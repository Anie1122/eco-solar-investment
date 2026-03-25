'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function CustomerServiceWidget({ hidden }: { hidden?: boolean }) {
  const phone = '12816923156'; // ✅ +1 (281) 692-3156
  const text = encodeURIComponent(
    'Hi, I need help with Eco Solar Investment. Please assist me.'
  );

  return (
    <motion.div
      className={cn(
        // ✅ PUSHED UP: will not block bottom nav
        'floating-widget fixed right-5 bottom-[148px] z-[9999]',
        hidden ? 'hidden' : 'block'
      )}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Link
          href={`https://wa.me/${phone}?text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Customer support on WhatsApp"
        >
          {/* ✅ WHITE CIRCLE EXACT LOOK */}
          <div
            className="
              h-14 w-14 rounded-full
              bg-white/95
              border border-black/5
              shadow-[0_14px_30px_rgba(0,0,0,0.18)]
              backdrop-blur-xl
              flex items-center justify-center
              active:scale-[0.97]
              transition
            "
          >
            {/* ✅ simple chat bubble icon (same vibe as your image) */}
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
            </svg>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
}
