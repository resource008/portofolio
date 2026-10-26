-- 017_project_announcement.sql — announcement (info / update / postingan baru)

ALTER TABLE project_settings
    ADD COLUMN IF NOT EXISTS announcement_type VARCHAR(20) NOT NULL DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS announcement_text TEXT,
    ADD COLUMN IF NOT EXISTS announcement_active BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill from the previous single info text so existing content is kept.
UPDATE project_settings
SET announcement_text = published_info_text,
    announcement_active = (published_info_text IS NOT NULL AND published_info_text <> '')
WHERE announcement_text IS NULL AND published_info_text IS NOT NULL;
