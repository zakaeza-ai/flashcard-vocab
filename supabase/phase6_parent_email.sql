-- =========================================================
-- Phase 6: parent email for daily summary notifications
-- =========================================================

alter table accounts add column if not exists parent_email text;

-- Example: set a parent email for an existing account
-- update accounts set parent_email = 'parent@example.com' where pin = '0000';
