'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type GiftCardRequest = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  gift_card_type: string;
  gift_card_code: string;
  amount: number;
  currency: string;
  note: string | null;
  front_image_url: string;
  back_image_url: string;
  status: 'pending' | 'approved' | 'declined';
  admin_note: string | null;
  created_at: string;
};

export default function AdminGiftCardPaymentsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<GiftCardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/gift-card-payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Failed to load requests');

      setRequests(json.requests || []);
      const init: Record<string, string> = {};
      for (const r of json.requests || []) init[r.id] = r.admin_note || '';
      setNotes(init);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: e?.message || 'Could not load gift card requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'declined') => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`/api/admin/gift-card-payments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, admin_note: notes[id] || '' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Update failed');

      toast({ title: 'Updated', description: `Request marked ${status}.` });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e?.message || 'Could not update request.' });
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gift Card Payment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> : null}
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <p><strong>User:</strong> {r.full_name || '—'}</p>
                  <p><strong>Email:</strong> {r.email || '—'}</p>
                  <p><strong>Type:</strong> {r.gift_card_type}</p>
                  <p><strong>Code:</strong> {r.gift_card_code}</p>
                  <p><strong>Amount:</strong> {r.currency} {Number(r.amount || 0).toLocaleString()}</p>
                  <p><strong>Status:</strong> {r.status}</p>
                  <p><strong>Submitted:</strong> {new Date(r.created_at).toLocaleString()}</p>
                </div>
                {r.note ? <p className="mt-2 text-sm"><strong>Note:</strong> {r.note}</p> : null}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <a href={r.front_image_url} target="_blank" rel="noreferrer" className="block rounded-md border p-2 text-sm">View Front Image</a>
                  <a href={r.back_image_url} target="_blank" rel="noreferrer" className="block rounded-md border p-2 text-sm">View Back Image</a>
                </div>

                <div className="mt-3 space-y-2">
                  <Input value={notes[r.id] || ''} onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))} placeholder="Admin note (optional)" />
                  <div className="flex gap-2">
                    <Button onClick={() => updateStatus(r.id, 'approved')}>Approve</Button>
                    <Button variant="destructive" onClick={() => updateStatus(r.id, 'declined')}>Decline</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
