from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class CourseResponse(BaseModel):
    id: UUID
    title: str
    domain: str
    skill_tag: str
    level: str
    duration_hours: int
    source: str  # "iGOT" or "NSSTA"
    description: str
    is_enrolled: bool = False

    class Config:
        from_attributes = True


class RecommendationItem(BaseModel):
    id: UUID
    title: str
    domain: str
    skill_tag: str
    level: str
    duration_hours: int
    source: str
    description: str
    gap_size: int
    explanation: str
    is_enrolled: bool = False

    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    user_id: UUID
    role: str
    total_recommendations: int
    recommendations: List[RecommendationItem]


class EnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    status: str
    enrolled_at: datetime
    course_title: Optional[str] = None

    class Config:
        from_attributes = True
