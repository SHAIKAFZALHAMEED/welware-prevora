import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Enum as SAEnum
from app.db.database import Base


class SIFPotential(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNCERTAIN = "UNCERTAIN"


class ReviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED_SIF = "CONFIRMED_SIF"
    REJECTED = "REJECTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_text = Column(Text, nullable=False)
    site = Column(String(200), nullable=False)
    activity = Column(String(200), nullable=False)

    # Classification outputs
    sif_potential = Column(SAEnum(SIFPotential), nullable=False, default=SIFPotential.UNCERTAIN)
    confidence = Column(Float, nullable=False, default=0.0)
    rule_tags = Column(String(500), default="")          # comma-separated
    evidence_spans = Column(Text, default="")            # pipe-separated phrases
    counterfactual_delta = Column(Integer, default=0)    # # barriers from fatality

    # Review & feedback
    review_status = Column(SAEnum(ReviewStatus), default=ReviewStatus.PENDING)
    reviewer_notes = Column(Text, default="")

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
