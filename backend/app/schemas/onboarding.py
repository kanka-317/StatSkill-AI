from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class SkillRatingInput(BaseModel):
    skill_name: str
    domain: str
    current_level: int = Field(..., ge=0, le=100, description="Self-assessed level from 0 to 100")


class OnboardingRequest(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    skills: List[SkillRatingInput]


class UserSkillResponse(BaseModel):
    id: UUID
    skill_name: str
    domain: str
    current_level: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OnboardingSuccessResponse(BaseModel):
    status: str = "success"
    message: str
    user_id: UUID
    role: str
    department: str
    experience_years: int
    skills_recorded: int
    skills: List[UserSkillResponse]


class SkillItem(BaseModel):
    name: str
    description: str


class DomainItem(BaseModel):
    id: str
    name: str
    description: str
    skills: List[SkillItem]


class CompetencyFrameworkResponse(BaseModel):
    framework_name: str
    version: str
    description: str
    domains: List[DomainItem]


class RoleBenchmarkResponse(BaseModel):
    role: str
    cadre: str
    required_levels: Dict[str, int]
