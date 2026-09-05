"""0001_initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Enable pgvector extension if PostgreSQL
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")

    # 2. Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(100), nullable=False, server_default='Statistical Analyst'),
        sa.Column('department', sa.String(255), nullable=False, server_default='MoSPI'),
        sa.Column('experience_years', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_users_email', 'users', ['email'])

    # 3. User skills table
    op.create_table(
        'user_skills',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_name', sa.String(255), nullable=False),
        sa.Column('domain', sa.String(100), nullable=False),
        sa.Column('current_level', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_user_skills_user_id', 'user_skills', ['user_id'])
    op.create_index('idx_user_skills_name', 'user_skills', ['skill_name'])

    # 4. Courses table
    op.create_table(
        'courses',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('domain', sa.String(100), nullable=False),
        sa.Column('skill_tag', sa.String(255), nullable=False),
        sa.Column('level', sa.String(50), nullable=False, server_default='Intermediate'),
        sa.Column('duration_hours', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('source', sa.String(50), nullable=False, server_default='iGOT'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_courses_skill_tag', 'courses', ['skill_tag'])
    op.create_index('idx_courses_domain', 'courses', ['domain'])

    # 5. Enrollments table
    op.create_table(
        'enrollments',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.Uuid(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='enrolled'),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_enrollments_user_id', 'enrollments', ['user_id'])
    op.create_index('idx_enrollments_course_id', 'enrollments', ['course_id'])

    # 6. Quizzes table
    op.create_table(
        'quizzes',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(), nullable=False, server_default='AI Generated Knowledge Assessment'),
        sa.Column('topic_hint', sa.String(), nullable=True),
        sa.Column('skill_name', sa.String(), nullable=True),
        sa.Column('language', sa.String(50), nullable=False, server_default='English'),
        sa.Column('num_questions', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_quizzes_user_id', 'quizzes', ['user_id'])

    # 7. Quiz questions table
    op.create_table(
        'quiz_questions',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('quiz_id', sa.Uuid(as_uuid=True), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_order', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('option_a', sa.Text(), nullable=False),
        sa.Column('option_b', sa.Text(), nullable=False),
        sa.Column('option_c', sa.Text(), nullable=False),
        sa.Column('option_d', sa.Text(), nullable=False),
        sa.Column('correct_answer', sa.String(1), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.String(20), nullable=False, server_default='Medium'),
        sa.Column('user_answer', sa.String(1), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
    )
    op.create_index('idx_quiz_questions_quiz_id', 'quiz_questions', ['quiz_id'])

    # 8. Competencies table (pgvector)
    if conn.dialect.name == "postgresql":
        op.create_table(
            'competencies',
            sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('code', sa.String(50), nullable=False, unique=True),
            sa.Column('domain', sa.String(100), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('level', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('embedding', Vector(768), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('idx_competencies_code', 'competencies', ['code'])
        op.create_index('idx_competencies_domain', 'competencies', ['domain'])


def downgrade() -> None:
    op.drop_table('quiz_questions')
    op.drop_table('quizzes')
    op.drop_table('enrollments')
    op.drop_table('courses')
    op.drop_table('user_skills')
    op.drop_table('users')
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.drop_table('competencies')
