// src/lib/fx.ts
// Live FX with caching + safe fallback.
// Source: Frankfurter (ECB-based). Fallback: manual NGN_TO map.

export const DEFAULT_SIGNUP_BONUS_NGN = 1500;

// Your fallback rates (NGN -> currency). Keep updating anytime.
export const NGN_TO_FALLBACK: Record<string, number> = {
  NGN: 1,
  USD: 0.0011,
  GBP: 0.0009,
  EUR: 0.001,
  CAD: 0.0015,
  AUD: 0.0017,
  NZD: 0.0018,

  GHS: 0.013,
  KES: 0.17,
  ZAR: 0.02,
  EGP: 0.05,
  MAD: 0.011,
  UGX: 4.2,
  TZS: 2.8,
  XOF: 0.65,
  XAF: 0.65,

  AED: 0.004,
  SAR: 0.0041,
  QAR: 0.004,
  KWD: 0.00034,
  BHD: 0.00041,
  OMR: 0.00042,

  INR: 0.09,
  PKR: 0.31,
  BDT: 0.12,
  LKR: 0.33,
  NPR: 0.14,

  CNY: 0.008,
  JPY: 0.17,
  KRW: 1.45,
  SGD: 0.0015,
  MYR: 0.0052,
  THB: 0.04,
  IDR: 17.0,
  PHP: 0.06,
  VND: 27.0,

  BRL: 0.0056,
  MXN: 0.02,
  ARS: 1.1,
};

type CacheEntry = { rate: number; ts: number };

// 6 hours cache
const TTL_MS = 6 * 60 * 60 * 1000;

const memCache = new Map<string, CacheEntry>();

function cacheKey(from: string, to: string) {
  return `fx:${from.toUpperCase()}->${to.toUpperCase()}`;
}

function getLocal(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function setLocal(key: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

function isFresh(entry: CacheEntry) {
  return Date.now() - entry.ts < TTL_MS;
}

// Frankfurter only supports a set of currencies (ECB based). When not supported,
// we'll use fallback NGN map.
async function fetchFrankfurterRate(from: string, to: string): Promise<number | null> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();

  // Frankfurter base is flexible for supported currencies.
  // Example: /latest?amount=1&from=NGN&to=USD
  const url = `https://api.frankfurter.app/latest?amount=1&from=${encodeURIComponent(
    f
  )}&to=${encodeURIComponent(t)}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const rate = json?.rates?.[t];
    if (typeof rate !== 'number') return null;
    return rate;
  } catch {
    return null;
  }
}

export async function getLiveRate(from: string, to: string): Promise<number> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;

  const key = cacheKey(f, t);

  // memory
  const mem = memCache.get(key);
  if (mem && isFresh(mem)) return mem.rate;

  // localStorage
  const local = getLocal(key);
  if (local && isFresh(local)) {
    memCache.set(key, local);
    return local.rate;
  }

  // network (Frankfurter)
  const live = await fetchFrankfurterRate(f, t);
  if (typeof live === 'number' && isFinite(live) && live > 0) {
    const entry = { rate: live, ts: Date.now() };
    memCache.set(key, entry);
    setLocal(key, entry);
    return live;
  }

  // fallback: if converting from NGN -> something, use NGN_TO_FALLBACK
  if (f === 'NGN') {
    const r = NGN_TO_FALLBACK[t];
    if (typeof r === 'number' && r > 0) return r;
  }

  // fallback: if converting something -> NGN, invert NGN_TO_FALLBACK
  if (t === 'NGN') {
    const r = NGN_TO_FALLBACK[f];
    if (typeof r === 'number' && r > 0) return 1 / r;
  }

  // last resort
  return 1;
}

export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  const rate = await getLiveRate(from, to);
  return amount * rate;
}
