from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_
from pydantic import BaseModel

from app.db.database import get_db
from app.models.report import Report, SIFPotential, ReviewStatus

router = APIRouter()


class ReportOut(BaseModel):
    id: int
    report_text: str
    site: str
    activity: str
    sif_potential: str
    confidence: float
    rule_tags: list[str]
    evidence_spans: list[str]
    counterfactual_delta: int
    review_status: str
    reviewer_notes: str
    created_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReviewIn(BaseModel):
    review_status: str
    reviewer_notes: str = ""


def _to_out(r: Report) -> ReportOut:
    return ReportOut(
        id=r.id,
        report_text=r.report_text,
        site=r.site,
        activity=r.activity,
        sif_potential=r.sif_potential.value,
        confidence=r.confidence,
        rule_tags=[t.strip() for t in (r.rule_tags or "").split(",") if t.strip()],
        evidence_spans=[s.strip() for s in (r.evidence_spans or "").split("|") if s.strip()],
        counterfactual_delta=r.counterfactual_delta or 0,
        review_status=r.review_status.value,
        reviewer_notes=r.reviewer_notes or "",
        created_at=r.created_at,
        reviewed_at=r.reviewed_at,
    )


@router.get("/", response_model=dict)
async def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sif_potential: Optional[str] = None,
    site: Optional[str] = None,
    rule_tag: Optional[str] = None,
    review_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List reports with filtering, sorted by SIF priority (HIGH first, then confidence desc).
    """
    filters = []
    if sif_potential:
        try:
            filters.append(Report.sif_potential == SIFPotential(sif_potential.upper()))
        except ValueError:
            pass
    if site:
        filters.append(Report.site.ilike(f"%{site}%"))
    if rule_tag:
        filters.append(Report.rule_tags.ilike(f"%{rule_tag}%"))
    if review_status:
        try:
            filters.append(Report.review_status == ReviewStatus(review_status.upper()))
        except ValueError:
            pass

    # Priority sort: HIGH > UNCERTAIN > MEDIUM > LOW, then confidence desc
    priority_order = case(
        (Report.sif_potential == SIFPotential.HIGH, 1),
        (Report.sif_potential == SIFPotential.UNCERTAIN, 2),
        (Report.sif_potential == SIFPotential.MEDIUM, 3),
        (Report.sif_potential == SIFPotential.LOW, 4),
        else_=5,
    )

    query = select(Report).order_by(priority_order, Report.confidence.desc())
    count_query = select(func.count()).select_from(Report)

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total = (await db.execute(count_query)).scalar_one()
    reports = (await db.execute(query.offset((page - 1) * page_size).limit(page_size))).scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": [_to_out(r) for r in reports],
    }


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    r = (await db.execute(select(Report).where(Report.id == report_id))).scalars().first()
    if not r:
        from fastapi import HTTPException
        raise HTTPException(404, "Report not found")
    return _to_out(r)


@router.patch("/{report_id}/review", response_model=ReportOut)
async def review_report(report_id: int, body: ReviewIn, db: AsyncSession = Depends(get_db)):
    """Human-in-the-loop: mark a report as reviewed with optional correction."""
    from app.nlp.active_learning import active_learning
    r = (await db.execute(select(Report).where(Report.id == report_id))).scalars().first()
    if not r:
        from fastapi import HTTPException
        raise HTTPException(404, "Report not found")
    try:
        r.review_status = ReviewStatus(body.review_status.upper())
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(400, f"Invalid review_status: {body.review_status}")
    r.reviewer_notes = body.reviewer_notes
    r.reviewed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(r)
    # Trigger active learning keyword rebuild after each human review
    await active_learning.refresh_from_db()
    return _to_out(r)


@router.get("/meta/sites", response_model=list[str])
async def list_sites(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Report.site).distinct().order_by(Report.site))).scalars().all()
    return list(rows)


@router.get("/meta/rules", response_model=list[str])
async def list_rules(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Report.rule_tags))).scalars().all()
    seen, result = set(), []
    for row in rows:
        for tag in (row or "").split(","):
            tag = tag.strip()
            if tag and tag not in seen:
                seen.add(tag)
                result.append(tag)
    return sorted(result)
