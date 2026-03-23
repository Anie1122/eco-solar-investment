'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyConverter } from '@/lib/currency';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ArrowLeft, Copy, Share2, Users, Trophy, ShieldCheck, Link as LinkIcon, Crown } from 'lucide-react';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  currency: string | null;
  invite_code?: string | null; // ✅ your system uses invite_code
  [k: string]: any;
};

type ReferralRowAny = {
  id?: string;
  inviter_id?: string;
  referred_user_id?: string; // ✅ REAL column in your referrals table
  ref_code?: string;
  bonus_ngn?: number | string | null;
  bonus_paid?: number | string | null; // ✅ numeric, NOT boolean
  currency?: string | null;
  created_at?: string;
  [k: string]: any;
};

type MiniUser = { id: string; full_name: string | null; email: string | null };

const BONUS_PER_REF_USDT = 0.2175; // 300 NGN × 0.000725

function formatDateTime(date: any) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch {
    return '—';
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function buildInviteLink(origin: string, code: string) {
  const safe = encodeURIComponent(code || '');
  return `${origin}/register?ref=${safe}`;
}

/** ✅ Medal colors for verified top-5 */
function getTopBadge(rankIndex: number) {
  const styles = [
    { name: 'Gold', className: 'bg-yellow-500/15 text-yellow-700 border-yellow-400/40' },
    { name: 'Silver', className: 'bg-slate-400/15 text-slate-700 border-slate-400/50' },
    { name: 'Iron', className: 'bg-zinc-500/15 text-zinc-700 border-zinc-500/40' },
    { name: 'Bronze', className: 'bg-amber-700/15 text-amber-800 border-amber-700/40' },
    { name: 'Wood', className: 'bg-orange-900/10 text-orange-900 border-orange-900/20' },
  ];
  return styles[rankIndex] || null;
}

/** ✅ Your real referred user id column */
function getReferredUserId(r: ReferralRowAny): string | null {
  const v = r?.referred_user_id;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function getInviteCodeFromUser(u: UserRow | null, uid: string) {
  // ✅ prefer invite_code (your award route uses it)
  const candidates = ['invite_code', 'ref_code', 'referral_code', 'my_ref_code', 'code'];
  for (const k of candidates) {
    const v = (u as any)?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  // display-only fallback (won’t break anything)
  return `ECO-${uid.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function toNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function ReferralsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<UserRow | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');

  const [refRows, setRefRows] = useState<ReferralRowAny[]>([]);
  const [downlineUsers, setDownlineUsers] = useState<Record<string, MiniUser>>({});

  const [leaderboard, setLeaderboard] = useState<
    Array<{ id: string; name: string; totalReferred: number; totalEarnedUSDT: number }>
  >([]);

  const userCurrency = String(user?.currency || 'USDT').toUpperCase();
  const { format, convert } = useCurrencyConverter(userCurrency);

  const perRefInUserCurrency = useMemo(() => format(convert(BONUS_PER_REF_USDT)), [convert, format]);

  const totals = useMemo(() => {
    const totalReferred = refRows.length;

    // ✅ ALWAYS compute with base NGN
    const totalEarnedUSDT = refRows.reduce((sum, r) => {
      const bonusUsdt = toNum(r?.bonus_ngn, BONUS_PER_REF_USDT);
      return sum + (bonusUsdt > 0 ? bonusUsdt : BONUS_PER_REF_USDT);
    }, 0);

    return { totalReferred, totalEarnedUSDT };
  }, [refRows]);

  const totalEarnedUserFormatted = useMemo(
    () => format(convert(totals.totalEarnedUSDT)),
    [totals.totalEarnedUSDT, convert, format]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;

        if (!uid) {
          router.push('/login');
          return;
        }

        // ✅ Load user row (invite_code + currency)
        const { data: urow, error: uerr } = await supabase
          .from('users')
          .select('id,email,full_name,currency,invite_code')
          .eq('id', uid)
          .maybeSingle();

        if (uerr) throw uerr;

        const userRow = (urow as UserRow) ?? null;
        setUser(userRow);

        // ✅ Load referrals ONLY using real columns
        const { data: refs, error: rerr } = await supabase
          .from('referrals')
          .select('id,inviter_id,referred_user_id,ref_code,bonus_ngn,bonus_paid,currency,created_at')
          .eq('inviter_id', uid)
          .order('created_at', { ascending: false });

        if (rerr) throw rerr;

        const list = (refs as ReferralRowAny[]) ?? [];
        setRefRows(list);

        // ✅ Invite code from users.invite_code (fallback ok)
        const code = getInviteCodeFromUser(userRow, uid);
        setInviteCode(code);

        const origin =
          typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SITE_URL || ''; // optional fallback if you have it
        setInviteLink(code && origin ? buildInviteLink(origin, code) : '');

        // ✅ Load downline users (names/emails)
        const downIds = Array.from(new Set(list.map((r) => getReferredUserId(r)).filter(Boolean) as string[]));

        if (downIds.length) {
          const { data: downs, error: derr } = await supabase.from('users').select('id,full_name,email').in('id', downIds);
          if (!derr) {
            const map: Record<string, MiniUser> = {};
            (downs || []).forEach((u: any) => {
              map[u.id] = { id: u.id, full_name: u.full_name ?? null, email: u.email ?? null };
            });
            setDownlineUsers(map);
          } else {
            setDownlineUsers({});
          }
        } else {
          setDownlineUsers({});
        }

        // ✅ Demo leaderboard exactly as you requested
        const demoTop: Array<{ name: string; totalReferred: number }> = [
          { name: 'Rynad', totalReferred: 8346 },
          { name: 'Amaka', totalReferred: 6120 },
          { name: 'Zubair', totalReferred: 5884 },
          { name: 'Chioma', totalReferred: 5421 },
          { name: 'Kofi', totalReferred: 4990 },
          { name: 'Aisha', totalReferred: 4302 },
          { name: 'Emeka', totalReferred: 4011 },
          { name: 'Fatima', totalReferred: 3887 },
          { name: 'Tunde', totalReferred: 3509 },
          { name: 'Sofia', totalReferred: 3222 },
        ];

        setLeaderboard(
          demoTop.slice(0, 10).map((d, idx) => ({
            id: `demo-${idx}`,
            name: d.name,
            totalReferred: d.totalReferred,
            totalEarnedUSDT: d.totalReferred * BONUS_PER_REF_USDT,
          }))
        );
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Could not load referrals.' });
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await copyText(inviteCode);
      toast({ title: 'Copied', description: 'Invite code copied.' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy.' });
    }
  };

  const onCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await copyText(inviteLink);
      toast({ title: 'Copied', description: 'Invite link copied.' });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy.' });
    }
  };

  const onShare = async () => {
    if (!inviteLink) return;

    const shareText = `Eco Solar Investment
Invite Code: ${inviteCode}
Invite Link: ${inviteLink}
Earn ${BONUS_PER_REF_USDT} USDT per referral (${perRefInUserCurrency}).`;

    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title: 'Invite', text: shareText, url: inviteLink });
      } else {
        await copyText(shareText);
        toast({ title: 'Copied', description: 'Invite message copied (share not supported here).' });
      }
    } catch {
      // ignore cancel
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" className="rounded-2xl" onClick={() => router.push('/wallet')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wallet
        </Button>
      </div>

      <Card className="overflow-hidden rounded-3xl border-muted/60 shadow-lg">
        <div className="h-2 w-full bg-gradient-to-r from-primary/70 via-primary to-primary/60" />

        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-primary" />
            Referrals
          </CardTitle>
          <CardDescription>
            Invite friends, earn <b>{BONUS_PER_REF_USDT} USDT</b> per successful referral (<b>{perRefInUserCurrency}</b>), and track leaderboard.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Invite card */}
          <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Your Invite Code</div>
                    <div className="mt-1 text-lg font-extrabold tracking-wide">{inviteCode || '—'}</div>
                  </div>

                  <Button variant="outline" className="rounded-2xl" onClick={onCopyCode} disabled={!inviteCode}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Invite Link
                  </div>

                  <div className="rounded-2xl border bg-background px-3 py-3 text-xs break-all">{inviteLink || '—'}</div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-2xl" onClick={onCopyLink} disabled={!inviteLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>

                    <Button className="rounded-2xl" onClick={onShare} disabled={!inviteLink}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Invite / Share Now
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-sky-50 p-4">
              <div className="text-xs text-muted-foreground">Total Referred</div>
              <div className="mt-2 text-3xl font-extrabold">{loading ? '—' : totals.totalReferred}</div>
            </div>

            <div className="rounded-2xl border bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Total Earned</div>
                <Badge variant="secondary" className="text-[10px]">
                  {BONUS_PER_REF_USDT} USDT/ref ({perRefInUserCurrency})
                </Badge>
              </div>

              <div className="mt-2 text-2xl font-extrabold">{loading ? '—' : totalEarnedUserFormatted}</div>

              <div className="mt-1 text-[10px] text-muted-foreground">
                Base: USDT {Number(totals.totalEarnedUSDT || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <Tabs defaultValue="leaderboard">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="myreferrals">My Referrals</TabsTrigger>
            </TabsList>

            {/* Leaderboard */}
            <TabsContent value="leaderboard" className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <div className="font-semibold">Top Referrers</div>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  Top 10
                </Badge>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((row, idx) => {
                    const medal = idx < 5 ? getTopBadge(idx) : null;
                    const earnedUser = format(convert(row.totalEarnedUSDT));

                    return (
                      <div
                        key={row.id}
                        className={cn(
                          'rounded-2xl border p-3 flex items-center justify-between gap-3',
                          idx === 0 ? 'bg-yellow-50' : 'bg-background'
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-extrabold">#{idx + 1}</div>
                            <div className="truncate font-semibold">{row.name}</div>

                            {idx === 0 ? (
                              <Badge className="text-[10px] bg-yellow-500/15 text-yellow-700 border border-yellow-400/40">
                                <Crown className="mr-1 h-3 w-3" />
                                Top
                              </Badge>
                            ) : null}

                            {medal ? (
                              <Badge className={cn('text-[10px] border', medal.className)}>
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Verified • {medal.name}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mt-1 text-[11px] text-muted-foreground">
                            total referred users = <b className="text-foreground">{row.totalReferred.toLocaleString()}</b>, amount earned ={' '}
                            <b className="text-foreground">USDT {row.totalEarnedUSDT.toLocaleString()}</b>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">Earned</div>
                          <div className="text-sm font-extrabold">{earnedUser}</div>
                          <div className="text-[10px] text-muted-foreground">Base: USDT {row.totalEarnedUSDT.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* My referrals */}
            <TabsContent value="myreferrals" className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div className="font-semibold">People You Referred</div>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {loading ? '—' : refRows.length}
                </Badge>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : refRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center">
                  <div className="text-sm font-semibold">No Referrals Yet</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Share your invite link to start earning {BONUS_PER_REF_USDT} USDT per referral ({perRefInUserCurrency}).
                  </div>
                  <Button className="mt-4 rounded-2xl" onClick={onShare} disabled={!inviteLink}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Invite / Share Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {refRows.map((r, i) => {
                    const downId = getReferredUserId(r);
                    const down = downId ? downlineUsers[downId] : null;

                    const name = down?.full_name || down?.email || 'Referred User';

                    // ✅ amount per row is base NGN
                    const bonusUSDT = toNum(r?.bonus_ngn, BONUS_PER_REF_USDT);
                    const bonusUser = format(convert(bonusUSDT));

                    // ✅ bonus_paid is numeric; treat > 0 as paid
                    const paidAmt = toNum(r?.bonus_paid, 0);
                    const paid = paidAmt > 0;

                    return (
                      <div key={String(r?.id ?? i)} className="rounded-2xl border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{name}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">Joined: {formatDateTime(r?.created_at)}</div>

                            {r?.ref_code ? (
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                Ref code used: <span className="font-mono text-foreground">{String(r.ref_code)}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="text-right">
                            <Badge variant={paid ? 'secondary' : 'default'} className="capitalize text-[10px]">
                              {paid ? 'paid' : 'pending'}
                            </Badge>
                            <div className="mt-1 text-sm font-extrabold">{bonusUser}</div>
                            <div className="text-[10px] text-muted-foreground">Base: USDT {bonusUSDT.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
