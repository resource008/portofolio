-- Projects: the "dapat dicari" (searchable) toggle is no longer used. Every
-- published project now participates in search.

ALTER TABLE projects
  DROP COLUMN IF EXISTS is_searchable;
