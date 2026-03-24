'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock3, Loader2, Send, ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  appendSessionMessage,
  formatCountdown,
  generateSupportReply,
  getSupportSessionById,
  markSessionActive,
  markSessionEnded,
  type SupportSession,
} from '@/lib/support-chat';

export default function SupportChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = String(params?.id || '');

  const [session, setSession] = useState<SupportSession | null>(null);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pendingReplyTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const found = getSupportSessionById(sessionId);
    setSession(found);
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session) return;

    if (session.status === 'waiting') {
      const wait = Math.max(0, session.joinedAt - Date.now());
      const timer = window.setTimeout(() => {
        let activated = markSessionActive(session);
        if (!activated.messages.some((m) => m.role === 'agent')) {
          activated = appendSessionMessage(activated, {
            role: 'agent',
            text: `Hello, I am ${activated.agent.name} (${activated.agent.title}). I have read your complaint and I am here to help.`,
          });
        }
        setSession(activated);
      }, wait);

      return () => window.clearTimeout(timer);
    }

    if (session.status !== 'ended' && Date.now() >= session.expiresAt) {
      const ended = markSessionEnded(session);
      setSession(ended);
    }
  }, [session, now]);

  useEffect(() => {
    return () => {
      if (pendingReplyTimeout.current) window.clearTimeout(pendingReplyTimeout.current);
    };
  }, []);

  const msLeft = useMemo(() => {
    if (!session) return 0;
    return session.expiresAt - now;
  }, [session, now]);

  const sessionEnded = !session || session.status === 'ended' || msLeft <= 0;

  const sendMessage = async () => {
    if (!session || sessionEnded || typing) return;
    const text = input.trim();
    if (!text) return;

    let next = appendSessionMessage(session, { role: 'user', text });
    setSession(next);
    setInput('');
    setTyping(true);

    const waitMs = 8_000 + Math.floor(Math.random() * 7_000); // 8-15s
    pendingReplyTimeout.current = window.setTimeout(() => {
      const latest = getSupportSessionById(next.id) ?? next;
      if (Date.now() >= latest.expiresAt || latest.status === 'ended') {
        const ended = markSessionEnded(latest);
        setSession(ended);
        setTyping(false);
        return;
      }

      const reply = generateSupportReply(text);
      next = appendSessionMessage(latest, { role: 'agent', text: reply });
      setSession(next);
      setTyping(false);
    }, waitMs);
  };

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Support chat not found</CardTitle>
            <CardDescription>Please open a new support request to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="rounded-2xl" onClick={() => router.push('/support/request')}>
              Open New Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="ghost" className="rounded-2xl" onClick={() => router.push('/support/request')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          New request
        </Button>

        <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm', sessionEnded ? 'text-red-600 border-red-300' : 'text-emerald-700 border-emerald-300')}>
          <Clock3 className="h-4 w-4" />
          {sessionEnded ? 'Session ended' : `Time left ${formatCountdown(msLeft)}`}
        </div>
      </div>

      <Card className="rounded-3xl shadow-xl">
        <CardHeader className="border-b">
          <CardTitle>{session.agent.name}</CardTitle>
          <CardDescription>{session.agent.title} • Support is active</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[52vh] px-4 py-4">
            <div className="space-y-3">
              {session.messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[84%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                      m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}

              {typing && !sessionEnded && (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {session.agent.name} is typing…
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            {sessionEnded && (
              <div className="mb-3 rounded-2xl border border-red-300/50 bg-red-500/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-red-700">
                  <ShieldAlert className="h-4 w-4" />
                  This chat session has ended after 20 minutes.
                </div>
                <p className="mt-1 text-muted-foreground">You cannot send more messages in this chat. Open a new request to continue.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={sessionEnded ? 'Chat ended. Open new request.' : 'Type your message...'}
                disabled={sessionEnded || typing}
                className="rounded-2xl"
              />
              <Button className="rounded-2xl" onClick={sendMessage} disabled={sessionEnded || typing || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
