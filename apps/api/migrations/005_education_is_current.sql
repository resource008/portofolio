-- 005_education_is_current.sql — mark an ongoing education entry.

ALTER TABLE educations ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;
