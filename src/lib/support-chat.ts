export type SupportAgent = {
  name: string;
  title: string;
};

export type SupportMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  createdAt: number;
};

export type SupportSession = {
  id: string;
  issue: string;
  createdAt: number;
  joinedAt: number;
  expiresAt: number;
  status: 'waiting' | 'active' | 'ended';
  agent: SupportAgent;
  messages: SupportMessage[];
};

const STORAGE_KEY = 'support:sessions';
const LAST_AGENT_KEY = 'support:last-agent';

const AGENTS: SupportAgent[] = [
  { name: 'Mr John', title: 'Billing Specialist' },
  { name: 'Ms Ada', title: 'Account Support' },
  { name: 'Mr David', title: 'Transaction Analyst' },
  { name: 'Ms Grace', title: 'Escalation Officer' },
  { name: 'Mr Ibrahim', title: 'Verification Desk' },
  { name: 'Ms Ruth', title: 'Customer Care' },
];

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getAllSupportSessions(): SupportSession[] {
  if (typeof window === 'undefined') return [];
  return safeParse<SupportSession[]>(window.localStorage.getItem(STORAGE_KEY), []);
}

function saveAllSupportSessions(sessions: SupportSession[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function pickAgent(): SupportAgent {
  if (typeof window === 'undefined') return AGENTS[0];

  const lastName = window.localStorage.getItem(LAST_AGENT_KEY);
  const candidates = AGENTS.filter((a) => a.name !== lastName);
  const pool = candidates.length ? candidates : AGENTS;
  const next = pool[Math.floor(Math.random() * pool.length)];
  window.localStorage.setItem(LAST_AGENT_KEY, next.name);
  return next;
}

export function createSupportSession(issue: string): SupportSession {
  const now = Date.now();
  const joinedAt = now + 5_000;
  const expiresAt = joinedAt + 20 * 60_000;
  const session: SupportSession = {
    id: uid(),
    issue,
    createdAt: now,
    joinedAt,
    expiresAt,
    status: 'waiting',
    agent: pickAgent(),
    messages: [
      {
        id: uid(),
        role: 'user',
        text: issue,
        createdAt: now,
      },
    ],
  };

  const sessions = getAllSupportSessions();
  sessions.push(session);
  saveAllSupportSessions(sessions);
  return session;
}

export function getSupportSessionById(id: string): SupportSession | null {
  return getAllSupportSessions().find((s) => s.id === id) ?? null;
}

export function upsertSupportSession(next: SupportSession) {
  const sessions = getAllSupportSessions();
  const idx = sessions.findIndex((s) => s.id === next.id);
  if (idx >= 0) sessions[idx] = next;
  else sessions.push(next);
  saveAllSupportSessions(sessions);
}

export function markSessionActive(session: SupportSession): SupportSession {
  const next: SupportSession = {
    ...session,
    status: Date.now() >= session.expiresAt ? 'ended' : 'active',
  };
  upsertSupportSession(next);
  return next;
}

export function markSessionEnded(session: SupportSession): SupportSession {
  const next: SupportSession = { ...session, status: 'ended' };
  upsertSupportSession(next);
  return next;
}

export function appendSessionMessage(session: SupportSession, msg: Omit<SupportMessage, 'id' | 'createdAt'>): SupportSession {
  const next: SupportSession = {
    ...session,
    messages: [...session.messages, { id: uid(), createdAt: Date.now(), ...msg }],
  };
  upsertSupportSession(next);
  return next;
}

const REPLY_BANK = {
  payment: [
    'I understand. I can see a payment-related concern. Please hold on while I validate the transaction trail on your account.',
    'Thanks for sharing this. I am checking our payment gateway logs now to confirm what happened.',
  ],
  withdrawal: [
    'Thanks for this report. Withdrawal reviews can queue briefly for verification. I am checking your request status now.',
    'Got it. I am reviewing your withdrawal timeline and approval flags from here.',
  ],
  login: [
    'Understood. I can help with account access. Please confirm whether you are seeing an invalid password error or no code received.',
    'Thanks. I am checking login security events for your account now.',
  ],
  general: [
    'Thank you for your patience. I have received your details and I am reviewing this carefully for you.',
    'I understand your concern. I am checking the account details from support tools now.',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSupportReply(userText: string): string {
  const lower = userText.toLowerCase();
  let base = pick(REPLY_BANK.general);

  if (/(pay|debit|charged|charge|top up|airtime|data)/.test(lower)) base = pick(REPLY_BANK.payment);
  if (/(withdraw|cashout|cash out|payout)/.test(lower)) base = pick(REPLY_BANK.withdrawal);
  if (/(login|otp|password|access|verify)/.test(lower)) base = pick(REPLY_BANK.login);

  const close = pick([
    'I will stay with you here until this is resolved.',
    'I am still on this with you, thank you for your patience.',
    'If needed, I can escalate this immediately after this check.',
  ]);

  return `${base} ${close}`;
}

export function formatCountdown(msLeft: number): string {
  const safe = Math.max(0, msLeft);
  const totalSeconds = Math.floor(safe / 1000);
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
