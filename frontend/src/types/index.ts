export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  experience_years: number;
  is_active?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user_id: string;
  role: string;
  name: string;
}

export interface SkillItem {
  name: string;
  description: string;
}

export interface DomainItem {
  id: string;
  name: string;
  description: string;
  skills: SkillItem[];
}

export interface CompetencyFramework {
  framework_name: string;
  version: string;
  description: string;
  domains: DomainItem[];
}

export interface RoleBenchmark {
  role: string;
  cadre: string;
  required_levels: Record<string, number>;
}

export interface UserSkill {
  id: string;
  skill_name: string;
  domain: string;
  current_level: number;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingPayload {
  role?: string;
  department?: string;
  experience_years?: number;
  skills: {
    skill_name: string;
    domain: string;
    current_level: number;
  }[];
}

export interface OnboardingSuccessResponse {
  status: string;
  message: string;
  user_id: string;
  role: string;
  department: string;
  experience_years: number;
  skills_recorded: number;
  skills: UserSkill[];
}

// -----------------------------------------------------------------------------
// Phase 2: Skill-Gap Engine Types
// -----------------------------------------------------------------------------
export type SkillGapStatus = 'priority' | 'moderate' | 'on track';

export interface SkillGapItem {
  skill: string;
  domain: string;
  current: number;
  required: number;
  gap: number;
  status: SkillGapStatus;
}

export interface DomainSummaryItem {
  domain: string;
  avg_current: number;
  avg_required: number;
  avg_gap: number;
  skill_count: number;
}

export interface SkillGapResponse {
  user_id: string;
  role: string;
  cadre: string;
  department: string;
  overall_competency_pct: number;
  overall_gap_pct: number;
  skills: SkillGapItem[];
  priority_skills: SkillGapItem[];
  domain_breakdown: DomainSummaryItem[];
}

// -----------------------------------------------------------------------------
// Phase 3: Course Recommendation & iGOT Integration Types
// -----------------------------------------------------------------------------
export interface Course {
  id: string;
  title: string;
  domain: string;
  skill_tag: string;
  level: string;
  duration_hours: number;
  source: 'iGOT' | 'NSSTA';
  description: string;
  is_enrolled?: boolean;
}

export interface RecommendationItem extends Course {
  gap_size: number;
  explanation: string;
  is_enrolled: boolean;
}

export interface RecommendationResponse {
  user_id: string;
  role: string;
  total_recommendations: number;
  recommendations: RecommendationItem[];
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  course_title?: string;
}

// -----------------------------------------------------------------------------
// Phase 4: AI MCQ Generator & RAG Pipeline Types
// -----------------------------------------------------------------------------
export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QuizQuestionPublic {
  id: string;
  question_order: number;
  question: string;
  options: QuestionOptions;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
}

export interface QuizQuestionReview {
  id: string;
  question_order: number;
  question: string;
  options: QuestionOptions;
  correct_answer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  user_answer?: string | null;
  is_correct?: boolean | null;
}

export interface QuizPublicView {
  id: string;
  title: string;
  topic_hint?: string | null;
  skill_name?: string | null;
  language?: string;
  num_questions: number;
  status: 'pending' | 'completed' | string;
  created_at: string;
  questions: QuizQuestionPublic[];
}

export interface SkillUpdateResult {
  skill_name: string;
  previous_level: number;
  new_level: number;
  delta: number;
}

export interface QuizSubmissionResponse {
  quiz_id: string;
  language?: string;
  score: number;
  total_questions: number;
  score_percentage: number;
  status: string;
  skill_update?: SkillUpdateResult | null;
  results: QuizQuestionReview[];
}

export interface QuizHistoryItem {
  id: string;
  title: string;
  topic_hint?: string | null;
  skill_name?: string | null;
  language?: string;
  num_questions: number;
  score: number;
  score_percentage: number;
  status: string;
  created_at: string;
  completed_at?: string | null;
}

// -----------------------------------------------------------------------------
// Phase 5: Admin Dashboard & Analytics Types
// -----------------------------------------------------------------------------
export interface DepartmentGapItem {
  department: string;
  official_count: number;
  avg_gap: number;
  avg_competency: number;
}

export interface SystemicGapItem {
  skill_name: string;
  domain: string;
  avg_gap: number;
  affected_officials_count: number;
  demand_priority: 'Urgent' | 'High' | 'Moderate' | string;
}

export interface CourseEnrollmentStat {
  course_id: string;
  title: string;
  source: string;
  domain: string;
  enrollment_count: number;
}

export interface AdminAnalyticsResponse {
  total_officials: number;
  avg_competency_pct: number;
  avg_gap_pct: number;
  department_gaps: DepartmentGapItem[];
  top_systemic_gaps: SystemicGapItem[];
  course_enrollments: CourseEnrollmentStat[];
  total_enrollments: number;
}

export interface RoleToggleResponse {
  user_id: string;
  name: string;
  previous_role: string;
  current_role: string;
  is_admin: boolean;
  message: string;
}

