import axios from 'axios';
import type {
  AuthResponse,
  User,
  CompetencyFramework,
  RoleBenchmark,
  OnboardingPayload,
  OnboardingSuccessResponse,
  UserSkill,
  SkillGapResponse,
  Course,
  RecommendationResponse,
  Enrollment,
  QuizPublicView,
  QuizSubmissionResponse,
  QuizHistoryItem,
  AdminAnalyticsResponse,
  RoleToggleResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Cold-Start Server Wake Detection
export type ServerWakeStage = 'idle' | 'waking' | 'ready' | 'error';
type WakeListener = (stage: ServerWakeStage, message?: string) => void;
const wakeListeners = new Set<WakeListener>();

export const subscribeServerWake = (listener: WakeListener) => {
  wakeListeners.add(listener);
  return () => {
    wakeListeners.delete(listener);
  };
};

export const emitWakeState = (stage: ServerWakeStage, message?: string) => {
  wakeListeners.forEach((fn) => fn(stage, message));
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout to gracefully accommodate Render free-tier cold starts
});

// Cold-start tracking state
let activePendingRequests = 0;
let coldStartTimer: any = null;

// Request interceptor to attach JWT token and track long-running cold starts
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('statskill_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    activePendingRequests++;
    if (activePendingRequests === 1) {
      // If request takes more than 2.5s, likely spinning up cold instance
      coldStartTimer = setTimeout(() => {
        if (activePendingRequests > 0) {
          emitWakeState('waking', 'Connecting to Cloud Web Service — free-tier instances take ~30–45s to wake up...');
        }
      }, 2500);
    }

    return config;
  },
  (error) => {
    activePendingRequests = Math.max(0, activePendingRequests - 1);
    return Promise.reject(error);
  }
);

// Response interceptor for cold start dismissal & unified 401 handling
apiClient.interceptors.response.use(
  (response) => {
    activePendingRequests = Math.max(0, activePendingRequests - 1);
    if (activePendingRequests === 0) {
      if (coldStartTimer) clearTimeout(coldStartTimer);
      emitWakeState('ready', 'Server connected & active');
    }
    return response;
  },
  (error) => {
    activePendingRequests = Math.max(0, activePendingRequests - 1);
    if (activePendingRequests === 0) {
      if (coldStartTimer) clearTimeout(coldStartTimer);
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        emitWakeState('error', 'Request timed out while waking server. Please refresh to retry.');
      } else {
        emitWakeState('ready');
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('statskill_token');
      localStorage.removeItem('statskill_user');
    }
    return Promise.reject(error);
  }
);

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------
export interface HealthCheckData {
  status: string;
  app_name: string;
  app_env: string;
  database_connected: boolean;
  version: string;
  free_tier_status: Record<string, string>;
  timestamp: string;
}

export const checkSystemHealth = async (): Promise<HealthCheckData> => {
  const response = await apiClient.get<HealthCheckData>('/api/v1/health');
  return response.data;
};

// -----------------------------------------------------------------------------
// Authentication APIs
// -----------------------------------------------------------------------------
export const signupApi = async (data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
  experience_years?: number;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/signup', data);
  return response.data;
};

export const loginApi = async (data: {
  email: string;
  password: string;
}): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const getMeApi = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

// -----------------------------------------------------------------------------
// Competency Framework & Onboarding APIs
// -----------------------------------------------------------------------------
export const getCompetencyFrameworkApi = async (): Promise<CompetencyFramework> => {
  const response = await apiClient.get<CompetencyFramework>('/competency-framework');
  return response.data;
};

export const getRoleBenchmarkApi = async (role: string): Promise<RoleBenchmark> => {
  const response = await apiClient.get<RoleBenchmark>(`/competency-framework/${encodeURIComponent(role)}`);
  return response.data;
};

export const submitOnboardingApi = async (data: OnboardingPayload): Promise<OnboardingSuccessResponse> => {
  const response = await apiClient.post<OnboardingSuccessResponse>('/onboarding', data);
  return response.data;
};

export const getMySkillsApi = async (): Promise<UserSkill[]> => {
  const response = await apiClient.get<UserSkill[]>('/my-skills');
  return response.data;
};

// -----------------------------------------------------------------------------
// Skill-Gap Engine APIs (Phase 2)
// -----------------------------------------------------------------------------
export const getSkillGapApi = async (userId: string): Promise<SkillGapResponse> => {
  const response = await apiClient.get<SkillGapResponse>(`/skill-gap/${userId}`);
  return response.data;
};

export const getMySkillGapApi = async (): Promise<SkillGapResponse> => {
  const response = await apiClient.get<SkillGapResponse>('/skill-gap/me');
  return response.data;
};

// -----------------------------------------------------------------------------
// Course Recommendation & iGOT Integration APIs (Phase 3)
// -----------------------------------------------------------------------------
export const getRecommendationsApi = async (userId: string): Promise<RecommendationResponse> => {
  const response = await apiClient.get<RecommendationResponse>(`/recommendations/${userId}`);
  return response.data;
};

export const getMyRecommendationsApi = async (): Promise<RecommendationResponse> => {
  const response = await apiClient.get<RecommendationResponse>('/recommendations/me');
  return response.data;
};

export const enrollCourseApi = async (courseId: string): Promise<Enrollment> => {
  const response = await apiClient.post<Enrollment>(`/courses/${courseId}/enroll`);
  return response.data;
};

export const getMyEnrollmentsApi = async (): Promise<Enrollment[]> => {
  const response = await apiClient.get<Enrollment[]>('/my-enrollments');
  return response.data;
};

export const getCoursesApi = async (): Promise<Course[]> => {
  const response = await apiClient.get<Course[]>('/courses');
  return response.data;
};

// -----------------------------------------------------------------------------
// AI MCQ Generator & RAG Pipeline APIs (Phase 4)
// -----------------------------------------------------------------------------
export const generateQuizApi = async (formData: FormData): Promise<QuizPublicView> => {
  const response = await apiClient.post<QuizPublicView>('/quiz/generate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // Allow up to 60s for PDF extraction + LLM generation
  });
  return response.data;
};

export const getQuizApi = async (quizId: string): Promise<QuizPublicView> => {
  const response = await apiClient.get<QuizPublicView>(`/quiz/${quizId}`);
  return response.data;
};

export const submitQuizApi = async (
  quizId: string,
  answers: Record<string, string>
): Promise<QuizSubmissionResponse> => {
  const response = await apiClient.post<QuizSubmissionResponse>(`/quiz/${quizId}/submit`, {
    answers,
  });
  return response.data;
};

export const getQuizHistoryApi = async (): Promise<QuizHistoryItem[]> => {
  const response = await apiClient.get<QuizHistoryItem[]>('/quiz/user/history');
  return response.data;
};

// -----------------------------------------------------------------------------
// Admin Dashboard & Analytics APIs (Phase 5)
// -----------------------------------------------------------------------------
export const getAdminAnalyticsApi = async (): Promise<AdminAnalyticsResponse> => {
  const response = await apiClient.get<AdminAnalyticsResponse>('/admin/analytics');
  return response.data;
};

export const toggleAdminRoleApi = async (): Promise<RoleToggleResponse> => {
  const response = await apiClient.post<RoleToggleResponse>('/admin/demo-role-toggle');
  return response.data;
};
