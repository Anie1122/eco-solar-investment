// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';

import BottomNav from '@/components/bottom-nav';

export const metadata: Metadata = {
  title: 'Eco Solar Investment',
  description: 'Your trusted partner in solar investment.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className="font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <FirebaseClientProvider>
            {/* Main content */}
            <div className="min-h-screen pb-24 fintech-shell">
              <div className="fintech-page-animate">{children}</div>
            </div>

            {/* Bottom navigation */}
            <BottomNav />

            {/* Notifications */}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
