-- 020_hero_logo.sql — separate croppable logo/avatar from the hero content photo.

ALTER TABLE hero_profiles
    ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255);
