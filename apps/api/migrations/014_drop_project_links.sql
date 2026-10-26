-- Projects: the separate links list is removed; links are now content blocks
-- (type "link") with a logo derived from the URL.

ALTER TABLE projects
  DROP COLUMN IF EXISTS links;
