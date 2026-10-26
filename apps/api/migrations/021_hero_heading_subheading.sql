-- 021_hero_heading_subheading.sql — rename hero fields:
--   greeting  -> heading    (sapaan, tampil di atas)
--   full_name -> subheading (nama lengkap, tampil di bawah)

ALTER TABLE hero_profiles RENAME COLUMN greeting TO heading;
ALTER TABLE hero_profiles RENAME COLUMN full_name TO subheading;
