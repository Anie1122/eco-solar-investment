alter table if exists public.users
add column if not exists telegram_join_prompt_completed boolean not null default true;
