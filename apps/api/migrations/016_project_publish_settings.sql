-- 016_project_publish_settings.sql — publish status + global project info text

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS project_settings (
    id SERIAL PRIMARY KEY,
    published_info_text TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO project_settings (id, published_info_text)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
