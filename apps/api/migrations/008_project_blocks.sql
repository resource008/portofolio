-- Projects (Dribbble-style): the content becomes an ordered list of blocks
-- (photo / video / text / embed) that can be reordered. The cover stays in
-- thumbnail_url; the media gallery now lives inside the content blocks, so the
-- separate project_media table is no longer needed.

ALTER TABLE projects
  ALTER COLUMN content TYPE JSONB
  USING CASE
    WHEN content IS NULL OR content = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'content', content))
  END;

ALTER TABLE projects
  ALTER COLUMN content SET DEFAULT '[]'::jsonb;

UPDATE projects SET content = '[]'::jsonb WHERE content IS NULL;

ALTER TABLE projects
  ALTER COLUMN content SET NOT NULL;

DROP TABLE IF EXISTS project_media;
