-- Gift card payment requests table (manual admin review workflow)
create table if not exists public.gift_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text,
  email text,
  gift_card_type text not null,
  gift_card_code text not null,
  amount numeric(14,2) not null check (amount >= 15000 and amount <= 2000000),
  currency text not null default 'USD',
  note text,
  front_image_url text not null,
  back_image_url text not null,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gift_card_payments_user_id on public.gift_card_payments (user_id);
create index if not exists idx_gift_card_payments_status on public.gift_card_payments (status);
create index if not exists idx_gift_card_payments_created_at on public.gift_card_payments (created_at desc);

-- Storage bucket for uploaded card images
insert into storage.buckets (id, name, public)
values ('gift-cards', 'gift-cards', true)
on conflict (id) do nothing;

alter table public.gift_card_payments enable row level security;

-- Users can insert and view their own requests.
drop policy if exists "gift_card_insert_own" on public.gift_card_payments;
create policy "gift_card_insert_own"
on public.gift_card_payments for insert
with check (auth.uid() = user_id);

drop policy if exists "gift_card_select_own" on public.gift_card_payments;
create policy "gift_card_select_own"
on public.gift_card_payments for select
using (auth.uid() = user_id);

-- Admin/API uses service role key and bypasses RLS for updates.

-- Storage policies: users can upload/read only their own folder.
drop policy if exists "gift_cards_upload_own" on storage.objects;
create policy "gift_cards_upload_own"
on storage.objects for insert
with check (
  bucket_id = 'gift-cards'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "gift_cards_select_own" on storage.objects;
create policy "gift_cards_select_own"
on storage.objects for select
using (
  bucket_id = 'gift-cards'
  and auth.uid()::text = (storage.foldername(name))[1]
);
