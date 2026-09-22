"""
Phase 3 additions:
- Bulk review endpoint (batch confirm/reject)
- Hero report pinning (top-3 canonical HIGH SIF for demo)
- Similar SIF lookup from active learning
- Review now triggers active learning keyword refresh
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db, AsyncSessionLocal
from app.models.report import Report, SIFPotential, ReviewStatus
from app.nlp.active_learning import active_learning

router = APIRouter()


class BulkReviewIn(BaseModel):
    report_ids: list[int]
    review_status: str
    reviewer_notes: str = ""


class SimilarSIFOut(BaseModel):
    id: int
    site: str
    activity: str
    sif_potential: str
    confidence: float
    excerpt: str


@router.post("/bulk-review")
async def bulk_review(body: BulkReviewIn, db: AsyncSession = Depends(get_db)):
    """Batch confirm/reject multiple reports in one action."""
    try:
        new_status = ReviewStatus(body.review_status.upper())
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(400, f"Invalid review_status: {body.review_status}")

    updated = 0
    async with db as session:
        for rid in body.report_ids:
            r = (await session.execute(select(Report).where(Report.id == rid))).scalars().first()
            if r:
                r.review_status = new_status
                r.reviewer_notes = body.reviewer_notes
                r.reviewed_at = datetime.utcnow()
                updated += 1
        await session.commit()

    # Trigger active learning refresh after bulk review
    await active_learning.refresh_from_db()

    return {"updated": updated, "review_status": body.review_status}


@router.get("/hero", response_model=list[dict])
async def get_hero_reports():
    """
    Return the top-3 canonical HIGH SIF hero reports for demo presentation.
    These are the reports with highest confidence in the HIGH tier —
    ideal for walkthrough demonstrations.
    """
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(Report)
            .where(Report.sif_potential == SIFPotential.HIGH)
            .order_by(Report.confidence.desc())
            .limit(3)
        )).scalars().all()

    return [
        {
            "id": r.id,
            "site": r.site,
            "activity": r.activity,
            "sif_potential": r.sif_potential.value,
            "confidence": r.confidence,
            "counterfactual_delta": r.counterfactual_delta or 0,
            "rule_tags": [t.strip() for t in (r.rule_tags or "").split(",") if t.strip()],
            "excerpt": r.report_text[:120] + "…",
            "is_hero": True,
        }
        for r in rows
    ]


@router.get("/{report_id}/similar", response_model=list[SimilarSIFOut])
async def get_similar_sif(report_id: int, db: AsyncSession = Depends(get_db)):
    """
    Find similar confirmed SIF reports based on shared rule tags.
    Powers the 'Similar Confirmed SIF' callout on the Report Detail page.
    """
    target = (await db.execute(select(Report).where(Report.id == report_id))).scalars().first()
    if not target:
        return []

    target_rules = set(t.strip() for t in (target.rule_tags or "").split(",") if t.strip())

    # Get confirmed HIGH/MEDIUM SIF reports, excluding self
    candidates = (await db.execute(
        select(Report)
        .where(
            Report.id != report_id,
            Report.review_status == ReviewStatus.CONFIRMED_SIF,
            Report.sif_potential.in_([SIFPotential.HIGH, SIFPotential.MEDIUM]),
        )
        .limit(50)
    )).scalars().all()

    # Score by rule tag overlap
    scored = []
    for r in candidates:
        r_rules = set(t.strip() for t in (r.rule_tags or "").split(",") if t.strip())
        overlap = len(target_rules & r_rules)
        if overlap > 0:
            scored.append((overlap, r))

    scored.sort(key=lambda x: x[0], reverse=True)
    top3 = [r for _, r in scored[:3]]

    # If no confirmed matches yet, fall back to unreviewed HIGH SIF with rule overlap
    if not top3:
        candidates2 = (await db.execute(
            select(Report)
            .where(
                Report.id != report_id,
                Report.sif_potential == SIFPotential.HIGH,
            )
            .order_by(Report.confidence.desc())
            .limit(20)
        )).scalars().all()

        scored2 = []
        for r in candidates2:
            r_rules = set(t.strip() for t in (r.rule_tags or "").split(",") if t.strip())
            overlap = len(target_rules & r_rules)
            if overlap > 0:
                scored2.append((overlap, r))
        scored2.sort(key=lambda x: x[0], reverse=True)
        top3 = [r for _, r in scored2[:3]]

    return [
        SimilarSIFOut(
            id=r.id,
            site=r.site,
            activity=r.activity,
            sif_potential=r.sif_potential.value,
            confidence=r.confidence,
            excerpt=r.report_text[:100] + "…",
        )
        for r in top3
    ]


# ── Duplicate Detection ─────────────────────────────────────────────────────
class DuplicateIn(BaseModel):
    report_text: str
    threshold: float = 0.45


def _jaccard(a: str, b: str, n: int = 3) -> float:
    """Character 3-gram Jaccard similarity."""
    def ngrams(s):
        s = s.lower()
        return set(s[i:i + n] for i in range(len(s) - n + 1))
    sa, sb = ngrams(a), ngrams(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


@router.post("/{report_id}/check-duplicate")
async def check_duplicate(report_id: int, body: DuplicateIn, db: AsyncSession = Depends(get_db)):
    """
    Jaccard n-gram similarity check against existing reports.
    Flags recurring same-site systemic patterns.
    """
    target = (await db.execute(select(Report).where(Report.id == report_id))).scalars().first()
    candidates = (await db.execute(
        select(Report).where(Report.id != report_id)
    )).scalars().all()

    duplicates = []
    for r in candidates:
        sim = _jaccard(body.report_text, r.report_text)
        if sim >= body.threshold:
            duplicates.append({
                "id": r.id,
                "site": r.site,
                "activity": r.activity,
                "sif_potential": r.sif_potential.value,
                "similarity": round(sim, 3),
                "excerpt": r.report_text[:100] + "…",
            })

    duplicates.sort(key=lambda x: x["similarity"], reverse=True)
    same_site = any(d["site"] == (target.site if target else "") for d in duplicates)

    return {
        "is_duplicate": len(duplicates) > 0,
        "same_site_recurring_pattern": same_site,
        "duplicate_count": len(duplicates),
        "similar_reports": duplicates[:5],
        "note": "Recurring same-site pattern — may indicate systemic precursor." if same_site else "",
    }
