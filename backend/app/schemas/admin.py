from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class DepartmentGapItem(BaseModel):
    department: str
    official_count: int
    avg_gap: float
    avg_competency: float


class SystemicGapItem(BaseModel):
    skill_name: str
    domain: str
    avg_gap: float
    affected_officials_count: int
    demand_priority: str  # "Urgent", "High", "Moderate"


class CourseEnrollmentStat(BaseModel):
    course_id: UUID
    title: str
    source: str
    domain: str
    enrollment_count: int


class AdminAnalyticsResponse(BaseModel):
    total_officials: int
    avg_competency_pct: float
    avg_gap_pct: float
    department_gaps: List[DepartmentGapItem]
    top_systemic_gaps: List[SystemicGapItem]  # Predictive training demand
    course_enrollments: List[CourseEnrollmentStat]
    total_enrollments: int


class RoleToggleResponse(BaseModel):
    user_id: UUID
    name: str
    previous_role: str
    current_role: str
    is_admin: bool
    message: str
