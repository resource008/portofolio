-- Projects: the cover gallery becomes `media` (image / video items, shown as a
-- carousel), and the fixed live-demo / github / case-study URLs become a free
-- `links` list (GitHub, Figma, …).

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE projects
SET media = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('type', 'image', 'url', image)), '[]'::jsonb)
  FROM jsonb_array_elements_text(images) AS image
)
WHERE jsonb_array_length(images) > 0
  AND jsonb_array_length(media) = 0;

ALTER TABLE projects
  DROP COLUMN IF EXISTS images;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE projects
SET links = (
  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object('label', 'Live Demo', 'url', live_demo_url) AS entry
    WHERE live_demo_url IS NOT NULL AND live_demo_url <> ''
    UNION ALL
    SELECT jsonb_build_object('label', 'GitHub', 'url', github_url)
    WHERE github_url IS NOT NULL AND github_url <> ''
    UNION ALL
    SELECT jsonb_build_object('label', 'Case Study', 'url', case_study_url)
    WHERE case_study_url IS NOT NULL AND case_study_url <> ''
  ) AS gathered
)
WHERE jsonb_array_length(links) = 0;

ALTER TABLE projects
  DROP COLUMN IF EXISTS live_demo_url;

ALTER TABLE projects
  DROP COLUMN IF EXISTS github_url;

ALTER TABLE projects
  DROP COLUMN IF EXISTS case_study_url;
