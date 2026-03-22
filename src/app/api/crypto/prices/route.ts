import { NextResponse } from 'next/server';
import { fetchCryptoMarketSnapshot } from '@/lib/crypto-rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cache: Awaited<ReturnType<typeof fetchCryptoMarketSnapshot>> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 20_000;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ ok: true, ...cache, cached: true });
    }

    const snapshot = await fetchCryptoMarketSnapshot();
    cache = snapshot;
    cachedAt = now;

    return NextResponse.json({ ok: true, ...snapshot, cached: false });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || 'Failed to load crypto prices' },
      { status: 500 }
    );
  }
}
