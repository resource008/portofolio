-- 003_drop_about_skills.sql — remove unused About Me & Skills tables.

DROP TABLE IF EXISTS about_me CASCADE;
DROP TABLE IF EXISTS about_statistics CASCADE;
DROP TABLE IF EXISTS skill_categories CASCADE;
DROP TABLE IF EXISTS skill_items CASCADE;
