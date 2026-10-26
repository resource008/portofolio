-- 007_experience_skills.sql — replace responsibilities/key_achievements with a skills list.
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE experiences DROP COLUMN IF EXISTS responsibilities;
ALTER TABLE experiences DROP COLUMN IF EXISTS key_achievements;
