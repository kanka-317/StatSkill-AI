import uuid
from sqlalchemy import Column, String, Boolean, Integer, Uuid
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    """
    Government official user model for StatSkill AI (SIH PS 26101).
    """
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Official administrative attributes
    role = Column(String(100), default="Statistical Analyst", nullable=False)
    department = Column(String(255), default="MoSPI", nullable=False)
    experience_years = Column(Integer, default=1, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan", lazy="selectin")
