import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, Boolean, ForeignKey, DateTime, Uuid
from sqlalchemy.orm import relationship

from app.core.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, default="AI Generated Knowledge Assessment")
    topic_hint = Column(String, nullable=True)
    skill_name = Column(String, nullable=True, index=True)
    language = Column(String(50), nullable=False, default="English")
    num_questions = Column(Integer, nullable=False, default=5)
    score = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="pending")  # "pending", "completed"
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.question_order")
    user = relationship("User", backref="quizzes")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    quiz_id = Column(Uuid(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    question_order = Column(Integer, nullable=False, default=1)
    question = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_answer = Column(String(1), nullable=False)  # 'A', 'B', 'C', 'D'
    explanation = Column(Text, nullable=False)
    difficulty = Column(String(20), nullable=False, default="Medium")  # "Easy", "Medium", "Hard"
    user_answer = Column(String(1), nullable=True)  # 'A', 'B', 'C', 'D' or None
    is_correct = Column(Boolean, nullable=True)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
