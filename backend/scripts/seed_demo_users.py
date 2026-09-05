"""
StatSkill AI - Evaluator Demo Database Seeder
Seeds 3 realistic demo accounts for SIH evaluation:
1. Rajesh Kumar (Statistical Analyst) - analyst@mospi.gov.in / password123
2. Dr. Ananya Sharma (Admin / Director) - director@mospi.gov.in / password123
3. Vikram Singh (Field Operations Officer) - field_officer@mospi.gov.in / password123
"""

import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4

# Ensure app root is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.user_skill import UserSkill
from app.models.course import Course, Enrollment
from app.models.quiz import Quiz, QuizQuestion
from app.api.v1.recommendations import seed_courses_if_empty


ANALYST_SKILLS = [
    # Statistical
    ("Survey Sampling & Methodology", "Statistical", 45),
    ("National Accounts & Macro-aggregates", "Statistical", 50),
    ("Price Indices (CPI/WPI/IIP)", "Statistical", 65),
    ("Hypothesis Testing & Statistical Inference", "Statistical", 55),
    ("Time Series Forecasting", "Statistical", 40),
    # Technical
    ("Python for Data Science", "Technical", 45),
    ("SQL & Relational Databases", "Technical", 70),
    ("Machine Learning & Predictive Modeling", "Technical", 35),
    ("GIS & Spatial Analytics", "Technical", 50),
    ("Data Visualization & BI Dashboards", "Technical", 60),
    # Digital Governance
    ("Digital Personal Data Protection (DPDP)", "Digital Governance", 55),
    ("Cybersecurity & IT Audit Compliance", "Digital Governance", 60),
    ("Open Government Data (NDAP & Portals)", "Digital Governance", 70),
    ("Data Quality Assurance & Validation", "Digital Governance", 65),
    ("Inter-Departmental Data Exchange Standards", "Digital Governance", 55),
    # Behavioural
    ("Policy Briefing & Executive Communication", "Behavioural", 65),
    ("Inter-Departmental Stakeholder Coordination", "Behavioural", 70),
    ("Evidence-Based Decision Making", "Behavioural", 75),
    ("Project Leadership & Resource Management", "Behavioural", 60),
    ("Analytical Problem Solving", "Behavioural", 70),
]

DIRECTOR_SKILLS = [
    (s[0], s[1], min(95, s[2] + 35)) for s in ANALYST_SKILLS
]

FIELD_OFFICER_SKILLS = [
    ("Survey Sampling & Methodology", "Statistical", 60),
    ("National Accounts & Macro-aggregates", "Statistical", 30),
    ("Price Indices (CPI/WPI/IIP)", "Statistical", 55),
    ("Hypothesis Testing & Statistical Inference", "Statistical", 35),
    ("Time Series Forecasting", "Statistical", 25),
    ("Python for Data Science", "Technical", 30),
    ("SQL & Relational Databases", "Technical", 40),
    ("Machine Learning & Predictive Modeling", "Technical", 20),
    ("GIS & Spatial Analytics", "Technical", 65),
    ("Data Visualization & BI Dashboards", "Technical", 45),
    ("Digital Personal Data Protection (DPDP)", "Digital Governance", 50),
    ("Cybersecurity & IT Audit Compliance", "Digital Governance", 50),
    ("Open Government Data (NDAP & Portals)", "Digital Governance", 60),
    ("Data Quality Assurance & Validation", "Digital Governance", 80),
    ("Inter-Departmental Data Exchange Standards", "Digital Governance", 45),
    ("Policy Briefing & Executive Communication", "Behavioural", 60),
    ("Inter-Departmental Stakeholder Coordination", "Behavioural", 75),
    ("Evidence-Based Decision Making", "Behavioural", 65),
    ("Project Leadership & Resource Management", "Behavioural", 70),
    ("Analytical Problem Solving", "Behavioural", 65),
]


async def seed_demo_users():
    print("Connecting to StatSkill AI database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed courses catalog first if empty
        await seed_courses_if_empty(session)

        # 2. Get available courses for enrollment seeding
        courses_result = await session.execute(select(Course))
        all_courses = courses_result.scalars().all()
        print(f"Catalog contains {len(all_courses)} courses.")

        # Definition of 3 demo users
        demo_specs = [
            {
                "email": "analyst@mospi.gov.in",
                "name": "Rajesh Kumar",
                "role": "Statistical Analyst",
                "department": "National Sample Survey Office (NSSO)",
                "experience_years": 4,
                "skills": ANALYST_SKILLS,
                "enroll_course_count": 3,
                "add_quizzes": True,
            },
            {
                "email": "director@mospi.gov.in",
                "name": "Dr. Ananya Sharma",
                "role": "admin",
                "department": "National Statistical Systems Training Academy (NSSTA)",
                "experience_years": 14,
                "skills": DIRECTOR_SKILLS,
                "enroll_course_count": 2,
                "add_quizzes": False,
            },
            {
                "email": "field_officer@mospi.gov.in",
                "name": "Vikram Singh",
                "role": "Field Operations Officer",
                "department": "Field Operations Division (FOD)",
                "experience_years": 2,
                "skills": FIELD_OFFICER_SKILLS,
                "enroll_course_count": 1,
                "add_quizzes": False,
            },
        ]

        for spec in demo_specs:
            # Check if user already exists
            res = await session.execute(select(User).where(User.email == spec["email"]))
            user = res.scalar_one_or_none()

            hashed_pw = get_password_hash("password123")

            if not user:
                user = User(
                    name=spec["name"],
                    email=spec["email"],
                    password_hash=hashed_pw,
                    role=spec["role"],
                    department=spec["department"],
                    experience_years=spec["experience_years"],
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                print(f"Created demo user: {user.email} (Role: {user.role})")
            else:
                user.name = spec["name"]
                user.role = spec["role"]
                user.department = spec["department"]
                user.experience_years = spec["experience_years"]
                user.password_hash = hashed_pw
                await session.flush()
                print(f"Updated existing demo user: {user.email}")

            # Upsert skills
            await session.execute(delete(UserSkill).where(UserSkill.user_id == user.id))
            for skill_name, domain, level in spec["skills"]:
                u_skill = UserSkill(
                    user_id=user.id,
                    skill_name=skill_name,
                    domain=domain,
                    current_level=level,
                )
                session.add(u_skill)

            # Enroll in courses if not already enrolled
            if all_courses and spec["enroll_course_count"] > 0:
                await session.execute(delete(Enrollment).where(Enrollment.user_id == user.id))
                for c in all_courses[: spec["enroll_course_count"]]:
                    enrollment = Enrollment(
                        user_id=user.id,
                        course_id=c.id,
                        status="enrolled",
                        enrolled_at=datetime.now(timezone.utc) - timedelta(days=2),
                    )
                    session.add(enrollment)

            # Add completed sample quizzes for Rajesh Kumar (Analyst)
            if spec.get("add_quizzes"):
                await session.execute(delete(Quiz).where(Quiz.user_id == user.id))
                
                # Quiz 1: English - Survey Sampling
                quiz1 = Quiz(
                    user_id=user.id,
                    title="NSSTA Survey Sampling & Variance Assessment",
                    topic_hint="Stratified Random Sampling & Weights",
                    skill_name="Survey Sampling & Methodology",
                    language="English",
                    num_questions=5,
                    score=4,
                    status="completed",
                    created_at=datetime.now(timezone.utc) - timedelta(hours=5),
                    completed_at=datetime.now(timezone.utc) - timedelta(hours=4, minutes=45),
                )
                session.add(quiz1)
                await session.flush()

                q1_data = [
                    (
                        "In NSSO multi-stage stratified survey design, what constitutes the First Stage Unit (FSU) in rural sectors?",
                        "Census enumeration blocks",
                        "Census villages",
                        "Panchayat administrative wards",
                        "Agricultural holding clusters",
                        "B",
                        "In the NSSO rural design, census villages serve as FSUs, while households serve as ultimate sampling units.",
                        "Easy",
                        "B",
                        True,
                    ),
                    (
                        "Which sampling allocation formula allocates sample sizes in proportion to stratum standard deviations?",
                        "Bowley proportional allocation",
                        "Neyman optimum allocation",
                        "Equal allocation rule",
                        "Purposive cluster quota",
                        "B",
                        "Neyman optimum allocation minimizes variance by assigning more sample units to strata with higher standard deviation.",
                        "Medium",
                        "B",
                        True,
                    ),
                    (
                        "How are design survey base weights (W_i) mathematically derived?",
                        "As the product of inclusion probability and stratum variance",
                        "As the inverse reciprocal of the unit inclusion probability (1 / P_i)",
                        "As the normalized ratio of sample mean to population mean",
                        "As the percentage of non-response in the secondary stage",
                        "B",
                        "Design base weights equal the reciprocal of unit selection inclusion probabilities (1 / P_i).",
                        "Medium",
                        "B",
                        True,
                    ),
                    (
                        "What is the maximum recommended Coefficient of Variation (CV) for reliable district-level official estimates?",
                        "Below 5%",
                        "Between 10% and 15%",
                        "Between 20% and 25%",
                        "Under 30%",
                        "A",
                        "NSSTA standards classify estimates with CV below 5% as reliable for district planning.",
                        "Hard",
                        "C",
                        False,
                    ),
                    (
                        "Which method estimates variance in multi-stage surveys without calculating inter-stage covariances?",
                        "Bootstrap resample method",
                        "Jackknife repeated replication",
                        "Ultimate Cluster Method",
                        "Monte Carlo permutation test",
                        "C",
                        "The Ultimate Cluster Method computes variance using FSU totals, capturing all subsequent stage variance automatically.",
                        "Hard",
                        "C",
                        True,
                    ),
                ]

                for order, (q_text, oa, ob, oc, od, ans, exp, diff, uans, is_corr) in enumerate(q1_data, 1):
                    qq = QuizQuestion(
                        quiz_id=quiz1.id,
                        question_order=order,
                        question=q_text,
                        option_a=oa,
                        option_b=ob,
                        option_c=oc,
                        option_d=od,
                        correct_answer=ans,
                        explanation=exp,
                        difficulty=diff,
                        user_answer=uans,
                        is_correct=is_corr,
                    )
                    session.add(qq)

                # Quiz 2: Hindi - DPDP Digital Governance Assessment
                quiz2 = Quiz(
                    user_id=user.id,
                    title="डीपीडीपी अधिनियम और आधिकारिक डेटा सुरक्षा मूल्यांकन (DPDP Compliance)",
                    topic_hint="Digital Personal Data Protection Act 2023",
                    skill_name="Digital Personal Data Protection (DPDP)",
                    language="Hindi",
                    num_questions=3,
                    score=3,
                    status="completed",
                    created_at=datetime.now(timezone.utc) - timedelta(days=1),
                    completed_at=datetime.now(timezone.utc) - timedelta(days=1, minutes=-12),
                )
                session.add(quiz2)
                await session.flush()

                q2_data = [
                    (
                        "डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम (DPDP) 2023 के तहत नागरिक को किस रूप में परिभाषित किया गया है?",
                        "डेटा फिड्यूशरी (Data Fiduciary)",
                        "डेटा प्रिंसिपल (Data Principal)",
                        "डेटा प्रोसेसर (Data Processor)",
                        "डेटा कस्टोडियन (Data Custodian)",
                        "B",
                        "DPDP अधिनियम 2023 के तहत जिस व्यक्ति का डेटा प्रोसेस किया जाता है उसे 'डेटा प्रिंसिपल' कहा जाता है।",
                        "Easy",
                        "B",
                        True,
                    ),
                    (
                        "सरकारी सांख्यिकी में नागरिक गोपनीयता सुरक्षित रखने हेतु किस तकनीक का उपयोग अनिवार्य है?",
                        "डेटा डुप्लीकेशन",
                        "डेटा मास्किंग व एनोनिमाइज़ेशन (Anonymization)",
                        "ओपन पब्लिक अनमास्क्ड एपीआई",
                        "डायरेक्ट आधार नंबर प्रदर्शन",
                        "B",
                        "गोपनीयता और डेटा सुरक्षा नियमों के तहत व्यक्तिगत पहचान योग्य डेटा को मास्क व एनोनिमाइज़ करना अनिवार्य है।",
                        "Medium",
                        "B",
                        True,
                    ),
                    (
                        "डेटा उल्लंघन (Data Breach) की स्थिति में संबंधित प्राधिकरण को कितने समय में सूचित करना आवश्यक है?",
                        "72 घंटे के भीतर",
                        "तत्काल निर्धारित समय सीमा (CERT-In नियमों अनुसार 6 घंटे/DPDP बोर्ड निर्देश)",
                        "30 दिनों के बाद",
                        "वार्षिक ऑडिट में",
                        "B",
                        "CERT-In और DPDP बोर्ड के वैधानिक दिशानिर्देशों के तहत साइबर सुरक्षा उल्लंघनों की तत्काल रिपोर्टिंग अनिवार्य है।",
                        "Hard",
                        "B",
                        True,
                    ),
                ]

                for order, (q_text, oa, ob, oc, od, ans, exp, diff, uans, is_corr) in enumerate(q2_data, 1):
                    qq = QuizQuestion(
                        quiz_id=quiz2.id,
                        question_order=order,
                        question=q_text,
                        option_a=oa,
                        option_b=ob,
                        option_c=oc,
                        option_d=od,
                        correct_answer=ans,
                        explanation=exp,
                        difficulty=diff,
                        user_answer=uans,
                        is_correct=is_corr,
                    )
                    session.add(qq)

        await session.commit()
        print("\nDemo users successfully seeded!")
        print("=" * 60)
        print("DEMO CREDENTIALS FOR EVALUATORS (Password for all: password123):")
        print("1. Statistical Analyst: analyst@mospi.gov.in (Rajesh Kumar)")
        print("2. Director / Admin:    director@mospi.gov.in (Dr. Ananya Sharma)")
        print("3. Field Officer:       field_officer@mospi.gov.in (Vikram Singh)")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_demo_users())
