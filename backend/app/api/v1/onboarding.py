import json
import os
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_skill import UserSkill
from app.schemas.onboarding import (
    OnboardingRequest,
    OnboardingSuccessResponse,
    CompetencyFrameworkResponse,
    RoleBenchmarkResponse,
    UserSkillResponse
)

router = APIRouter(tags=["Competency & Onboarding"])

FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "competency_framework.json"


def load_framework_fixture() -> dict:
    if not FIXTURE_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Competency framework fixture file not found."
        )
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/competency-framework", response_model=CompetencyFrameworkResponse)
async def get_competency_framework():
    """
    Returns the complete NSSTA/MoSPI competency taxonomy across all 4 domains:
    Statistical, Technical, Digital Governance, Behavioural.
    """
    data = load_framework_fixture()
    return CompetencyFrameworkResponse(
        framework_name=data.get("framework_name", "NSSTA-MoSPI Framework"),
        version=data.get("version", "2026.1"),
        description=data.get("description", ""),
        domains=data.get("domains", [])
    )


@router.get("/competency-framework/{role}", response_model=RoleBenchmarkResponse)
async def get_role_competency_framework(role: str):
    """
    Returns the required benchmark proficiency levels (0-100) for each sub-skill
    corresponding to a specific government role.
    Simulates the official NSSTA/MoSPI competency benchmark.
    """
    data = load_framework_fixture()
    roles = data.get("roles", {})
    
    # Case-insensitive / normalized lookup
    matched_key = None
    for r in roles:
        if r.lower() == role.lower():
            matched_key = r
            break
            
    if not matched_key:
        if role.lower() in ["admin", "administrator", "leadership"]:
            matched_key = "admin" if "admin" in roles else "Director / Senior Statistician"
        elif "Statistical Analyst" in roles:
            matched_key = "Statistical Analyst"
        elif roles:
            matched_key = list(roles.keys())[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role '{role}' not found in competency framework."
            )
        
    role_info = roles[matched_key]
    return RoleBenchmarkResponse(
        role=role_info.get("title", matched_key),
        cadre=role_info.get("cadre", "General Cadre"),
        required_levels=role_info.get("required_levels", {})
    )


@router.post("/onboarding", response_model=OnboardingSuccessResponse)
async def submit_onboarding(
    payload: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts self-rated skill scores (0-100) across the 4 competency domains
    and stores them in the user_skills table.
    Also updates role, department, and experience_years on the user profile.
    """
    # 1. Update user profile attributes if provided
    if payload.role:
        current_user.role = payload.role
    if payload.department:
        current_user.department = payload.department
    if payload.experience_years is not None:
        current_user.experience_years = payload.experience_years
    
    # 2. Clear previous skill ratings for this user (or upsert)
    await db.execute(delete(UserSkill).where(UserSkill.user_id == current_user.id))
    
    # 3. Insert new assessed skills
    new_skills = []
    for skill_input in payload.skills:
        user_skill = UserSkill(
            user_id=current_user.id,
            skill_name=skill_input.skill_name.strip(),
            domain=skill_input.domain.strip(),
            current_level=max(0, min(100, skill_input.current_level))
        )
        db.add(user_skill)
        new_skills.append(user_skill)
        
    await db.commit()
    
    # Refresh to fetch assigned IDs and timestamps
    for s in new_skills:
        await db.refresh(s)

    return OnboardingSuccessResponse(
        status="success",
        message="Competency profile successfully assessed and recorded.",
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department,
        experience_years=current_user.experience_years,
        skills_recorded=len(new_skills),
        skills=[UserSkillResponse.model_validate(s) for s in new_skills]
    )


@router.get("/my-skills", response_model=List[UserSkillResponse])
async def get_my_skills(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all recorded competency self-assessments for the authenticated official.
    """
    result = await db.execute(
        select(UserSkill)
        .where(UserSkill.user_id == current_user.id)
        .order_by(UserSkill.domain, UserSkill.skill_name)
    )
    skills = result.scalars().all()
    return [UserSkillResponse.model_validate(s) for s in skills]
