import json
from pathlib import Path
from uuid import UUID
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_skill import UserSkill
from app.schemas.skill_gap import SkillGapResponse, SkillGapItem, DomainSummaryItem

router = APIRouter(tags=["Skill-Gap Engine"])

FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "competency_framework.json"


def load_framework_fixture() -> dict:
    if not FIXTURE_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Competency framework fixture file not found."
        )
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def calculate_gap_analysis(user: User, user_skills: List[UserSkill], framework_data: dict) -> SkillGapResponse:
    roles_data = framework_data.get("roles", {})
    
    # 1. Match role in framework
    matched_role_key = None
    for r in roles_data:
        if r.lower() == user.role.lower():
            matched_role_key = r
            break
            
    # Default fallback to first role if user's role not strictly matched
    if not matched_role_key:
        matched_role_key = list(roles_data.keys())[0]

    role_info = roles_data[matched_role_key]
    required_levels: Dict[str, int] = role_info.get("required_levels", {})
    cadre = role_info.get("cadre", "General Statistical Cadre")

    # 2. Build map of user's current skill levels
    user_skill_map: Dict[str, int] = {s.skill_name: s.current_level for s in user_skills}

    # 3. Iterate through all skills in the framework to compute gap
    skill_items: List[SkillGapItem] = []
    domain_buckets: Dict[str, Dict[str, int]] = {}

    for domain_obj in framework_data.get("domains", []):
        domain_name = domain_obj.get("name", "Statistical")
        domain_buckets[domain_name] = {"total_current": 0, "total_required": 0, "count": 0}

        for skill_obj in domain_obj.get("skills", []):
            skill_name = skill_obj.get("name")
            required = required_levels.get(skill_name, 70)
            
            # If user has not explicitly self-assessed this skill yet, default to 40
            current = user_skill_map.get(skill_name, 40)
            
            # gap = required - current
            gap = required - current

            # Determine status flag:
            # gap > 25 -> "priority" (red)
            # 10 <= gap <= 25 -> "moderate" (yellow)
            # else -> "on track" (green)
            if gap > 25:
                status_flag = "priority"
            elif gap >= 10:
                status_flag = "moderate"
            else:
                status_flag = "on track"

            skill_items.append(
                SkillGapItem(
                    skill=skill_name,
                    domain=domain_name,
                    current=current,
                    required=required,
                    gap=gap,
                    status=status_flag
                )
            )

            domain_buckets[domain_name]["total_current"] += current
            domain_buckets[domain_name]["total_required"] += required
            domain_buckets[domain_name]["count"] += 1

    # 4. Sort skills by gap descending (largest gap first)
    skill_items.sort(key=lambda x: x.gap, reverse=True)

    # 5. Compute overall competency percentage & overall gap percentage
    total_current = sum(s.current for s in skill_items)
    total_required = sum(s.required for s in skill_items)

    if total_required > 0:
        overall_competency_pct = min(100, round((total_current / total_required) * 100))
        total_positive_gaps = sum(max(0, s.gap) for s in skill_items)
        overall_gap_pct = min(100, round((total_positive_gaps / total_required) * 100))
    else:
        overall_competency_pct = 100
        overall_gap_pct = 0

    # 6. Priority skills: top 3 skills by gap size
    priority_skills = skill_items[:3]

    # 7. Domain breakdown
    domain_breakdown: List[DomainSummaryItem] = []
    for d_name, d_data in domain_buckets.items():
        cnt = d_data["count"] if d_data["count"] > 0 else 1
        avg_curr = round(d_data["total_current"] / cnt)
        avg_req = round(d_data["total_required"] / cnt)
        avg_gap = avg_req - avg_curr
        domain_breakdown.append(
            DomainSummaryItem(
                domain=d_name,
                avg_current=avg_curr,
                avg_required=avg_req,
                avg_gap=avg_gap,
                skill_count=cnt
            )
        )

    return SkillGapResponse(
        user_id=user.id,
        role=user.role,
        cadre=cadre,
        department=user.department,
        overall_competency_pct=overall_competency_pct,
        overall_gap_pct=overall_gap_pct,
        skills=skill_items,
        priority_skills=priority_skills,
        domain_breakdown=domain_breakdown
    )


@router.get("/skill-gap/me", response_model=SkillGapResponse)
async def get_my_skill_gap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes real-time skill gap analysis for the currently authenticated official.
    """
    # Fetch user skills
    result = await db.execute(
        select(UserSkill).where(UserSkill.user_id == current_user.id)
    )
    user_skills = result.scalars().all()

    framework_data = load_framework_fixture()
    return calculate_gap_analysis(current_user, user_skills, framework_data)


@router.get("/skill-gap/{user_id}", response_model=SkillGapResponse)
async def get_user_skill_gap(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Computes skill gap analysis for a specific user ID:
    1. Fetches current_level from user_skills
    2. Fetches required_level from competency framework
    3. Computes gap = required - current
    4. Returns overall_competency_pct, overall_gap_pct, sorted list
    5. Flags priority (>25), moderate (10-25), on track (<10)
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Official with user ID '{user_id}' not found."
        )

    # Fetch user's recorded skills
    skill_result = await db.execute(
        select(UserSkill).where(UserSkill.user_id == user.id)
    )
    user_skills = skill_result.scalars().all()

    framework_data = load_framework_fixture()
    return calculate_gap_analysis(user, user_skills, framework_data)
