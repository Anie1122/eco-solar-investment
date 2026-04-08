'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { AlertTriangle, Copy } from 'lucide-react';
import PoweredByBybitInline from '@/components/powered-by-bybit-inline';

type CryptoChain = {
  key: 'erc20' | 'trc20' | 'bep20' | 'polygon' | 'sol' | 'ton';
  label: string;
  logo: string;
  receiveLabel: string;
  address: string;
  warningLines: string[];
  memoText?: string;
  qrImage: string;
  learnMoreText?: string;
};

// QR images are static assets mapped per chain (reference screenshots), never runtime-generated.
const CRYPTO_CHAINS: CryptoChain[] = [
  {
    key: 'erc20',
    label: 'Ethereum (ERC20)',
    receiveLabel: 'USDT ERC20',
    logo: '/chains/erc20.svg',
    address: '0x2B9230d5fb0D0E8588004F9a67666aC0B474E99A',
    warningLines: [
      'Only send Tether (ERC20) assets to this address. Other assets will be lost forever.',
    ],
    qrImage: '/qrs/usdt_erc20.png',
  },
  {
    key: 'trc20',
    label: 'TRON (TRC20)',
    receiveLabel: 'USDT TRC20',
    logo: '/chains/trc20.svg',
    address: 'TLE1UFkwpXHuDQsV8JCg7Yv2ZZhQzwR27i',
    warningLines: [
      'Only send Tether (TRC20) assets to this address. Other assets will be lost forever.',
    ],
    memoText: 'No memo required',
    qrImage: '/qrs/usdt_trc20.png',
  },
  {
    key: 'bep20',
    label: 'BSC (BEP20)',
    receiveLabel: 'USDT BEP20',
    logo: '/chains/bep20.svg',
    address: '0x2B9230d5fb0D0E8588004F9a67666aC0B474E99A',
    warningLines: [
      'Only send Tether USD (BEP20) assets to this address. Other assets will be lost forever.',
    ],
    qrImage: '/qrs/usdt_bep20.png',
  },
  {
    key: 'polygon',
    label: 'Polygon PoS',
    receiveLabel: 'USDT POLYGON',
    logo: '/chains/polygon.svg',
    address: '0x2B9230d5fb0D0E8588004F9a67666aC0B474E99A',
    warningLines: [
      'Only send (PoS) Tether USD (POLYGON) assets to this address. Other assets will be lost forever.',
    ],
    qrImage: '/qrs/usdt_polygon.png',
  },
  {
    key: 'sol',
    label: 'SOL',
    receiveLabel: 'USDT SPL',
    logo: '/chains/sol.svg',
    address: 'vqohfmqEYWKwofdzvVJaTFZvLBNvnBZyhKwBqA9UxER',
    warningLines: [
      'Only send USDT (SPL) assets to this address. Other assets will be lost forever.',
    ],
    memoText: 'No memo required',
    qrImage: '/qrs/usdt_spl.png',
  },
  {
    key: 'ton',
    label: 'TON',
    receiveLabel: 'USDT JETTON',
    logo: '/chains/ton.svg',
    address: 'UQAM_ywutAgLDsOHqXcVWzLes82XpCyBzv4HJlgRM72flgF_',
    warningLines: [
      'Only send Tether USD (JETTON) assets to this address. Other assets will be lost forever.',
      'TON network now displays wallet address differently. This, however, will not affect the safety of funds stored in your wallet.',
    ],
    memoText: 'No memo required',
    qrImage: '/qrs/usdt_jetton.png',
    learnMoreText: 'Learn more',
  },
];

export default function DepositCheckoutPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = String(params?.id || '');
  const mode = String(search.get('mode') || 'local_bank_transfer');

  const [amountText, setAmountText] = useState('');
  const [countdown, setCountdown] = useState(20 * 60);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedChain, setSelectedChain] = useState<CryptoChain | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token || !id) return;

      const { data: tx } = await supabase
        .from('transactions')
        .select('id,metadata')
        .eq('id', id)
        .maybeSingle();

      const amountInput = Number((tx as any)?.metadata?.amountInput ?? 0);
      const inputCurrency = String((tx as any)?.metadata?.inputCurrency ?? 'USDT');
      setAmountText(`${amountInput.toLocaleString()} ${inputCurrency}`);
    };
    run();
  }, [id]);

  useEffect(() => {
    setCountdown(mode === 'crypto_checkout' || mode === 'crypto' ? 30 * 60 : 20 * 60);
  }, [mode]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const timeLabel = useMemo(() => {
    const m = String(Math.floor(countdown / 60)).padStart(2, '0');
    const s = String(countdown % 60).padStart(2, '0');
    return `${m}:${s}`;
  }, [countdown]);

  const cancelTx = async () => {
    await supabase.from('transactions').update({ status: 'failed' }).eq('id', id);
    toast({ title: 'Cancelled', description: 'This transaction has been cancelled.' });
    router.push('/wallet');
  };

  const uploadReceipt = async () => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Receipt must be 5MB or below.' });
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/deposits/upload-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ txId: id, receiptDataUrl: base64, receiptFileName: file.name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed');

      toast({ title: 'Request sent', description: 'Receipt submitted successfully.' });
      router.push('/history');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e?.message || 'Could not upload receipt.' });
    } finally {
      setUploading(false);
    }
  };

  const selectChain = async (chain: CryptoChain) => {
    setChainLoading(true);
    setSelectedChain(null);
    await new Promise((r) => setTimeout(r, 5000));
    setSelectedChain(chain);
    setChainLoading(false);
  };

  const copyAddress = async () => {
    if (!selectedChain?.address) return;
    await navigator.clipboard.writeText(selectedChain.address);
    toast({ title: 'Copied', description: 'Wallet address copied successfully.' });
  };

  if (mode === 'crypto_checkout' || mode === 'crypto') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 space-y-4">
        <PoweredByBybitInline />
        <Card>
          <CardHeader>
            <CardTitle>Deposit USDT (Crypto Checkout)</CardTitle>
            <CardDescription>
              Select a chain before sending funds. Timer: <b>{timeLabel}</b>.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CRYPTO_CHAINS.map((chain) => (
                <button
                  key={chain.key}
                  onClick={() => selectChain(chain)}
                  disabled={chainLoading}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left ${
                    selectedChain?.key === chain.key ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                >
                  <Image src={chain.logo} alt={chain.label} width={32} height={32} className="rounded-md" />
                  <span className="font-medium">{chain.label}</span>
                </button>
              ))}
            </div>

            {chainLoading ? (
              <div className="flex items-center gap-3 rounded-xl border p-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
                <p className="text-sm">Preparing deposit details for your selected chain...</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedChain ? (
          <Card className="bg-black text-white border-white/10">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-3xl font-bold">{selectedChain.receiveLabel}</h3>
              <p className="text-2xl"><span className="text-zinc-400">Network:</span> {selectedChain.label}</p>

              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-yellow-200 text-sm">
                <p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Important</p>
                {selectedChain.warningLines.map((line) => (
                  <p key={line} className="mt-1">
                    {selectedChain.key === 'ton' ? '• ' : ''}
                    {line}
                  </p>
                ))}
                {selectedChain.learnMoreText ? (
                  <p className="mt-2 underline underline-offset-2">{selectedChain.learnMoreText}</p>
                ) : null}
              </div>

              <div className="mx-auto w-fit rounded-2xl bg-white p-3">
                <img src={selectedChain.qrImage} alt={`${selectedChain.label} QR`} width={280} height={280} />
              </div>

              <div>
                <p className="mb-1 text-xl text-zinc-400">Wallet Address</p>
                <p className="break-all text-3xl font-medium">{selectedChain.address}</p>
              </div>

              {selectedChain.memoText ? (
                <div>
                  <p className="text-zinc-400 text-xl mb-1">Memo</p>
                  <p className="text-lg font-medium">{selectedChain.memoText}</p>
                </div>
              ) : null}

              <Button onClick={copyAddress} className="w-full" variant="secondary">
                <Copy className="mr-2 h-4 w-4" /> Copy address
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={cancelTx} className="flex-1">
                  Cancel Transaction
                </Button>
                <Button onClick={() => setShowUpload(true)} className="flex-1">
                  I&apos;ve made my payment
                </Button>
              </div>

              {showUpload ? (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-300">Upload payment receipt photo (max 5MB)</p>
                  <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <Button onClick={uploadReceipt} disabled={!file || uploading} className="w-full">
                    {uploading ? 'Sending request...' : 'Send Request'}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-4">
      <PoweredByBybitInline />
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>PALMPAY CHECKOUT</CardTitle>
          <CardDescription>Send the exact amount to avoid payment failure.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input value={amountText} disabled readOnly />

          <div className="space-y-1 rounded-xl border p-3 text-sm">
            <div>
              <b>ACCOUNT NUMBER:</b> 8911-594-588
            </div>
            <div>
              <b>BANK:</b> palmpay
            </div>
            <div>
              <b>NAME:</b> Ndifreke Okon Edet (ECO-SOLAR)
            </div>
          </div>

          <p className="text-sm">
            Time left: <b>{timeLabel}</b>
          </p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelTx} className="flex-1">
              Cancel Transaction
            </Button>
            <Button onClick={() => setShowUpload(true)} className="flex-1">
              I&apos;ve made my payment
            </Button>
          </div>

          {showUpload && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Upload payment receipt photo (max 5MB)</p>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button onClick={uploadReceipt} disabled={!file || uploading} className="w-full">
                {uploading ? 'Sending request...' : 'Send Request'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
