-- =========================================================
-- Backfill grade_label for all existing words based on the
-- known id ranges from each seed batch (ป.1 - ป.6)
-- =========================================================

update words set grade_label = 'ป.1' where id between 1 and 191;
update words set grade_label = 'ป.2' where id between 192 and 344;
update words set grade_label = 'ป.3' where id between 345 and 487;
update words set grade_label = 'ป.4' where id between 488 and 735;
update words set grade_label = 'ป.5' where id between 736 and 984;
update words set grade_label = 'ป.6' where id between 985 and 1231;
