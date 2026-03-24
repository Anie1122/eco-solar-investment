'use client';

import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SUPPORTED_CRYPTO_CURRENCIES, toSupportedCurrency, type SupportedCryptoCurrency } from '@/lib/crypto-rates';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const selectId = useId();
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
      <Label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wide text-primary">
        Preferred Crypto
      </Label>
      <div className="relative">
        <Select
          disabled={saving}
          value={current}
          onValueChange={(next) => void handleChange(next)}
        >
          <SelectTrigger
            id={selectId}
            className="h-11 rounded-xl border-primary/35 bg-gradient-to-br from-primary/15 via-primary/5 to-background text-sm font-semibold text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.08)] focus:ring-primary/35 data-[state=open]:border-primary"
          >
            <SelectValue placeholder="Choose currency" />
          </SelectTrigger>

          <SelectContent className="rounded-xl border-primary/35 bg-card shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            {SUPPORTED_CRYPTO_CURRENCIES.map((code) => (
              <SelectItem
                key={code}
                value={code}
                className="rounded-lg text-sm font-semibold focus:bg-primary/15 focus:text-foreground"
              >
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving ? (
          <Loader2 className="pointer-events-none absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />
        ) : null}
      </div>
    </div>
  );
}
