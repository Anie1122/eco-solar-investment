'use client';

import { Send } from 'lucide-react';
import CustomerServiceWidget from '@/components/customer-service-widget';

export default function FloatingActions() {
  return (
    <>
      <CustomerServiceWidget />
      <a
        href="https://t.me/Eco_Solar_Properties"
        target="_blank"
        rel="noreferrer"
        aria-label="Open Telegram channel"
        className="fixed bottom-[82px] right-4 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-[0_14px_35px_rgba(34,158,217,0.45)] ring-1 ring-white/30 transition active:scale-[0.97]"
      >
        <Send className="h-7 w-7" />
      </a>
    </>
  );
}
