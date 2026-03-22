'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SUPPORTED_CRYPTO_CURRENCIES, toSupportedCurrency, type SupportedCryptoCurrency } from '@/lib/crypto-rates';
import { Label } from '@/components/ui/label';

export default function CurrencySwitcher({
  userId,
  value,
  onChanged,
}: {
  userId: string;
  value?: string | null;
  onChanged?: (next: SupportedCryptoCurrency) => void;
}) {
  const [saving, setSaving] = useState(false);
  const current = toSupportedCurrency(value);

  const handleChange = async (next: string) => {
    const normalized = toSupportedCurrency(next);
    if (normalized === current) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({ currency: normalized }).eq('id', userId);
      if (error) throw error;
      onChanged?.(normalized);
    } catch (error) {
      console.error('currency update error', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="currency-switcher">Preferred Crypto</Label>
      <div className="relative">
        <select
          id="currency-switcher"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={saving}
          value={current}
          onChange={(e) => void handleChange(e.target.value)}
        >
          {SUPPORTED_CRYPTO_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        {saving ? <Loader2 className="pointer-events-none absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" /> : null}
      </div>
    </div>
  );
}
