'use client';

import { useState } from 'react';
import AIChatWidget from '@/components/ai-chat-widget';
import CustomerServiceWidget from '@/components/customer-service-widget';

export default function FloatingActions() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* ✅ Both floating buttons (stacked) */}
      <CustomerServiceWidget hidden={chatOpen} />
      <AIChatWidget open={chatOpen} onOpenChange={setChatOpen} />

      {/* (When chatOpen = true, CustomerServiceWidget hides,
          and AIChatWidget button also hides inside AIChatWidget) */}
    </>
  );
}
