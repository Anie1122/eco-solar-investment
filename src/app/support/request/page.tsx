'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, MessageCircleWarning } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { createSupportSession } from '@/lib/support-chat';

const MIN_LEN = 74;

export default function SupportRequestPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<'form' | 'waiting' | 'joined'>('form');
  const [agentName, setAgentName] = useState('');

  const remaining = useMemo(() => Math.max(0, MIN_LEN - message.trim().length), [message]);
  const canSubmit = !submitting && message.trim().length >= MIN_LEN;

  const submitRequest = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const session = createSupportSession(message.trim());
    setAgentName(session.agent.name);
    setPhase('waiting');

    window.setTimeout(() => {
      setPhase('joined');
      window.setTimeout(() => {
        router.push(`/support/chat/${session.id}`);
      }, 1200);
    }, 5000);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-4">
        <Button variant="ghost" className="rounded-2xl" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="rounded-3xl border-muted/50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MessageCircleWarning className="h-5 w-5 text-amber-500" />
            Customer Service Request
          </CardTitle>
          <CardDescription>
            Describe your complaint clearly. Minimum of {MIN_LEN} characters so support can help faster.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {phase === 'form' && (
            <>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please explain your issue in detail (transaction ID, date, amount, and what happened)..."
                className="min-h-[190px] rounded-2xl"
                disabled={submitting}
              />
              <div className="flex items-center justify-between text-sm">
                <span className={remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                  {remaining > 0 ? `${remaining} more characters required` : 'Good detail level ✅'}
                </span>
                <span className="text-muted-foreground">{message.trim().length}/{MIN_LEN} min</span>
              </div>

              <Button className="w-full rounded-2xl h-12" onClick={submitRequest} disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending request...
                  </>
                ) : (
                  'Send Request'
                )}
              </Button>
            </>
          )}

          {phase === 'waiting' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-muted/20 p-6 text-center"
            >
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-500" />
              <p className="mt-3 font-medium">Waiting for support to join…</p>
              <p className="text-sm text-muted-foreground mt-1">Please hold on for a few seconds.</p>
            </motion.div>
          )}

          {phase === 'joined' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-6 text-center"
            >
              <p className="font-semibold">{agentName} joined the chat.</p>
              <p className="text-sm text-muted-foreground mt-1">Connecting you to live support…</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
