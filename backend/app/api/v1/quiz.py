import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_skill import UserSkill
from app.models.quiz import Quiz, QuizQuestion
from app.schemas.quiz import (
    QuizPublicView,
    QuizQuestionPublic,
    QuizQuestionReview,
    QuestionOptions,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    SkillUpdateResult,
    QuizHistoryItem,
)
from app.services.rag_quiz import (
    extract_text_from_pdf,
    chunk_text,
    retrieve_salient_chunks,
    generate_mcqs_from_content,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Quiz (RAG Pipeline)"])


@router.post("/generate", response_model=QuizPublicView, status_code=status.HTTP_201_CREATED)
async def generate_quiz_from_pdf(
    file: UploadFile = File(..., description="PDF document containing learning or regulatory material"),
    num_questions: int = Form(5, ge=1, le=20, description="Number of MCQs to generate (1 to 20)"),
    topic_hint: Optional[str] = Form(None, description="Optional focus topic or syllabus chapter"),
    skill_name: Optional[str] = Form(None, description="Cadre competency sub-skill linked to this quiz"),
    language: str = Form("English", description="Target assessment language ('English' or 'Hindi')"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    RAG Pipeline Endpoint:
    1. Extracts clean text from uploaded PDF with PyMuPDF.
    2. Splits into sentence-aware chunks (~500-800 tokens).
    3. Retrieves top dense/relevant chunks.
    4. Generates structured, explainable MCQs via Gemini / Groq LLM (with fallback).
    5. Stores Quiz and Questions into database linked to the authenticated user.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files (.pdf) are supported for AI quiz generation.",
        )

    try:
        pdf_bytes = await file.read()
        if not pdf_bytes or len(pdf_bytes) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is empty or corrupted.",
            )

        # 1. Text extraction
        extracted_text = extract_text_from_pdf(pdf_bytes)

        # 2. Sentence-aware chunking
        chunks = chunk_text(extracted_text, chunk_size=2500, overlap=300)

        # 3. Salient chunk retrieval
        query_context = f"{topic_hint or ''} {skill_name or ''}".strip()
        salient_chunks = retrieve_salient_chunks(chunks, query=query_context, top_k=4)
        rag_context = "\n\n--- Next Section ---\n\n".join(salient_chunks)

        # Determine target skill name if not passed
        resolved_skill_name = skill_name
        if not resolved_skill_name:
            # Check user's skills for one with a high gap
            skills_res = await db.execute(
                select(UserSkill).where(UserSkill.user_id == current_user.id).limit(1)
            )
            user_skill = skills_res.scalars().first()
            resolved_skill_name = user_skill.skill_name if user_skill else (topic_hint or "Survey Sampling & Methodology")

        # 4. LLM Generation
        raw_mcqs = await generate_mcqs_from_content(
            content=rag_context,
            num_questions=num_questions,
            topic_hint=topic_hint or "",
            skill_name=resolved_skill_name or "",
            language=language,
        )

        if not raw_mcqs:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate questions from document content. Please try again or provide a clearer PDF.",
            )

        # 5. Persist Quiz and Questions
        clean_title = (
            f"Quiz ({language}): {topic_hint}"
            if topic_hint
            else f"Assessment on {file.filename.replace('.pdf', '').replace('_', ' ').title()}"
        )

        quiz = Quiz(
            id=uuid.uuid4(),
            user_id=current_user.id,
            title=clean_title,
            topic_hint=topic_hint,
            skill_name=resolved_skill_name,
            language=language,
            num_questions=len(raw_mcqs),
            score=0,
            status="pending",
        )
        db.add(quiz)
        await db.flush()

        public_questions: List[QuizQuestionPublic] = []
        for idx, item in enumerate(raw_mcqs):
            opts = item.get("options", {})
            q_model = QuizQuestion(
                id=uuid.uuid4(),
                quiz_id=quiz.id,
                question_order=idx + 1,
                question=item.get("question", f"Question {idx+1}"),
                option_a=str(opts.get("A", "Option A")),
                option_b=str(opts.get("B", "Option B")),
                option_c=str(opts.get("C", "Option C")),
                option_d=str(opts.get("D", "Option D")),
                correct_answer=str(item.get("correct_answer", "A")).upper()[:1],
                explanation=str(item.get("explanation", "Grounded in official document.")),
                difficulty=str(item.get("difficulty", "Medium")),
            )
            db.add(q_model)
            public_questions.append(
                QuizQuestionPublic(
                    id=q_model.id,
                    question_order=q_model.question_order,
                    question=q_model.question,
                    options=QuestionOptions(
                        A=q_model.option_a,
                        B=q_model.option_b,
                        C=q_model.option_c,
                        D=q_model.option_d,
                    ),
                    difficulty=q_model.difficulty,
                )
            )

        await db.commit()
        await db.refresh(quiz)

        return QuizPublicView(
            id=quiz.id,
            title=quiz.title,
            topic_hint=quiz.topic_hint,
            skill_name=quiz.skill_name,
            language=quiz.language,
            num_questions=quiz.num_questions,
            status=quiz.status,
            created_at=quiz.created_at,
            questions=public_questions,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating quiz: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during AI quiz generation: {str(e)}",
        )


@router.get("/{quiz_id}", response_model=QuizPublicView)
async def get_quiz(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch quiz details. If status is pending, hides answers/explanations."""
    stmt = (
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id, Quiz.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    quiz = result.scalars().first()

    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    public_questions = [
        QuizQuestionPublic(
            id=q.id,
            question_order=q.question_order,
            question=q.question,
            options=QuestionOptions(A=q.option_a, B=q.option_b, C=q.option_c, D=q.option_d),
            difficulty=q.difficulty,
        )
        for q in quiz.questions
    ]

    return QuizPublicView(
        id=quiz.id,
        title=quiz.title,
        topic_hint=quiz.topic_hint,
        skill_name=quiz.skill_name,
        language=quiz.language,
        num_questions=quiz.num_questions,
        status=quiz.status,
        created_at=quiz.created_at,
        questions=public_questions,
    )


@router.post("/{quiz_id}/submit", response_model=QuizSubmissionResponse)
async def submit_quiz(
    quiz_id: UUID,
    submission: QuizSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits answers for scoring, updates question correctness,
    computes adaptive learning delta, and elevates user's competency level.
    """
    stmt = (
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id, Quiz.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    quiz = result.scalars().first()

    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    # Convert submission answers dictionary keys to string for uniform lookup
    str_answers = {str(k): v for k, v in submission.answers.items()}

    score = 0
    total = len(quiz.questions)
    results: List[QuizQuestionReview] = []

    for q in quiz.questions:
        q_id_str = str(q.id)
        user_choice = str_answers.get(q_id_str, "").upper().strip()
        is_corr = (user_choice == q.correct_answer.upper().strip()) if user_choice else False
        if is_corr:
            score += 1

        q.user_answer = user_choice or None
        q.is_correct = is_corr

        results.append(
            QuizQuestionReview(
                id=q.id,
                question_order=q.question_order,
                question=q.question,
                options=QuestionOptions(A=q.option_a, B=q.option_b, C=q.option_c, D=q.option_d),
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                difficulty=q.difficulty,
                user_answer=q.user_answer,
                is_correct=q.is_correct,
            )
        )

    quiz.score = score
    quiz.status = "completed"
    quiz.completed_at = datetime.now(timezone.utc)

    score_pct = round((score / max(1, total)) * 100, 1)

    # Adaptive Learning Engine: Update relevant user_skills.current_level upward
    skill_update_obj: Optional[SkillUpdateResult] = None
    if quiz.skill_name:
        skill_stmt = select(UserSkill).where(
            UserSkill.user_id == current_user.id,
            UserSkill.skill_name == quiz.skill_name,
        )
        skill_res = await db.execute(skill_stmt)
        user_skill = skill_res.scalars().first()

        if user_skill:
            # Dynamic delta rule: score% * small delta (e.g. 10 points max)
            delta = max(1, round((score / max(1, total)) * 10)) if score > 0 else 0
            prev_level = user_skill.current_level
            new_level = min(100, prev_level + delta)
            user_skill.current_level = new_level
            user_skill.updated_at = datetime.now(timezone.utc)

            skill_update_obj = SkillUpdateResult(
                skill_name=user_skill.skill_name,
                previous_level=prev_level,
                new_level=new_level,
                delta=delta,
            )

    await db.commit()

    return QuizSubmissionResponse(
        quiz_id=quiz.id,
        language=quiz.language,
        score=score,
        total_questions=total,
        score_percentage=score_pct,
        status=quiz.status,
        skill_update=skill_update_obj,
        results=results,
    )


@router.get("/user/history", response_model=List[QuizHistoryItem])
async def get_quiz_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve history of all quizzes generated or taken by the active user."""
    stmt = (
        select(Quiz)
        .where(Quiz.user_id == current_user.id)
        .order_by(desc(Quiz.created_at))
    )
    result = await db.execute(stmt)
    quizzes = result.scalars().all()

    return [
        QuizHistoryItem(
            id=q.id,
            title=q.title,
            topic_hint=q.topic_hint,
            skill_name=q.skill_name,
            language=q.language,
            num_questions=q.num_questions,
            score=q.score,
            score_percentage=round((q.score / max(1, q.num_questions)) * 100, 1),
            status=q.status,
            created_at=q.created_at,
            completed_at=q.completed_at,
        )
        for q in quizzes
    ]
