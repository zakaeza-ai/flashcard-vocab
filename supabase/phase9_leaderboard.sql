-- =========================================================
-- Phase 9: leaderboard — ranks every account by total words
-- learned. Uses a view so the ranking query stays fast and
-- simple regardless of how much progress data grows.
-- =========================================================

create or replace view leaderboard as
select
  a.id as account_id,
  a.name,
  coalesce(count(p.id) filter (where p.status = 'learned'), 0) as words_learned
from accounts a
left join progress p on p.account_id = a.id
group by a.id, a.name
order by words_learned desc;
