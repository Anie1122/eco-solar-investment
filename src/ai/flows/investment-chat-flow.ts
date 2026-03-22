export type Message = {
  role: 'user' | 'model';
  content: { text: string }[];
};

export async function investmentChat(input: {
  question: string;
  history: Message[];
  userName?: string;
  plans?: string;
}): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: input.question,
      history: input.history ?? [],
      userName: input.userName ?? '',
      plans: input.plans ?? '',
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    throw new Error(data?.message || 'Failed to get chat response.');
  }

  return String(data.text || '').trim();
}
