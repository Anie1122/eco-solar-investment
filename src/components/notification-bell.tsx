'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  CircleHelp,
  AlertCircle,
  Info,
} from 'lucide-react';

import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useCurrencyConverter } from '@/lib/currency';

import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;

  // Optional columns (may not exist in your DB)
  amount?: number | null;
  currency?: string | null;
  metadata?: any | null;
};

type UserRow = {
  id: string;
  currency: string | null;
};

const getNotificationIcon = (type: string) => {
  switch ((type || '').toLowerCase()) {
    case 'deposit':
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    case 'withdrawal':
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    case 'profit':
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
    case 'bonus':
    case 'invite_bonus':
    case 'referral_bonus':
      return <Award className="h-4 w-4 text-yellow-500" />;
    case 'investment':
      return <Wallet className="h-4 w-4 text-gray-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'info':
    case 'success':
    case 'warning':
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <CircleHelp className="h-4 w-4 text-gray-400" />;
  }
};

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { format: formatCurrency, convert } = useCurrencyConverter(userRow?.currency || 'NGN');

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  // ✅ session user id
  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id ?? null);

      unsub = supabase.auth.onAuthStateChange((_e, s) => {
        setUserId(s?.user?.id ?? null);
      });
    };

    run();
    return () => {
      if (unsub) unsub.data.subscription.unsubscribe();
    };
  }, []);

  // ✅ load user currency
  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setUserRow(null);
        return;
      }

      const { data, error } = await supabase.from('users').select('id,currency').eq('id', userId).maybeSingle();
      if (error) {
        console.error('load user currency error:', error);
        setUserRow(null);
        return;
      }
      setUserRow((data as UserRow) ?? null);
    };

    run();
  }, [userId]);

  const loadNotifications = async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // ✅ Try full select (if optional columns exist)
    const fullSelect = 'id,user_id,title,message,type,is_read,created_at,amount,currency,metadata';

    let data: any[] | null = null;

    const first = await supabase
      .from('notifications')
      .select(fullSelect)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (first.error) {
      // ✅ If DB doesn't have amount/currency/metadata, fallback to minimal select
      const minimal = await supabase
        .from('notifications')
        .select('id,user_id,title,message,type,is_read,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (minimal.error) {
        console.error('load notifications error:', minimal.error);
        setNotifications([]);
        setLoading(false);
        return;
      }

      data = minimal.data as any[];
    } else {
      data = first.data as any[];
    }

    setNotifications(((data as NotificationRow[]) ?? []).filter(Boolean));
    setLoading(false);
  };

  // initial load
  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // realtime
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () =>
        loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userId) return;

    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId).eq('user_id', userId);

    if (error) {
      console.error('Failed to mark as read:', error);
      return;
    }

    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
  };

  const ringingAnimation = {
    rotate: [0, -15, 15, -15, 15, 0],
    transition: { duration: 0.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <motion.div animate={unreadCount > 0 ? ringingAnimation : {}}>
            <Bell className="h-5 w-5" />
          </motion.div>

          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading && (
          <div className="p-2 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">No new notifications.</div>
        )}

        {!loading &&
          notifications.map((notif) => {
            const created = notif.created_at ? new Date(notif.created_at) : null;

            const hasAmount = typeof notif.amount === 'number' && Number.isFinite(notif.amount);
            const amountText = hasAmount ? formatCurrency(convert(Number(notif.amount))) : null;

            return (
              <DropdownMenuItem
                key={notif.id}
                className={cn('flex cursor-pointer items-start gap-3 whitespace-normal', !notif.is_read && 'bg-primary/5')}
                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
              >
                <div className="mt-1">{getNotificationIcon(notif.type)}</div>

                <div className="flex-1">
                  <p className="font-semibold">{notif.title}</p>

                  <p className="text-xs text-muted-foreground">
                    {notif.message}
                    {amountText ? <span className="font-mono ml-1">({amountText})</span> : null}
                  </p>

                  <p className="text-xs text-muted-foreground/80 mt-1">
                    {created && !isNaN(created.getTime()) ? formatDistanceToNow(created, { addSuffix: true }) : ''}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
