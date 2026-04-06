'use client';

import { useMemo, useState } from 'react';
import { Bot, Loader, Send, Sparkles, X } from 'lucide-react';

import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { investmentPlans } from '@/lib/data';
import { motion } from 'framer-motion';

type ChatMsg = {
  role: 'user' | 'assistant';
  text: string;
};

type AIChatWidgetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ApiHistoryMsg = {
  role: 'user' | 'model';
  content: { text: string }[];
};

export default function AIChatWidget({ open, onOpenChange }: AIChatWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const isOpen = typeof open === 'boolean' ? open : internalOpen;

  const setOpen = (next: boolean) => {
    if (typeof open !== 'boolean') setInternalOpen(next);
    onOpenChange?.(next);
  };

  const suggestedQuestions = [
    'Which plan is best for a beginner?',
    'What can I invest with my current wallet balance?',
    'Explain the difference between the plans in simple terms.',
    'What should I consider before investing?',
  ];

  const plansText = useMemo(() => {
    return investmentPlans
      .map(
        (p) =>
          `- ${p.name}: Invest USDT ${Number(p.amount).toLocaleString()} for ${
            p.duration
          } days, earn USDT ${Number(p.dailyProfit).toLocaleString()} daily, total return USDT ${Number(
            p.totalReturn
          ).toLocaleString()}`
      )
      .join('\n');
  }, []);

  const systemPrompt = useMemo(() => {
    return `
You are the Eco Solar Investment assistant.
Only answer investment-related questions about the plans and safe investing tips.
Be concise, clear, and helpful.
Do NOT promise guaranteed profits or guaranteed returns.

Available investment plans (USDT base):
${plansText}
    `.trim();
  }, [plansText]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const askAI = async (question: string) => {
    const history: ApiHistoryMsg[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      content: [{ text: m.text }],
    }));

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history,
        plans: plansText,
        system: systemPrompt,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message || 'AI request failed');
    }
    return String(data?.text || '').trim();
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const nextMessages: ChatMsg[] = [...messages, { role: 'user', text: content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await askAI(content);
      setMessages([...nextMessages, { role: 'assistant', text: reply || 'Sorry, I have no response.' }]);
    } catch (e) {
      console.error(e);
      setMessages([
        ...nextMessages,
        { role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ SMALLER MODERN FLOATING BOT BUTTON (hidden when chat open) */}
      {!open && (<motion.div
    className="floating-widget fixed right-3 bottom-[86px] z-[9999] sm:right-4 sm:bottom-[92px]"
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.18 }}
  >
    <motion.button
      type="button"
      onClick={handleOpen}
      aria-label="Open AI Chat"
      className="
        relative
        h-12 w-12 sm:h-14 sm:w-14
        rounded-full
        shadow-[0_14px_35px_rgba(245,158,11,0.45)]
        ring-1 ring-white/30
        overflow-hidden
        active:scale-[0.97]
        transition
      "
      style={{
        background:
          'linear-gradient(135deg, rgba(245,158,11,1) 0%, rgba(217,119,6,1) 100%)',
      }}
    >
      {/* Bot icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Bot className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
      </div>

      {/* Sparkle badge */}
      <div
        className="
          absolute -right-1 top-1
          h-6 w-6 sm:h-7 sm:w-7
          rounded-full
          bg-white
          border border-black/5
          shadow-[0_6px_14px_rgba(0,0,0,0.18)]
          flex items-center justify-center
        "
      >
        <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" />
      </div>
    </motion.button>
  </motion.div>
)}

      {/* ✅ Sheet Chat (no Link, no navigation) */}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col p-0 z-[10000]">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Investment Advisor
              </SheetTitle>

              <Button type="button" variant="ghost" size="icon" onClick={handleClose} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              Ask investment questions anytime. Suggestions below are optional.
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="text-center text-sm text-muted-foreground">
                    Ask me anything about our plans and investing.
                  </div>

                  <div className="grid gap-2">
                    {suggestedQuestions.map((q) => (
                      <Button
                        key={q}
                        type="button"
                        variant="outline"
                        className="justify-start text-left whitespace-normal"
                        onClick={() => handleSend(q)}
                        disabled={loading}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn('flex items-start gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-3 py-2 max-w-[85%] whitespace-pre-line text-sm',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask an investment question..."
                className="pr-12"
                disabled={loading}
              />

              <Button
                type="button"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3">
              <Button type="button" variant="outline" className="w-full" onClick={handleClose}>
                Close chat
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
