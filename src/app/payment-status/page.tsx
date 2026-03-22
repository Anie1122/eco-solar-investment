'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment, please wait...');

  // ✅ prevents double-run / spam toasts in StrictMode
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const paymentStatus = searchParams.get('status');
    const tx_ref = searchParams.get('tx_ref');
    const transaction_id = searchParams.get('transaction_id');

    if (paymentStatus === 'cancelled') {
      setStatus('failed');
      setMessage('You cancelled the payment. Your wallet has not been charged.');
      toast({
        variant: 'destructive',
        title: 'Payment Cancelled',
        description: 'The payment process was not completed.',
      });
      return;
    }

    if (!paymentStatus || !tx_ref || !transaction_id) {
      setStatus('error');
      setMessage('Invalid payment details. Could not verify transaction.');
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Missing payment information in the redirect URL.',
      });
      return;
    }

    if (paymentStatus !== 'successful') {
      setStatus('failed');
      setMessage(`Your payment was not successful. Reason: ${paymentStatus}. Please try again.`);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: `Reason: ${paymentStatus}`,
      });
      return;
    }

    // ✅ success path
    setStatus('success');
    setMessage('Your transaction is processing. Your balance will be updated shortly once confirmed.');
    toast({
      title: 'Payment Processing',
      description: 'Your wallet will be credited once payment is confirmed by our servers.',
    });
  }, [searchParams, toast]);

  const renderIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader className="h-16 w-16 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'failed':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-16 w-16 text-destructive" />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">{renderIcon()}</div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying...'}
            {status === 'success' && 'Payment Processing'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'error' && 'Verification Issue'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}
