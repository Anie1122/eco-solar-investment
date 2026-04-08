// src/app/api/ai/suggestion/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { investmentPlans } from '@/lib/data';

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function formatNGN(amount: number) {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `NGN ${Math.round(amount).toLocaleString()}`;
  }
}

function getEnv(name: string) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

// ✅ Hugging Face Router (OpenAI-compatible) call
async function callHuggingFaceChat(prompt: string, system: string) {
  const token = getEnv('HF_API_TOKEN');
  const model = getEnv('HF_MODEL') || 'meta-llama/Meta-Llama-3-8B-Instruct';

  if (!token) {
    return {
      ok: false as const,
      message: 'Missing HF_API_TOKEN in Vercel Environment Variables.',
    };
  }

  const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: 240,
      temperature: 0.7,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Hugging Face error (${res.status})`;
    return { ok: false as const, message: msg, status: res.status, raw: data };
  }

  const text =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    '';

  return { ok: true as const, text: String(text || '').trim(), raw: data };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const country = String(body?.country ?? '').trim();
    const currency = String(body?.currency ?? 'NGN').trim().toUpperCase();
    const walletBalanceNGN = Number(body?.walletBalance ?? 0);

    // ✅ NEW: from client (already converted like wallet/airtime card)
    const plansTextFromClient = String(body?.plansText ?? '').trim();
    const walletBalanceDisplay = String(body?.walletBalanceDisplay ?? '').trim();

    if (!country) return json(400, { ok: false, message: 'Missing country' });
    if (!Number.isFinite(walletBalanceNGN) || walletBalanceNGN < 0) {
      return json(400, { ok: false, message: 'Invalid walletBalance' });
    }

    // ✅ Fallback NGN plans (if client didn't send converted plansText)
    const fallbackPlansText = investmentPlans
      .map(
        (p) =>
          `- ${p.name}: Invest ${formatNGN(p.amount)} for ${p.durationWeeks} weeks, earn ${formatNGN(
            p.weeklyProfit
          )} weekly, total return ${formatNGN(p.totalReturn)}.`
      )
      .join('\n');

    // ✅ Use converted plans if provided, else fallback NGN
    const plansText = plansTextFromClient || fallbackPlansText;

    const system = `You are Eco Solar Investment assistant.
Be concise, helpful, and safe.
Do NOT promise guaranteed profits/returns.
Return only plain text (no JSON, no markdown).`;

    const prompt = `
User info:
- Country: ${country}
- Display currency: ${currency}
- Wallet balance (display): ${walletBalanceDisplay || '(not provided)'}
- Wallet balance (NGN base for affordability check): ${walletBalanceNGN}

Available plans (display currency where possible):
${plansText}

Task:
- Recommend ONE best plan the user can afford.
- Give a short reason (max 5 lines).
- Add ONE short risk caution line.
`.trim();

    const ai = await callHuggingFaceChat(prompt, system);
    if (!ai.ok) {
      console.error('HF router error:', ai);
      return json(500, { ok: false, message: ai.message });
    }

    const suggestion = String(ai.text || '').trim();
    if (!suggestion) {
      return json(500, {
        ok: false,
        message: 'Hugging Face returned empty response.',
      });
    }

    return json(200, { ok: true, suggestion });
  } catch (e: any) {
    console.error('AI suggestion error:', e);
    return json(500, { ok: false, message: e?.message || 'Server error' });
  }
}
