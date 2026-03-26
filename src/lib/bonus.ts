import { clampToPrecision } from '@/lib/crypto-rates';

export const DEFAULT_SIGNUP_BONUS_NGN = 1500;
const FALLBACK_USDT_PER_NGN = 1 / 1500;

let cachedBonusUsdt: number | null = null;
let cachedAt = 0;
const TTL_MS = 6 * 60 * 60 * 1000;

export async function getSignupBonusUsdtToday(): Promise<number> {
  const now = Date.now();
  if (cachedBonusUsdt && now - cachedAt < TTL_MS) return cachedBonusUsdt;

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn',
      {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      }
    );

    if (!res.ok) throw new Error(`rate_error_${res.status}`);

    const data = (await res.json()) as { tether?: { ngn?: number } };
    const usdtInNgn = Number(data?.tether?.ngn || 0);
    if (!Number.isFinite(usdtInNgn) || usdtInNgn <= 0) throw new Error('invalid_rate');

    const bonusUsdt = clampToPrecision(DEFAULT_SIGNUP_BONUS_NGN / usdtInNgn);
    cachedBonusUsdt = bonusUsdt;
    cachedAt = now;

    return bonusUsdt;
  } catch (error) {
    console.error('bonus conversion fallback:', error);
    const fallback = clampToPrecision(DEFAULT_SIGNUP_BONUS_NGN * FALLBACK_USDT_PER_NGN);
    cachedBonusUsdt = fallback;
    cachedAt = now;
    return fallback;
  }
}
