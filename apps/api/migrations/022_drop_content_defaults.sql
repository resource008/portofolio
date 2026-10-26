-- 022_drop_content_defaults.sql — remove unnecessary content default values.
-- The API always supplies these values, so the column defaults are not needed.

ALTER TABLE hero_profiles ALTER COLUMN heading DROP DEFAULT;
