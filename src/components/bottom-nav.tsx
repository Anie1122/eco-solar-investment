'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  TrendingUp,
  Wallet,
  History,
  User,
  PieChart,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/investments', label: 'Invest', icon: TrendingUp },
  { href: '/my-investments', label: 'My Invest', icon: PieChart },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/history', label: 'History', icon: History },
  { href: '/referrals', label: 'Referrals', icon: Users },
  { href: '/profile', label: 'Me', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const hideOn = [
    '/login',
    '/register',
    '/reset-password',
    '/complete-profile',
    '/payment-status',
  ];

  if (hideOn.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }

  return (
    <>
      {/* Spacer */}
      <div className="h-24 w-full" />

      <nav className="bottom-nav-root fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
        <div
          className="
            w-full max-w-3xl
            rounded-2xl
            border
            border-primary/30
            bg-white/60
            dark:bg-background/70
            backdrop-blur-xl
            shadow-[0_8px_30px_rgba(0,0,0,0.12)]
          "
        >
          <div className="grid grid-cols-7 gap-1 px-1 py-2">
            {items.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href ||
                    pathname.startsWith(item.href + '/');

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex justify-center"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1"
                  >
                    {/* Active Bubble */}
                    <div
                      className={cn(
                        'flex items-center justify-center rounded-xl transition-all duration-300',
                        'h-10 w-10',
                        active
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/40'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        'text-[9px] font-medium transition-colors text-center leading-none',
                        active ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>

                    {/* Dot indicator */}
                    {active && (
                      <motion.div
                        layoutId="bottom-dot"
                        className="h-1 w-1 rounded-full bg-primary"
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
