-- =========================================================
-- flashcard-vocab: Phase 1 schema
-- =========================================================

-- Word bank (replace/add rows once the full ~3,000-word set is ready)
create table if not exists words (
  id integer primary key,
  en text not null,
  read text not null,
  mean text not null,
  day_index integer not null
);

-- Per-word learner status: new / learned / review
create table if not exists progress (
  word_id integer primary key references words(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'learned', 'review')),
  updated_at timestamptz not null default now()
);

-- Overall app state: start date, last active date, current streak
create table if not exists app_state (
  id integer primary key default 1,
  start_date date not null default current_date,
  last_active_date date,
  current_streak integer not null default 0,
  constraint app_state_single_row check (id = 1)
);
insert into app_state (id) values (1) on conflict (id) do nothing;

-- RLS is enabled now, but policies are wide open for Phase 1 since
-- this app has no multi-user login yet. Tighten these before a real
-- production deploy if write access needs to be restricted.
alter table words enable row level security;
alter table progress enable row level security;
alter table app_state enable row level security;

create policy "public read words" on words for select using (true);
create policy "public read progress" on progress for select using (true);
create policy "public write progress" on progress for all using (true) with check (true);
create policy "public read app_state" on app_state for select using (true);
create policy "public write app_state" on app_state for all using (true) with check (true);

-- Phase 2.5: optional image support (leave NULL until you add real images)
alter table words add column if not exists image_url text;

-- Phase 3: grade-level label (informational tag only, not a gate)
alter table words add column if not exists grade_label text;
