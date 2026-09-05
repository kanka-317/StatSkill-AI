import json
from pathlib import Path
from typing import List, Dict, Set
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_skill import UserSkill
from app.models.course import Course, Enrollment
from app.schemas.recommendation import (
    CourseResponse,
    RecommendationItem,
    RecommendationResponse,
    EnrollmentResponse
)
from app.api.v1.skill_gap import load_framework_fixture, calculate_gap_analysis

router = APIRouter(tags=["Course Recommendation & iGOT Integration"])

COURSES_FIXTURE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "courses_seed.json"


async def seed_courses_if_empty(db: AsyncSession):
    """Seed initial course catalog if table is empty."""
    res = await db.execute(select(Course).limit(1))
    if not res.scalar_one_or_none():
        if COURSES_FIXTURE_PATH.exists():
            with open(COURSES_FIXTURE_PATH, "r", encoding="utf-8") as f:
                courses_data = json.load(f)
            for c in courses_data:
                course_obj = Course(
                    id=UUID(c["id"]) if isinstance(c["id"], str) else c["id"],
                    title=c["title"],
                    domain=c["domain"],
                    skill_tag=c["skill_tag"],
                    level=c.get("level", "Intermediate"),
                    duration_hours=c.get("duration_hours", 10),
                    source=c.get("source", "iGOT"),
                    description=c["description"]
                )
                db.add(course_obj)
            await db.commit()


@router.get("/courses", response_model=List[CourseResponse])
async def list_courses(db: AsyncSession = Depends(get_db)):
    """List all courses available across iGOT Karmayogi and NSSTA catalogs."""
    await seed_courses_if_empty(db)
    result = await db.execute(select(Course).order_by(Course.domain, Course.title))
    courses = result.scalars().all()
    return [CourseResponse.model_validate(c) for c in courses]


@router.get("/recommendations/{user_id}", response_model=RecommendationResponse)
async def get_user_recommendations(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Explainable Course Recommendation Engine:
    1. Fetches official's profile and assessed competencies.
    2. Takes top N skills with largest capability gap from skill-gap engine.
    3. Matches courses from iGOT/NSSTA by skill_tag and domain.
    4. Generates an explainable recommendation string with exact gap points.
    5. Flags whether user is already enrolled.
    """
    await seed_courses_if_empty(db)

    # 1. Fetch user
    res_user = await db.execute(select(User).where(User.id == user_id))
    user = res_user.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Official with user ID '{user_id}' not found."
        )

    # 2. Fetch user's skills
    res_skills = await db.execute(select(UserSkill).where(UserSkill.user_id == user.id))
    user_skills = res_skills.scalars().all()

    # 3. Calculate skill gap
    framework_data = load_framework_fixture()
    gap_analysis = calculate_gap_analysis(user, user_skills, framework_data)

    # 4. Fetch user's active enrollments
    res_enrollments = await db.execute(select(Enrollment.course_id).where(Enrollment.user_id == user.id))
    enrolled_course_ids: Set[UUID] = set(res_enrollments.scalars().all())

    # 5. Extract top 5 skills with largest gaps
    top_gap_skills = [s for s in gap_analysis.skills if s.gap > 0][:5]
    if not top_gap_skills:
        # Fallback to top 5 skills if official has no positive gaps
        top_gap_skills = gap_analysis.skills[:5]

    gap_map: Dict[str, int] = {s.skill: s.gap for s in top_gap_skills}
    gap_skill_names = list(gap_map.keys())

    # 6. Fetch all courses
    res_courses = await db.execute(select(Course))
    all_courses = res_courses.scalars().all()

    # 7. Match courses to top gap skills
    recommendations: List[RecommendationItem] = []
    added_course_ids = set()

    # Primary match: exact skill_tag match
    for skill_name in gap_skill_names:
        gap_val = gap_map[skill_name]
        for course in all_courses:
            if course.id not in added_course_ids and course.skill_tag.lower() == skill_name.lower():
                # Formulate explainability string
                explanation = (
                    f"Recommended because your {skill_name} competency is "
                    f"{gap_val}% below the required level for {user.role}."
                )
                recommendations.append(
                    RecommendationItem(
                        id=course.id,
                        title=course.title,
                        domain=course.domain,
                        skill_tag=course.skill_tag,
                        level=course.level,
                        duration_hours=course.duration_hours,
                        source=course.source,
                        description=course.description,
                        gap_size=gap_val,
                        explanation=explanation,
                        is_enrolled=course.id in enrolled_course_ids
                    )
                )
                added_course_ids.add(course.id)

    # Secondary match: domain match if fewer than 4 courses matched
    if len(recommendations) < 4:
        top_domains = {s.domain for s in top_gap_skills}
        for course in all_courses:
            if course.id not in added_course_ids and course.domain in top_domains:
                explanation = (
                    f"Recommended to strengthen foundational proficiencies across the {course.domain} domain."
                )
                recommendations.append(
                    RecommendationItem(
                        id=course.id,
                        title=course.title,
                        domain=course.domain,
                        skill_tag=course.skill_tag,
                        level=course.level,
                        duration_hours=course.duration_hours,
                        source=course.source,
                        description=course.description,
                        gap_size=15,
                        explanation=explanation,
                        is_enrolled=course.id in enrolled_course_ids
                    )
                )
                added_course_ids.add(course.id)
                if len(recommendations) >= 6:
                    break

    # Rank recommendations by gap size descending
    recommendations.sort(key=lambda x: x.gap_size, reverse=True)

    return RecommendationResponse(
        user_id=user.id,
        role=user.role,
        total_recommendations=len(recommendations),
        recommendations=recommendations
    )


@router.get("/recommendations/me", response_model=RecommendationResponse)
async def get_my_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get explainable course recommendations for the currently authenticated official.
    """
    return await get_user_recommendations(current_user.id, db)


@router.post("/courses/{course_id}/enroll", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_course(
    course_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mock enrollment in an iGOT Karmayogi or NSSTA course.
    Records the enrollment in the enrollments table.
    """
    # 1. Verify course exists
    res_course = await db.execute(select(Course).where(Course.id == course_id))
    course = res_course.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID '{course_id}' not found."
        )

    # 2. Check if already enrolled
    res_existing = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course.id
        )
    )
    existing = res_existing.scalar_one_or_none()
    if existing:
        return EnrollmentResponse(
            id=existing.id,
            user_id=existing.user_id,
            course_id=existing.course_id,
            status=existing.status,
            enrolled_at=existing.enrolled_at,
            course_title=course.title
        )

    # 3. Create new enrollment
    enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course.id,
        status="enrolled"
    )
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)

    return EnrollmentResponse(
        id=enrollment.id,
        user_id=enrollment.user_id,
        course_id=enrollment.course_id,
        status=enrollment.status,
        enrolled_at=enrollment.enrolled_at,
        course_title=course.title
    )


@router.get("/my-enrollments", response_model=List[EnrollmentResponse])
async def get_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all active course enrollments for the logged-in official.
    """
    result = await db.execute(
        select(Enrollment)
        .where(Enrollment.user_id == current_user.id)
        .order_by(Enrollment.enrolled_at.desc())
    )
    enrollments = result.scalars().all()
    
    response_items = []
    for enr in enrollments:
        response_items.append(
            EnrollmentResponse(
                id=enr.id,
                user_id=enr.user_id,
                course_id=enr.course_id,
                status=enr.status,
                enrolled_at=enr.enrolled_at,
                course_title=enr.course.title if enr.course else None
            )
        )
    return response_items
