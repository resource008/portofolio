-- 006_experience_is_current.sql — mark an ongoing work experience entry.
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;
