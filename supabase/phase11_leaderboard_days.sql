-- =========================================================
-- Phase 11: add "days studied" (current_day_index) to the
-- leaderboard alongside the words-learned count, so rankings
-- can show e.g. "เรียนมาแล้ว 14 วัน · 150 คำ".
-- =========================================================

create or replace view leaderboard as
select
  a.id as account_id,
  a.name,
  coalesce(count(*) filter (where p.status = 'learned'), 0) as words_learned,
  coalesce(s.current_day_index, 1) as day_index
from accounts a
left join progress p on p.account_id = a.id
left join app_state s on s.account_id = a.id
group by a.id, a.name, s.current_day_index
order by words_learned desc;
