create extension if not exists pgcrypto;

create table if not exists public.gift_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text,
  email text,
  gift_card_type text not null,
  gift_card_code text not null,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  note text,
  front_image_url text not null,
  back_image_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gift_card_payments_user_id on public.gift_card_payments (user_id);
create index if not exists idx_gift_card_payments_status on public.gift_card_payments (status);
create index if not exists idx_gift_card_payments_created_at on public.gift_card_payments (created_at desc);

create or replace function public.set_gift_card_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_gift_card_payments_updated_at on public.gift_card_payments;
create trigger trg_gift_card_payments_updated_at
before update on public.gift_card_payments
for each row
execute function public.set_gift_card_payments_updated_at();

alter table public.gift_card_payments enable row level security;

drop policy if exists "gift_card_payments_select_own" on public.gift_card_payments;
create policy "gift_card_payments_select_own"
on public.gift_card_payments
for select
using (auth.uid() = user_id);

drop policy if exists "gift_card_payments_insert_own" on public.gift_card_payments;
create policy "gift_card_payments_insert_own"
on public.gift_card_payments
for insert
with check (auth.uid() = user_id);

drop policy if exists "gift_card_payments_update_none" on public.gift_card_payments;
create policy "gift_card_payments_update_none"
on public.gift_card_payments
for update
using (false)
with check (false);

insert into storage.buckets (id, name, public)
values ('gift-cards', 'gift-cards', false)
on conflict (id) do nothing;

drop policy if exists "gift_cards_upload_own" on storage.objects;
create policy "gift_cards_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gift-cards'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "gift_cards_select_own" on storage.objects;
create policy "gift_cards_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'gift-cards'
  and (storage.foldername(name))[1] = auth.uid()::text
);
