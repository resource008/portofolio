-- 018_project_announcements.sql — multiple announcements (umum + promosi project)

CREATE TABLE IF NOT EXISTS project_announcements (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(20) NOT NULL DEFAULT 'general',
    type VARCHAR(20) NOT NULL DEFAULT 'info',
    text TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INT NOT NULL DEFAULT 0,
    post_mode VARCHAR(10) NOT NULL DEFAULT 'auto',
    project_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    auto_limit INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate the previous single announcement, if any.
INSERT INTO project_announcements (kind, type, text, is_active, order_index)
SELECT
    'general',
    CASE WHEN ps.announcement_type = 'new_post' THEN 'info' ELSE ps.announcement_type END,
    ps.announcement_text,
    ps.announcement_active,
    0
FROM project_settings ps
WHERE ps.announcement_text IS NOT NULL
  AND ps.announcement_text <> ''
  AND NOT EXISTS (SELECT 1 FROM project_announcements);
