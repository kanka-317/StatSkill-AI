import uuid
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.core.database import Base
from app.models.base import TimestampMixin


class Competency(Base, TimestampMixin):
    """
    Core competency node for statistical skill ontology (SIH PS 26101).
    Examples: Survey Methodology, Time Series Econometrics, National Accounts,
    Data Visualization with R/Python, Machine Learning for Census Analytics.
    """
    __tablename__ = "competencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), index=True, nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., STAT-MET-01
    domain = Column(String(100), index=True, nullable=False)  # Official Statistics, Survey Sampling, etc.
    description = Column(Text, nullable=False)
    
    # Proficiency levels: 1 (Basic/Awareness), 2 (Working), 3 (Practitioner), 4 (Expert)
    level = Column(Integer, default=1, nullable=False)

    # pgvector embedding column (768 dimensions for Gemini embeddings or standard vector models)
    embedding = Column(Vector(768), nullable=True)
