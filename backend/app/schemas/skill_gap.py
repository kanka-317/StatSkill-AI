from typing import List, Optional, Dict
from pydantic import BaseModel
from uuid import UUID


class SkillGapItem(BaseModel):
    skill: str
    domain: str
    current: int
    required: int
    gap: int
    status: str  # "priority" | "moderate" | "on track"


class DomainSummaryItem(BaseModel):
    domain: str
    avg_current: int
    avg_required: int
    avg_gap: int
    skill_count: int


class SkillGapResponse(BaseModel):
    user_id: UUID
    role: str
    cadre: str
    department: str
    overall_competency_pct: int
    overall_gap_pct: int
    skills: List[SkillGapItem]
    priority_skills: List[SkillGapItem]  # top priority items
    domain_breakdown: List[DomainSummaryItem]
