'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Loader, Sparkles, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { User } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { motion } from 'framer-motion';
import AIChatWidget from './ai-chat-widget';

// ✅ NEW
import { useCurrencyConverter } from '@/lib/currency';
import { investmentPlans } from '@/lib/data';

interface AiSuggestionCardProps {
  userProfile: User | null;
  isLoading: boolean;
}

export default function AiSuggestionCard({
  userProfile,
  isLoading,
}: AiSuggestionCardProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const retryTimer = useRef<any>(null);
  const { toast } = useToast();

  // ✅ Use same converter used by wallet/airtime cards
  const { convert, format } = useCurrencyConverter(userProfile?.currency);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const buildPlansTextForAI = () => {
    // Plans in /lib/data are USDT base, convert to user's currency for display
    return investmentPlans
      .map((plan) => {
        const amount = convert(plan.amount);
        const weekly = convert(plan.weeklyProfit);
        const total = convert(plan.totalReturn);

        return `- ${plan.name}: Invest ${format(amount)} for ${plan.durationWeeks} weeks, earn ${format(
          weekly
        )} weekly, total return ${format(total)}.`;
      })
      .join('\n');
  };

  const handleGetSuggestion = async () => {
    if (!userProfile) return;
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const walletBalanceNGN = Number(userProfile.walletBalance ?? 0);

      // ✅ Display-friendly values (user currency)
      const walletBalanceDisplay = format(convert(walletBalanceNGN));
      const plansText = buildPlansTextForAI();

      const res = await fetch('/api/ai/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: userProfile.country,
          currency: userProfile.currency,

          // ✅ USDT base (server uses this to check affordability)
          walletBalance: walletBalanceNGN,

          // ✅ NEW: user-currency display values
          walletBalanceDisplay,
          plansText,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg = String(data?.message || 'Failed to get suggestion.');

        // auto-retry if model is warming up (Hugging Face)
        const warmupMatch = msg.match(/Try again in ~(\d+)s/i);
        if (warmupMatch?.[1]) {
          const secs = Number(warmupMatch[1]);
          setError(`${msg} Auto retrying...`);
          retryTimer.current = setTimeout(() => {
            handleGetSuggestion();
          }, Math.min(Math.max(secs, 2), 20) * 1000);
        } else {
          setError(msg);
        }

        throw new Error(msg);
      }

      const text = String(data.suggestion || '').trim();
      if (!text) throw new Error('AI returned empty suggestion.');

      setSuggestion(text);
    } catch (e: any) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: String(
          e?.message || 'Could not fetch investment suggestion.'
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="sm:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>Personalized Suggestion</span>
          </CardTitle>
          <CardDescription>
            Let our AI find the perfect investment plan for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="sm:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [1, 0.75, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-6 w-6 text-primary" />
          </motion.div>
          <span>Personalized Suggestion</span>
        </CardTitle>
        <CardDescription>
          Let our AI find the perfect investment plan for you.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        {!suggestion && !loading && !error && (
          <div className="flex min-h-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50 p-6 text-center">
            <h3 className="text-lg font-medium">Ready to Invest?</h3>
            <p className="text-sm text-muted-foreground">
              Click the button below to get a personalized recommendation.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex min-h-[100px] items-center justify-center gap-2 text-muted-foreground">
            <Loader className="h-5 w-5 animate-spin" />
            <span>Finding the best plan for you...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>AI Error</AlertTitle>
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {suggestion && (
          <Alert className="border-primary/50 bg-primary/5">
            <ThumbsUp className="h-4 w-4 !text-primary" />
            <AlertTitle className="font-bold text-primary">
              Recommendation
            </AlertTitle>
            <AlertDescription className="text-foreground whitespace-pre-line">
              {suggestion}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <motion.div
          className="w-full"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Button
            onClick={handleGetSuggestion}
            disabled={loading || !userProfile?.country || !userProfile?.currency}
            className="w-full"
          >
            {loading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Get Suggestion
          </Button>
        </motion.div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setChatOpen(true)}
          disabled={loading}
          className="h-10 w-10 rounded-full border-amber-400/50 bg-amber-500/10 p-0"
          aria-label="Open AI bot chat"
        >
          <Bot className="h-4 w-4 text-amber-600" />
        </Button>
      </CardFooter>
      <AIChatWidget open={chatOpen} onOpenChange={setChatOpen} showFloatingTrigger={false} />
    </Card>
  );
}
