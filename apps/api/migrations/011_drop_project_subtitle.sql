-- Projects: the subtitle field is no longer used.

ALTER TABLE projects
  DROP COLUMN IF EXISTS subtitle;
