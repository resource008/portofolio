-- Hero & profile: the navigation icon is no longer used.

ALTER TABLE hero_profiles
  DROP COLUMN IF EXISTS navigation_icon;
