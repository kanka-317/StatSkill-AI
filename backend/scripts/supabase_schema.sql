-- =============================================================================
-- StatSkill AI (SIH PS 26101) - Supabase PostgreSQL 16 Schema Setup
-- 100% Free-Tier Cloud Deployment
-- 
-- Run this script in the Supabase Dashboard -> SQL Editor
-- It enables pgvector and creates all core tables, indexes, and constraints.
-- =============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Users Table (Government Statistical Officials)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'Statistical Analyst',
    department VARCHAR(255) NOT NULL DEFAULT 'MoSPI',
    experience_years INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- 3. User Skills Table (Self-Assessed & Elevated Competency Scores 0-100)
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL, -- Statistical, Technical, Digital Governance, Behavioural
    current_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_name ON user_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_user_skills_domain ON user_skills(domain);

-- 4. Courses Table (Mission Karmayogi / iGOT & NSSTA Academy Catalog)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    skill_tag VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'Intermediate',
    duration_hours INTEGER NOT NULL DEFAULT 10,
    source VARCHAR(50) NOT NULL DEFAULT 'iGOT', -- 'iGOT' or 'NSSTA'
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_skill_tag ON courses(skill_tag);
CREATE INDEX IF NOT EXISTS idx_courses_domain ON courses(domain);
CREATE INDEX IF NOT EXISTS idx_courses_source ON courses(source);

-- 5. Course Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'enrolled', -- enrolled, in_progress, completed
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);

-- 6. Quizzes Table (RAG Assessment Runs)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'AI Generated Knowledge Assessment',
    topic_hint VARCHAR(255),
    skill_name VARCHAR(255),
    language VARCHAR(50) NOT NULL DEFAULT 'English',
    num_questions INTEGER NOT NULL DEFAULT 5,
    score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_skill_name ON quizzes(skill_name);

-- 7. Quiz Questions Table (MCQs with Explanations & Citations)
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL DEFAULT 1,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer VARCHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D'
    explanation TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Medium',
    user_answer VARCHAR(1),
    is_correct BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- 8. Competencies Table with pgvector (Ontology Embeddings)
CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    domain VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competencies_code ON competencies(code);
CREATE INDEX IF NOT EXISTS idx_competencies_domain ON competencies(domain);

-- 9. Row Level Security (RLS) - Best Practices
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;

-- Public read-only policies for shared framework catalogs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read courses') THEN
        CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read competencies') THEN
        CREATE POLICY "Public read competencies" ON competencies FOR SELECT USING (true);
    END IF;
END $$;

-- Verify Tables Created
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
