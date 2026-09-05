import asyncio
import sys
import io
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pymupdf as fitz
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.api.v1.auth import create_access_token
from app.models.user import User
from app.models.user_skill import UserSkill
from sqlalchemy import select


def create_sample_pdf_bytes() -> bytes:
    """Create a 2-page sample PDF in memory using PyMuPDF for testing."""
    doc = fitz.open()
    
    # Page 1
    page1 = doc.new_page()
    text_p1 = (
        "National Statistical Systems Training Academy (NSSTA)\n"
        "Course Module: Survey Sampling & Methodology for Official Surveys\n\n"
        "1. Probability Sampling Fundamentals\n"
        "Probability sampling ensures that every unit in the target population has a known, non-zero chance of selection. "
        "Stratified random sampling divides the frame into mutually exclusive homogeneous strata prior to sampling, "
        "which significantly reduces sampling variance and enhances subgroup estimation precision.\n\n"
        "2. Multi-Stage Cluster Designs\n"
        "In nationwide socio-economic surveys like NSSO rounds, multi-stage sampling is utilized. First Stage Units (FSUs) "
        "typically comprise census villages in rural domains and Urban Frame Survey (UFS) blocks in urban centers."
    )
    page1.insert_text((50, 72), text_p1, fontsize=11)
    
    # Page 2
    page2 = doc.new_page()
    text_p2 = (
        "3. Estimation and Weighting\n"
        "Survey weights are computed as the inverse of inclusion probabilities, adjusted for non-response through calibration. "
        "Ratio and regression estimators incorporate auxiliary administrative registers to further lower mean squared errors.\n\n"
        "4. Quality Assurance Standards\n"
        "Field data validation protocols require 10% duplicate re-interviews by supervisory officers to detect non-sampling biases."
    )
    page2.insert_text((50, 72), text_p2, fontsize=11)

    pdf_stream = io.BytesIO()
    doc.save(pdf_stream)
    doc.close()
    return pdf_stream.getvalue()


async def test_quiz_rag_lifecycle():
    # 1. Setup DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed a test user & skill
    test_email = "rag_test_officer@mospi.gov.in"
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.email == test_email))
        user = user_res.scalars().first()
        if not user:
            user = User(
                email=test_email,
                name="RAG Test Analyst",
                role="Statistical Analyst",
                department="National Accounts Division",
                experience_years=5,
                password_hash="fakehash",
            )
            session.add(user)
            await session.flush()

        # Ensure skill exists
        skill_res = await session.execute(
            select(UserSkill).where(
                UserSkill.user_id == user.id,
                UserSkill.skill_name == "Survey Sampling & Methodology",
            )
        )
        skill = skill_res.scalars().first()
        if not skill:
            skill = UserSkill(
                user_id=user.id,
                skill_name="Survey Sampling & Methodology",
                domain="Statistical",
                current_level=40,  # Baseline level
            )
            session.add(skill)
        else:
            skill.current_level = 40
        await session.commit()
        user_id = user.id

    token = create_access_token(subject=str(user_id))
    headers = {"Authorization": f"Bearer {token}"}
    pdf_data = create_sample_pdf_bytes()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 3. Test POST /quiz/generate with PDF upload
        files = {"file": ("nssta_sampling_manual.pdf", pdf_data, "application/pdf")}
        data = {
            "num_questions": 3,
            "topic_hint": "Stratified Sampling and Estimation",
            "skill_name": "Survey Sampling & Methodology",
        }

        print("1. Uploading PDF and triggering RAG MCQ generation...")
        gen_res = await client.post("/quiz/generate", headers=headers, files=files, data=data)
        assert gen_res.status_code == 201, f"Generate failed: {gen_res.status_code} {gen_res.text}"
        quiz_data = gen_res.json()
        quiz_id = quiz_data["id"]
        assert len(quiz_data["questions"]) == 3, f"Expected 3 questions, got {len(quiz_data['questions'])}"
        assert quiz_data["status"] == "pending"
        
        # Verify no answer leak in public view
        for q in quiz_data["questions"]:
            assert "correct_answer" not in q or q.get("correct_answer") is None, "Security leak: correct_answer exposed in pending quiz!"
            assert "explanation" not in q or q.get("explanation") is None, "Security leak: explanation exposed in pending quiz!"
        print(f"   Quiz generated successfully: ID={quiz_id}, Title='{quiz_data['title']}'")

        # 4. Test GET /quiz/{quiz_id}
        get_res = await client.get(f"/quiz/{quiz_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == quiz_id

        # 5. Submit Answers - query DB to get correct answers for a perfect score
        async with AsyncSessionLocal() as session:
            from app.models.quiz import QuizQuestion
            from uuid import UUID
            q_res = await session.execute(
                select(QuizQuestion).where(QuizQuestion.quiz_id == UUID(quiz_id))
            )
            db_questions = q_res.scalars().all()
            sub_answers = {str(q.id): q.correct_answer for q in db_questions}

        sub_payload = {"answers": sub_answers}
        print("2. Submitting answers for scoring...")
        sub_res = await client.post(f"/quiz/{quiz_id}/submit", headers=headers, json=sub_payload)
        assert sub_res.status_code == 200, f"Submit failed: {sub_res.status_code} {sub_res.text}"
        result = sub_res.json()
        print(f"   Quiz graded: Score {result['score']}/{result['total_questions']} ({result['score_percentage']}%)")
        assert result["status"] == "completed"
        assert result["score"] == 3
        assert result["score_percentage"] == 100.0
        assert len(result["results"]) == 3

        # Verify each result has explanation and correctness flag
        for r in result["results"]:
            assert "explanation" in r and len(r["explanation"]) > 0
            assert r["is_correct"] is True

        # 6. Verify Adaptive Competency Elevation
        assert result["skill_update"] is not None
        update = result["skill_update"]
        print(f"   [ADAPTIVE ENGINE] Competency updated: {update['skill_name']} "
              f"{update['previous_level']}% -> {update['new_level']}% (+{update['delta']}%)")
        assert update["new_level"] == 50  # 40 + 10 = 50
        assert update["delta"] == 10

        # 7. Check History
        hist_res = await client.get("/quiz/user/history", headers=headers)
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history) >= 1
        assert any(h["id"] == quiz_id for h in history)
        print(f"   Quiz history verified: {len(history)} quizzes recorded.")

    print(">>> ALL PHASE 4 BACKEND RAG MCQ TESTS PASSED! <<<")


if __name__ == "__main__":
    asyncio.run(test_quiz_rag_lifecycle())
