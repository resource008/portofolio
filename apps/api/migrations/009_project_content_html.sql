-- Projects: the content is now a single rich-text HTML body (with inline
-- images / videos and text formatting) instead of a JSONB list of blocks.

ALTER TABLE projects
  ALTER COLUMN content TYPE TEXT
  USING COALESCE(content::text, '');

ALTER TABLE projects
  ALTER COLUMN content SET DEFAULT '';

UPDATE projects SET content = '' WHERE content IN ('[]', 'null');

ALTER TABLE projects
  ALTER COLUMN content SET NOT NULL;
