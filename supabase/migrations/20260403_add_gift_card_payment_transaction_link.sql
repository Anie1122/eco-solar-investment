alter table public.gift_card_payments
  add column if not exists transaction_id uuid;

create index if not exists idx_gift_card_payments_transaction_id
  on public.gift_card_payments (transaction_id);
