import asyncio
import sys
import io
import re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import pymupdf as fitz
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.api.v1.auth import create_access_token
from app.models.user import User
from app.models.user_skill import UserSkill
from sqlalchemy import select


def create_sample_pdf_bytes() -> bytes:
    doc = fitz.open()
    page1 = doc.new_page()
    text = (
        "National Statistical Systems Training Academy (NSSTA)\n"
        "Official Manual on Sampling Theory and Variance Estimation\n\n"
        "Stratified random sampling reduces estimation variance across subgroups.\n"
        "Weights are computed as the inverse of inclusion probabilities."
    )
    page1.insert_text((50, 72), text, fontsize=11)
    pdf_stream = io.BytesIO()
    doc.save(pdf_stream)
    doc.close()
    return pdf_stream.getvalue()


async def test_multilingual_quiz_generation():
    # 1. Setup DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed a test user
    test_email = "hindi_officer@mospi.gov.in"
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.email == test_email))
        user = user_res.scalars().first()
        if not user:
            user = User(
                email=test_email,
                name="Hindi Cadre Officer",
                role="Statistical Analyst",
                department="Field Operations Division",
                experience_years=4,
                password_hash="fakehash",
            )
            session.add(user)
            await session.flush()
        user_id = user.id
        await session.commit()

    token = create_access_token(subject=str(user_id))
    headers = {"Authorization": f"Bearer {token}"}
    pdf_data = create_sample_pdf_bytes()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 3. Test POST /quiz/generate with language="Hindi"
        files = {"file": ("nssta_manual.pdf", pdf_data, "application/pdf")}
        data = {
            "num_questions": 3,
            "topic_hint": "Sampling Theory",
            "language": "Hindi",
        }

        print("1. Testing Hindi Quiz Generation via RAG service...")
        gen_res = await client.post("/quiz/generate", headers=headers, files=files, data=data)
        assert gen_res.status_code == 201, f"Generate failed: {gen_res.status_code} {gen_res.text}"
        quiz_data = gen_res.json()
        assert quiz_data["language"] == "Hindi", f"Expected language 'Hindi', got {quiz_data['language']}"
        assert len(quiz_data["questions"]) == 3

        # Check for Devanagari Hindi characters in questions or options
        devanagari_pattern = re.compile(r"[\u0900-\u097F]")
        first_q = quiz_data["questions"][0]
        has_hindi = bool(devanagari_pattern.search(first_q["question"])) or any(
            bool(devanagari_pattern.search(opt)) for opt in first_q["options"].values()
        )
        print(f"   Generated Hindi Question: {first_q['question']}")
        print(f"   Has Devanagari Hindi Script: {has_hindi}")
        assert has_hindi, "Generated Hindi quiz does not contain Devanagari script!"

        quiz_id = quiz_data["id"]

        # 4. Submit answers and verify language in response
        async with AsyncSessionLocal() as session:
            from app.models.quiz import QuizQuestion
            from uuid import UUID
            q_res = await session.execute(
                select(QuizQuestion).where(QuizQuestion.quiz_id == UUID(quiz_id))
            )
            db_questions = q_res.scalars().all()
            sub_answers = {str(q.id): q.correct_answer for q in db_questions}

        sub_res = await client.post(
            f"/quiz/{quiz_id}/submit",
            headers=headers,
            json={"answers": sub_answers},
        )
        assert sub_res.status_code == 200
        sub_data = sub_res.json()
        assert sub_data["language"] == "Hindi"
        print(f"   Submitted Hindi quiz. Score: {sub_data['score']}/{sub_data['total_questions']}, Language: {sub_data['language']}")

        # 5. Check history for language tag
        hist_res = await client.get("/quiz/user/history", headers=headers)
        assert hist_res.status_code == 200
        history = hist_res.json()
        matching = next((h for h in history if h["id"] == quiz_id), None)
        assert matching is not None, "Quiz not found in history"
        assert matching["language"] == "Hindi", f"Expected language 'Hindi' in history, got {matching.get('language')}"
        print(f"   Quiz history item verified with Language: {matching['language']}")

    print(">>> PHASE 6 MULTILINGUAL LAYER TESTS PASSED COMPLETELY! <<<")


if __name__ == "__main__":
    asyncio.run(test_multilingual_quiz_generation())
