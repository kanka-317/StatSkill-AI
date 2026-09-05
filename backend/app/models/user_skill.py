import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class UserSkill(Base, TimestampMixin):
    """
    Stores self-assessed competency proficiencies (0-100) per official and sub-skill.
    """
    __tablename__ = "user_skills"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name = Column(String(255), nullable=False, index=True)
    domain = Column(String(100), nullable=False, index=True)  # Statistical, Technical, Digital Governance, Behavioural
    current_level = Column(Integer, default=0, nullable=False)  # 0 to 100

    # Relationship
    user = relationship("User", back_populates="skills")
