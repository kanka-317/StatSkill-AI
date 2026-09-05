import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Course(Base, TimestampMixin):
    """
    Course catalog item representing courses from iGOT Karmayogi or NSSTA.
    """
    __tablename__ = "courses"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False, index=True)
    domain = Column(String(100), nullable=False, index=True)  # Statistical, Technical, Digital Governance, Behavioural
    skill_tag = Column(String(255), nullable=False, index=True)  # Matches sub-skills from competency framework
    level = Column(String(50), default="Intermediate", nullable=False)  # Foundational, Intermediate, Advanced
    duration_hours = Column(Integer, default=10, nullable=False)
    source = Column(String(50), default="iGOT", nullable=False)  # "iGOT" or "NSSTA"
    description = Column(Text, nullable=False)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")


class Enrollment(Base):
    """
    Tracks an official's enrollment in a course.
    """
    __tablename__ = "enrollments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="enrolled", nullable=False)  # enrolled, in_progress, completed
    enrolled_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", backref="enrollments")
    course = relationship("Course", back_populates="enrollments", lazy="selectin")
