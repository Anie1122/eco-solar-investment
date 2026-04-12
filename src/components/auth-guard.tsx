'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AccountRestrictedPage from './account-restricted-page';
import { supabase } from '@/lib/supabaseClient';
import { getSignupBonusUsdtToday } from '@/lib/bonus';

const publicRoutes = ['/login', '/register', '/reset-password'];

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  country: string | null;
  currency: string | null;
  wallet_balance: number | null;
  bonus_balance: number | null;
  has_invested?: boolean | null;
  profile_completed: boolean | null;
  status: string | null;
  created_at?: string | null;
  withdrawal_account?: any | null;

  // ✅ referral fields
  invite_code?: string | null;
  referred_by?: string | null;
  referral_awarded?: boolean | null;
  telegram_join_prompt_completed?: boolean | null;
};

function makeInviteCode(userId: string) {
  return userId.replace(/-/g, '').slice(0, 10).toUpperCase();
}

async function ensureUserRowExists(params: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
}) {
  const { userId, email, fullName } = params;

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id, invite_code, currency')
    .eq('id', userId)
    .maybeSingle();

  if (selectError) {
    console.error('❌ Failed to check user row:', selectError);
    return;
  }

  if (!existing) {
    const inviteCode = makeInviteCode(userId);
    // Merge-resolution choice: keep live converted bonus (not fixed 1500 USDT).
    const bonusUsdt = await getSignupBonusUsdtToday();

    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email: email ?? '',
      full_name: fullName ?? 'New User',
      phone_number: '',
      country: '',
      currency: 'USDT',
      wallet_balance: 0,
      bonus_balance: bonusUsdt,
      has_invested: false,
      profile_completed: false,
      status: 'active',
      invite_code: inviteCode,
      created_at: new Date().toISOString(),
    });

    if (insertError) console.error('❌ Failed to create user row:', insertError);
    return;
  }

  if (!existing.invite_code) {
    const inviteCode = makeInviteCode(userId);
    const { error: updErr } = await supabase
      .from('users')
      .update({ invite_code: inviteCode, currency: 'USDT' })
      .eq('id', userId);

    if (updErr) console.error('❌ Failed to set invite_code:', updErr);
  } else if (!existing.currency) {
    const { error: curErr } = await supabase
      .from('users')
      .update({ currency: 'USDT' })
      .eq('id', userId);
    if (curErr) console.error('❌ Failed to set default USDT currency:', curErr);
  }
}

// ✅ referral: call award endpoint
async function awardReferralIfNeeded(params: { newUserId: string; refCode: string }) {
  try {
    const res = await fetch('/api/referrals/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    // some platforms return 405 if method mismatch; this makes it obvious
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.error('awardReferralIfNeeded error:', e);
    return { ok: false, status: 0, data: { message: 'network_error' } };
  }
}

function isRefreshTokenError(message?: string) {
  const m = String(message || '').toLowerCase();
  return m.includes('invalid refresh token') || m.includes('refresh token not found');
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [hasMounted, setHasMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const ensuredRef = useRef<string | null>(null);
  const lastRedirectRef = useRef<{ to: string; at: number } | null>(null);

  // ✅ referral: prevents multiple award calls for same user
  const referralProcessedRef = useRef<string | null>(null);

  useEffect(() => setHasMounted(true), []);

  // 1) Read session + subscribe
  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const run = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error && isRefreshTokenError(error.message)) {
        await supabase.auth.signOut({ scope: 'local' });
        sessionStorage.clear();
        localStorage.clear();
      }
      const user = data.session?.user ?? null;

      setSessionUserId(user?.id ?? null);
      setAuthChecked(true);

      unsub = supabase.auth.onAuthStateChange((_event, newSession) => {
        const newUser = newSession?.user ?? null;
        setSessionUserId(newUser?.id ?? null);
        setAuthChecked(true);
      });
    };

    run();

    return () => {
      if (unsub) unsub.data.subscription.unsubscribe();
    };
  }, []);

  // 2) Ensure profile exists + load it + ✅ AWARD REFERRAL ONCE
  useEffect(() => {
    const run = async () => {
      if (!sessionUserId) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);

      try {
        // Get auth user once (to read metadata.ref)
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData.user;

        const email = authUser?.email ?? null;
        const fullName = (authUser?.user_metadata as any)?.full_name ?? null;

        if (ensuredRef.current !== sessionUserId) {
          ensuredRef.current = sessionUserId;
          await ensureUserRowExists({ userId: sessionUserId, email, fullName });
        }

        // Load profile
        const { data: row, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUserId)
          .maybeSingle();

        if (error) {
          console.error('❌ Failed to load profile:', error);
          setProfile(null);
          return;
        }

        const prof = (row as UserRow) ?? null;
        setProfile(prof);

        // ✅ REFERRAL AWARD LOGIC
        // We store inviteCode in auth metadata: options.data.ref during signup
        const refCode = String((authUser?.user_metadata as any)?.ref ?? '')
          .trim()
          .toUpperCase();

        const alreadyAwarded = prof?.referral_awarded === true;

        if (
          refCode &&
          !alreadyAwarded &&
          referralProcessedRef.current !== sessionUserId
        ) {
          referralProcessedRef.current = sessionUserId;

          const res = await awardReferralIfNeeded({ newUserId: sessionUserId, refCode });

          // If it worked (or even if skipped), reload profile once
          if (res.ok) {
            const { data: row2 } = await supabase
              .from('users')
              .select('*')
              .eq('id', sessionUserId)
              .maybeSingle();

            if (row2) setProfile(row2 as UserRow);
          } else {
            // keep it log-only (won't break app)
            console.error('❌ Referral award failed:', res.status, res.data);
          }
        }
      } finally {
        setProfileLoading(false);
      }
    };

    run();
  }, [sessionUserId]);

  // helper: stop rapid redirect spam
  const safeReplace = (to: string) => {
    const now = Date.now();
    const last = lastRedirectRef.current;

    if (last && last.to === to && now - last.at < 800) return;

    lastRedirectRef.current = { to, at: now };
    router.replace(to);
  };

  // 3) Redirect logic
  useEffect(() => {
    if (!hasMounted || !authChecked) return;

    const isPublic = publicRoutes.includes(pathname);

    if (!sessionUserId) {
      if (!isPublic) safeReplace('/login');
      return;
    }

    if (isPublic) {
      safeReplace('/');
      return;
    }

    if (profileLoading) return;
    if (!profile) return;

    if (profile.status === 'inactive') return;

    const completed = profile.profile_completed === true;

    if (!completed && pathname !== '/complete-profile') {
      safeReplace('/complete-profile');
      return;
    }

    if (completed && pathname === '/complete-profile') {
      safeReplace('/');
      return;
    }

    const telegramGateCompleted = profile.telegram_join_prompt_completed !== false;
    if (completed && !telegramGateCompleted && pathname !== '/') {
      safeReplace('/');
      return;
    }
  }, [hasMounted, authChecked, sessionUserId, pathname, router, profileLoading, profile]);

  if (!hasMounted || !authChecked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (sessionUserId && profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (profile && profile.status === 'inactive') {
    return <AccountRestrictedPage userProfile={profile as any} />;
  }

  return <>{children}</>;
}
