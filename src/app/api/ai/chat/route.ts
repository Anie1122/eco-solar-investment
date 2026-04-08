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

type ChatMsg = { role: 'user' | 'model'; content: { text: string }[] };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const token =
      process.env.HF_API_TOKEN ||
      process.env.HF_TOKEN ||
      process.env.HUGGINGFACE_HUB_TOKEN;

    if (!token) {
      return json(500, {
        ok: false,
        message:
          'Missing HF_API_TOKEN in Vercel Environment Variables.',
      });
    }

    const question = String(body?.question ?? '').trim();
    const userName = String(body?.userName ?? '').trim();
    const history = (body?.history ?? []) as ChatMsg[];

    if (!question) {
      return json(400, { ok: false, message: 'Missing question.' });
    }

    // If the client didn’t pass plans, we build them here (NGN base).
    const plansText =
      typeof body?.plans === 'string' && body.plans.trim()
        ? String(body.plans)
        : investmentPlans
            .map(
              (p) =>
                `- ${p.name}: Invest ${formatNGN(p.amount)} for ${p.durationMonths} months, earn ${formatNGN(
                  p.monthlyProfit
                )} monthly, total return ${formatNGN(p.totalReturn)}`
            )
            .join('\n');

    const system = `
You are Eco Solar Investment AI assistant.
Be concise, helpful, and safe.
Do NOT promise guaranteed profits or returns.
Only answer investment-related questions about Eco Solar Investment plans, how they work, and general investing safety tips.
If asked anything unrelated, politely redirect back to investments.

User: ${userName || 'Customer'}

Available plans:
${plansText}

Always include a short risk caution sentence.
`.trim();

    // Hugging Face Router (OpenAI-compatible)
    // Model must be a chat-completions supported model on HF router.
    const model =
      process.env.HF_CHAT_MODEL ||
      'meta-llama/Llama-3.1-8B-Instruct:fastest';

    // Convert your widget history -> OpenAI-style messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: system },
    ];

    if (Array.isArray(history) && history.length) {
      for (const m of history.slice(-10)) {
        const text = String(m?.content?.[0]?.text ?? '').trim();
        if (!text) continue;

        if (m.role === 'user') messages.push({ role: 'user', content: text });
        if (m.role === 'model') messages.push({ role: 'assistant', content: text });
      }
    }

    messages.push({ role: 'user', content: question });

    const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 350,
      }),
    });

    const raw = await resp.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // keep raw
    }

    if (!resp.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        `Hugging Face error (${resp.status})`;

      return json(resp.status, { ok: false, message: msg });
    }

    const text =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      '';

    const answer = String(text || '').trim();

    if (!answer) {
      return json(500, { ok: false, message: 'AI returned empty response.' });
    }

    return json(200, { ok: true, text: answer });
  } catch (e: any) {
    console.error('AI chat route error:', e);
    return json(500, { ok: false, message: e?.message || 'Server error' });
  }
}
