from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class QuestionOptions(BaseModel):
    A: str
    B: str
    C: str
    D: str


class QuizQuestionPublic(BaseModel):
    id: UUID
    question_order: int
    question: str
    options: QuestionOptions
    difficulty: str


class QuizQuestionReview(BaseModel):
    id: UUID
    question_order: int
    question: str
    options: QuestionOptions
    correct_answer: str
    explanation: str
    difficulty: str
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None


class QuizPublicView(BaseModel):
    id: UUID
    title: str
    topic_hint: Optional[str] = None
    skill_name: Optional[str] = None
    language: str = "English"
    num_questions: int
    status: str
    created_at: datetime
    questions: List[QuizQuestionPublic]


class QuizSubmissionRequest(BaseModel):
    answers: Dict[str, str] = Field(
        ...,
        description="Mapping of question ID to chosen option ('A', 'B', 'C', or 'D')",
        example={"question-uuid-1": "A", "question-uuid-2": "C"},
    )


class SkillUpdateResult(BaseModel):
    skill_name: str
    previous_level: int
    new_level: int
    delta: int


class QuizSubmissionResponse(BaseModel):
    quiz_id: UUID
    language: str = "English"
    score: int
    total_questions: int
    score_percentage: float
    status: str
    skill_update: Optional[SkillUpdateResult] = None
    results: List[QuizQuestionReview]


class QuizHistoryItem(BaseModel):
    id: UUID
    title: str
    topic_hint: Optional[str] = None
    skill_name: Optional[str] = None
    language: str = "English"
    num_questions: int
    score: int
    score_percentage: float
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
