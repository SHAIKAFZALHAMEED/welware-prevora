from fastapi import APIRouter
from sqlalchemy import select, func, case
from app.db.database import AsyncSessionLocal
from app.models.report import Report, SIFPotential

router = APIRouter()


def _high_case():
    return case((Report.sif_potential == SIFPotential.HIGH, 1), else_=0)


def _uncertain_case():
    return case((Report.sif_potential == SIFPotential.UNCERTAIN, 1), else_=0)


@router.get("/summary")
async def get_summary():
    """Overview stats for the executive dashboard panel."""
    async with AsyncSessionLocal() as db:
        total = (await db.execute(select(func.count()).select_from(Report))).scalar_one()
        high = (await db.execute(
            select(func.count()).select_from(Report).where(Report.sif_potential == SIFPotential.HIGH)
        )).scalar_one()
        medium = (await db.execute(
            select(func.count()).select_from(Report).where(Report.sif_potential == SIFPotential.MEDIUM)
        )).scalar_one()
        low = (await db.execute(
            select(func.count()).select_from(Report).where(Report.sif_potential == SIFPotential.LOW)
        )).scalar_one()
        uncertain = (await db.execute(
            select(func.count()).select_from(Report).where(Report.sif_potential == SIFPotential.UNCERTAIN)
        )).scalar_one()
        pending_review = high + uncertain

    return {
        "total_reports": total,
        "high_sif": high,
        "medium_sif": medium,
        "low_sif": low,
        "uncertain": uncertain,
        "pending_high_priority_review": pending_review,
        "sif_density_pct": round((high + uncertain) / max(total, 1) * 100, 1),
    }


@router.get("/site-ranking")
async def site_ranking():
    """Rank sites by SIF-precursor density (HIGH + UNCERTAIN count)."""
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(
                Report.site,
                func.count().label("total"),
                func.sum(_high_case()).label("high_count"),
                func.sum(_uncertain_case()).label("uncertain_count"),
            )
            .group_by(Report.site)
            .order_by((func.sum(_high_case()) + func.sum(_uncertain_case())).desc())
        )).all()

    return [
        {
            "site": r.site,
            "total": r.total,
            "high_sif": int(r.high_count or 0),
            "uncertain": int(r.uncertain_count or 0),
            "sif_density": round(
                (int(r.high_count or 0) + int(r.uncertain_count or 0)) / max(r.total, 1) * 100, 1
            ),
        }
        for r in rows
    ]


@router.get("/rule-distribution")
async def rule_distribution():
    """Distribution of IOGP Life-Saving Rule tags across all reports."""
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Report.rule_tags, Report.sif_potential))).all()

    counts: dict[str, dict] = {}
    for row in rows:
        for tag in (row.rule_tags or "").split(","):
            tag = tag.strip()
            if not tag:
                continue
            if tag not in counts:
                counts[tag] = {"rule": tag, "total": 0, "high": 0, "medium": 0, "low": 0, "uncertain": 0}
            counts[tag]["total"] += 1
            tier = row.sif_potential.value.lower() if row.sif_potential else "low"
            if tier in counts[tag]:
                counts[tag][tier] += 1

    return sorted(counts.values(), key=lambda x: x["total"], reverse=True)


@router.get("/precursor-radar")
async def precursor_radar():
    """Activity x Site clustering with SIF density — for the Precursor Radar heatmap."""
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(
                Report.site,
                Report.activity,
                func.count().label("report_count"),
                func.sum(_high_case()).label("high_count"),
                func.avg(Report.confidence).label("avg_confidence"),
            )
            .group_by(Report.site, Report.activity)
            .order_by(func.sum(_high_case()).desc())
            .limit(30)
        )).all()

    return [
        {
            "site": r.site,
            "activity": r.activity,
            "report_count": r.report_count,
            "high_sif_count": int(r.high_count or 0),
            "avg_confidence": round(r.avg_confidence or 0, 3),
        }
        for r in rows
    ]
