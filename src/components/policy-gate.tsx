'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ShieldCheck, ExternalLink } from 'lucide-react';

type Props = {
  userId: string;
  onAccepted: () => void;
  onDismiss: () => void;
};

export default function PolicyGate({ userId, onAccepted, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);

  const effectiveDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
  }, []);

  const acceptPolicy = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ policy_accepted: true })
        .eq('id', userId);

      if (error) throw error;

      onAccepted();
    } catch (e) {
      console.error('Policy accept error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 border-b p-4 sm:p-6">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white">
            {/* ✅ LOCAL public path (NO remote config needed) */}
            <img
              src="/brand/Logo.png"
              alt="Eco Solar Investment Logo"
              className="h-12 w-12 object-contain"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="truncate text-lg font-extrabold">
                ECO-SOLAR-INVESTMENT
              </h2>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              Risk Management, Terms &amp; Privacy Policy
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 text-sm leading-relaxed">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Website
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="mt-2 w-full justify-between"
                  onClick={() =>
                    openLink('https://eco-solar-investment-platform-website.base44.app')
                  }
                >
                  Open Official Website
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  WhatsApp Community
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="mt-2 w-full justify-between"
                  onClick={() =>
                    openLink('https://chat.whatsapp.com/EwXPFIkrqNhGbEVqnhwsW9')
                  }
                >
                  Join Community
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-xs font-semibold text-muted-foreground">
                Effective Date
              </div>
              <div className="mt-1 font-semibold">{effectiveDate}</div>
            </div>

            <section className="space-y-2">
              <h3 className="text-base font-bold">1. ABOUT ECO-SOLAR-INVESTMENT</h3>
              <p>
                ECO-SOLAR-INVESTMENT is an online renewable energy investment
                platform that allows users to invest in solar-related properties
                and energy products.
              </p>
              <p className="font-semibold">
                By registering, investing, or using this platform, you agree to
                all policies stated below.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">2. INVESTMENT STRUCTURE &amp; RETURNS</h3>
              <p>
                ECO-SOLAR-INVESTMENT operates structured solar investment plans
                designed to provide fixed projected returns based on selected
                packages.
              </p>
              <p className="font-semibold">
                While the platform is structured to honor investment commitments, returns remain subject to:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Operational sustainability</li>
                <li>Platform policies</li>
                <li>Compliance requirements</li>
                <li>Force majeure events</li>
              </ul>
              <p>Users acknowledge that participation is voluntary and at their discretion.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">3. RISK MANAGEMENT POLICY</h3>
              <p className="font-semibold">To maintain stability and protect investors, we implement:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Transaction monitoring systems</li>
                <li>Anti-fraud controls</li>
                <li>Secure payment processing</li>
                <li>Account verification procedures</li>
                <li>Internal financial audits</li>
                <li>Anti-money laundering (AML) compliance measures</li>
              </ul>
              <p className="font-semibold">We reserve the right to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Suspend suspicious accounts</li>
                <li>Delay withdrawals for security review</li>
                <li>Terminate accounts violating platform policies</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">4. PRIVACY POLICY</h3>
              <p className="font-semibold">Information Collected</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Transaction details</li>
                <li>IP address</li>
                <li>Device information</li>
              </ul>

              <p className="font-semibold mt-2">Purpose of Data Collection</p>
              <p>Data is used to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Process investments and withdrawals</li>
                <li>Verify user identity</li>
                <li>Prevent fraudulent activities</li>
                <li>Improve platform services</li>
                <li>Send important updates</li>
              </ul>
              <p className="font-semibold">We do not sell user data to third parties.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">5. DATA SECURITY</h3>
              <p className="font-semibold">We use:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>SSL encryption</li>
                <li>Secure hosting infrastructure</li>
                <li>Restricted administrative access</li>
                <li>Continuous system monitoring</li>
              </ul>
              <p>Users are responsible for safeguarding their login credentials.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">6. INVEST NOW BUTTON POLICY</h3>
              <p className="font-semibold">
                All investment actions must be completed only via the official platform:
              </p>

              <Button
                type="button"
                variant="default"
                className="w-full justify-between"
                onClick={() =>
                  openLink('https://eco-solar-investment-platform-website.base44.app')
                }
              >
                Invest Now (Official Link)
                <ExternalLink className="h-4 w-4" />
              </Button>

              <p className="text-sm text-muted-foreground">
                We are not responsible for transactions conducted outside the official website.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">7. WHATSAPP GROUP DISCLAIMER</h3>
              <p>The official WhatsApp group is strictly for updates and community engagement.</p>
              <p className="font-semibold">ECO-SOLAR-INVESTMENT is not responsible for:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Private financial arrangements</li>
                <li>External payment requests</li>
                <li>Advice given by other members</li>
              </ul>
              <p className="font-semibold">Always confirm announcements from official administrators.</p>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">8. WITHDRAWAL &amp; ACCOUNT POLICY</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>Withdrawal processing may require verification.</li>
                <li>Accounts flagged for suspicious activity may experience temporary restrictions.</li>
                <li>Multiple account abuse is prohibited.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">9. LIMITATION OF LIABILITY</h3>
              <p className="font-semibold">ECO-SOLAR-INVESTMENT shall not be held liable for:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>User negligence</li>
                <li>System interruptions</li>
                <li>Regulatory changes</li>
                <li>Force majeure events</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-base font-bold">10. POLICY UPDATES</h3>
              <p>
                We reserve the right to update policies at any time. Continued use of the platform indicates acceptance of revised terms.
              </p>
            </section>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-end sm:p-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onDismiss}
            className="w-full sm:w-auto"
          >
            Proceed to Dashboard (Show again tomorrow)
          </Button>

          <Button
            type="button"
            onClick={acceptPolicy}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'I Accept & Continue'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
