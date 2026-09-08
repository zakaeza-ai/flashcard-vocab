-- =========================================================
-- Phase 7: unlock the next day's words as soon as today's
-- words are all learned, instead of waiting for the next
-- calendar day. Streak tracking is unaffected (still based
-- on calendar dates).
-- =========================================================

alter table app_state add column if not exists current_day_index integer not null default 1;

-- Backfill existing accounts so nobody loses their place:
-- estimate their current day from how many calendar days have
-- passed since they started (matches the old behavior once).
update app_state
set current_day_index = least(365, greatest(1, (current_date - start_date) + 1))
where current_day_index = 1;
