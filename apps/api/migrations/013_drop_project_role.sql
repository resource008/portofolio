-- Projects: the role field is no longer used.

ALTER TABLE projects
  DROP COLUMN IF EXISTS role;
