-- 019_drop_announcement_auto_limit.sql — auto mode no longer configurable

ALTER TABLE project_announcements DROP COLUMN IF EXISTS auto_limit;
