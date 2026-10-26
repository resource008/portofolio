-- 001_init.sql — content tables (portfolio CMS)

CREATE TABLE IF NOT EXISTS hero_profiles (
    id SERIAL PRIMARY KEY,
    navigation_icon VARCHAR(255),
    greeting VARCHAR(50) DEFAULT 'Halo, Saya',
    full_name VARCHAR(150) NOT NULL,
    description TEXT,
    photo_url VARCHAR(255),
    cv_file_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_skills (
    id SERIAL PRIMARY KEY,
    hero_profile_id INT REFERENCES hero_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS about_me (
    id SERIAL PRIMARY KEY,
    logo_svg VARCHAR(255),
    title VARCHAR(150) DEFAULT 'About Me',
    description TEXT NOT NULL,
    location VARCHAR(100),
    professional_field VARCHAR(150),
    professional_interests TEXT,
    career_goals TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS about_statistics (
    id SERIAL PRIMARY KEY,
    about_me_id INT REFERENCES about_me(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    value VARCHAR(50) NOT NULL,
    order_index INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skill_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    order_index INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skill_items (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES skill_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    proficiency VARCHAR(50) DEFAULT 'Intermediate',
    order_index INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS educations (
    id SERIAL PRIMARY KEY,
    logo_url VARCHAR(255),
    institution_name VARCHAR(200) NOT NULL,
    degree_major VARCHAR(150) NOT NULL,
    range_date VARCHAR(100) NOT NULL,
    gpa NUMERIC(3, 2),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    education_id INT REFERENCES educations(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    period VARCHAR(100),
    credential_url VARCHAR(255),
    certificate_file VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS experiences (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    position VARCHAR(150) NOT NULL,
    range_date VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    description TEXT,
    responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experience_photos (
    id SERIAL PRIMARY KEY,
    experience_id INT REFERENCES experiences(id) ON DELETE CASCADE,
    photo_url VARCHAR(255) NOT NULL,
    caption VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(255),
    slug VARCHAR(250) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    date_range VARCHAR(100),
    content TEXT,
    role VARCHAR(100),
    thumbnail_url VARCHAR(255),
    tech_stacks JSONB NOT NULL DEFAULT '[]'::jsonb,
    live_demo_url VARCHAR(255),
    github_url VARCHAR(255),
    case_study_url VARCHAR(255),
    is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
    likes_count INT NOT NULL DEFAULT 0,
    shares_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_media (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    media_url VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS social_links (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT,
    day_of_week INT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_inboxes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    public_key VARCHAR(255) NOT NULL,
    auth_token VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(150) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    notifiable_type VARCHAR(100) NOT NULL,
    notifiable_id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_notifiable ON notifications (notifiable_type, notifiable_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (notifiable_type, notifiable_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_logs (event_type, day_of_week);
