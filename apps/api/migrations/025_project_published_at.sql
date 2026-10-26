-- Projects: catat kapan proyek dipublikasikan. Proyek yang sudah terbit
-- diisi dari created_at agar tetap punya tanggal.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE projects
  SET published_at = created_at
  WHERE is_published = TRUE AND published_at IS NULL;
