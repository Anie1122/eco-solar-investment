'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Lock } from 'lucide-react';

export default function WithdrawalPinSettings() {
  const [busy, setBusy] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState('');
  const [oldPin, setOldPin] = useState('');

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/withdrawal-pin/status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (res.ok && json?.ok) {
        setHasPin(Boolean(json.hasPin));
      }
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetOrChange = async () => {
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No session token');

      const res = await fetch('/api/withdrawal-pin/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin, oldPin: hasPin ? oldPin : undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed to save PIN');

      alert(json.message || 'Done');
      setPin('');
      setOldPin('');
      await loadStatus();
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Lock className="h-5 w-5 text-primary" />
        Withdrawal PIN
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {statusLoading
          ? 'Loading...'
          : hasPin
            ? 'PIN is set. You can change it anytime.'
            : 'Set a 4-digit PIN required for withdrawals.'}
      </p>

      <div className="mt-4 grid gap-3">
        {hasPin && (
          <Input
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Old PIN (4 digits)"
            inputMode="numeric"
          />
        )}

        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder={hasPin ? 'New PIN (4 digits)' : 'Set PIN (4 digits)'}
          inputMode="numeric"
        />

        <Button onClick={handleSetOrChange} disabled={busy || statusLoading}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {hasPin ? 'Change PIN' : 'Set PIN'}
        </Button>
      </div>
    </Card>
  );
}
