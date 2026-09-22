"""
Ingest endpoint — classify + persist a new safety report in one atomic call.
This is the primary write path for the PREVORA system.

Flow:
  1. Receive raw report text + metadata
  2. Dispatch through NLP tiered classifier
  3. Persist classified record to DB
  4. Return full classified report with evidence
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.report import Report, SIFPotential, ReviewStatus
from app.nlp.dispatcher import dispatch_classify

router = APIRouter()


class IngestIn(BaseModel):
    report_text: str
    site: str = "Unknown"
    activity: str = "Unknown"
    # Optional: force a SIF tier (for human override at ingest time)
    override_sif: str | None = None


class IngestOut(BaseModel):
    id: int
    report_text: str
    site: str
    activity: str
    sif_potential: str
    confidence: float
    rule_tags: list[str]
    evidence_spans: list[str]
    counterfactual_delta: int
    barrier_proximity_label: str
    classifier_tier: str
    review_status: str
    created_at: datetime

    class Config:
        from_attributes = True


def _barrier_label(delta: int) -> str:
    labels = {
        1: "CRITICAL — 1 barrier from fatality",
        2: "HIGH — 2 barriers from fatality",
        3: "MODERATE — 3 barriers from fatality",
    }
    return labels.get(delta, f"{delta} barriers from fatality — LOW PROXIMITY")


@router.post("/", response_model=IngestOut, status_code=201)
async def ingest_report(body: IngestIn, db: AsyncSession = Depends(get_db)):
    """
    Classify and persist a new safety report.
    Returns the full classified record immediately.
    """
    result = dispatch_classify(body.report_text)

    # Allow human override at ingest time (e.g. pre-labelled ground truth)
    sif_tier = body.override_sif.upper() if body.override_sif else result["sif_potential"]
    try:
        sif_enum = SIFPotential(sif_tier)
    except ValueError:
        sif_enum = SIFPotential(result["sif_potential"])

    report = Report(
        report_text=body.report_text,
        site=body.site,
        activity=body.activity,
        sif_potential=sif_enum,
        confidence=result["confidence"],
        rule_tags=", ".join(result["rule_tags"]),
        evidence_spans=" | ".join(result["evidence_spans"]),
        counterfactual_delta=result["counterfactual_delta"],
        review_status=ReviewStatus.PENDING,
        created_at=datetime.utcnow(),
    )

    db.add(report)
    await db.commit()
    await db.refresh(report)

    return IngestOut(
        id=report.id,
        report_text=report.report_text,
        site=report.site,
        activity=report.activity,
        sif_potential=report.sif_potential.value,
        confidence=report.confidence,
        rule_tags=[t.strip() for t in (report.rule_tags or "").split(",") if t.strip()],
        evidence_spans=[s.strip() for s in (report.evidence_spans or "").split("|") if s.strip()],
        counterfactual_delta=report.counterfactual_delta or 0,
        barrier_proximity_label=_barrier_label(report.counterfactual_delta or 0),
        classifier_tier=result.get("classifier_tier", "TIER2_RULE_BASED"),
        review_status=report.review_status.value,
        created_at=report.created_at,
    )


@router.get("/stats", response_model=dict)
async def ingest_stats(db: AsyncSession = Depends(get_db)):
    """Quick stats on ingested reports — useful for pipeline health monitoring."""
    from sqlalchemy import func
    from app.models.report import SIFPotential as SP
    total = (await db.execute(__import__('sqlalchemy').select(func.count()).select_from(Report))).scalar_one()
    by_tier = {}
    for tier in SP:
        count = (await db.execute(
            __import__('sqlalchemy').select(func.count()).select_from(Report).where(Report.sif_potential == tier)
        )).scalar_one()
        by_tier[tier.value] = count
    return {"total_ingested": total, "by_sif_tier": by_tier, "classifier": "TIER2_RULE_BASED"}
