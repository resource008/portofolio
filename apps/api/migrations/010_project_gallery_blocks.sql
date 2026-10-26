-- Projects (Dribbble-style, revised):
--   * `images` holds the cover gallery (a carousel when more than one image).
--   * `content` is again an ordered list of blocks (heading / image / video /
--     link) that can be reordered.
--   * the single `thumbnail_url` cover is replaced by `images[0]`.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE projects
SET images = jsonb_build_array(thumbnail_url)
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_url <> ''
  AND jsonb_array_length(images) = 0;

ALTER TABLE projects
  ALTER COLUMN content DROP DEFAULT;

ALTER TABLE projects
  ALTER COLUMN content TYPE JSONB USING '[]'::jsonb;

ALTER TABLE projects
  ALTER COLUMN content SET DEFAULT '[]'::jsonb;

ALTER TABLE projects
  ALTER COLUMN content SET NOT NULL;

ALTER TABLE projects
  DROP COLUMN IF EXISTS thumbnail_url;
