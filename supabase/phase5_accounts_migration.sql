-- =========================================================
-- Phase 5: multi-account PIN login + subscription expiry
-- Run this ONCE. It converts the app from single-user to
-- multi-account, migrating your existing progress/streak
-- data into a default account (PIN 0000).
-- =========================================================

create table if not exists accounts (
  id serial primary key,
  name text not null,
  pin text not null unique,
  expires_at date not null,
  created_at timestamptz not null default now()
);

alter table accounts enable row level security;
create policy "public read accounts" on accounts for select using (true);

-- Default account: change the PIN/name/expiry below before running,
-- or just run as-is and edit the row later in Table Editor.
insert into accounts (name, pin, expires_at)
values ('บัญชีทดสอบ', '0000', current_date + interval '1 year')
on conflict (pin) do nothing;

-- ---- progress: scope to account ----
alter table progress add column if not exists account_id integer references accounts(id);
update progress set account_id = (select id from accounts where pin = '0000') where account_id is null;
alter table progress alter column account_id set not null;
alter table progress drop constraint if exists progress_pkey;
alter table progress add primary key (account_id, word_id);

-- ---- app_state: scope to account (was a single fixed row before) ----
alter table app_state add column if not exists account_id integer references accounts(id);
update app_state set account_id = (select id from accounts where pin = '0000') where account_id is null;
alter table app_state alter column account_id set not null;
alter table app_state drop constraint if exists app_state_single_row;
alter table app_state drop constraint if exists app_state_pkey;
alter table app_state add primary key (account_id);
alter table app_state drop column if exists id;
