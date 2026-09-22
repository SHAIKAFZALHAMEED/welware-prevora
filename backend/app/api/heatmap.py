"""
Phase 4+: Heatmap endpoint
Returns site × IOGP rule SIF density matrix for the heatmap visualization.
"""
from fastapi import APIRouter
from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.models.report import Report, SIFPotential

router = APIRouter()

IOGP_RULES = [
    "Energy Isolation (LOTO)",
    "Confined Space Entry",
    "Hot Work",
    "Line of Fire",
    "Working at Height",
    "Bypass of Safety Controls",
    "General Safety",
]

@router.get("/heatmap")
async def get_heatmap():
    """
    Site × IOGP Rule SIF density matrix.
    Returns a 2D grid: rows=sites, cols=IOGP rules.
    Cell value = number of HIGH/MEDIUM SIF reports matching that rule at that site.
    """
    async with AsyncSessionLocal() as db:
        reports = (await db.execute(
            select(Report).where(Report.sif_potential.in_([
                SIFPotential.HIGH, SIFPotential.MEDIUM
            ]))
        )).scalars().all()

    # Build site list (top 12 by report count)
    from collections import defaultdict, Counter
    site_counts = Counter(r.site for r in reports)
    top_sites = [s for s, _ in site_counts.most_common(12)]

    # Build matrix
    matrix = []
    for site in top_sites:
        site_reports = [r for r in reports if r.site == site]
        row = {"site": site, "total": len(site_reports), "cells": []}
        for rule in IOGP_RULES:
            count = sum(
                1 for r in site_reports
                if rule.lower() in (r.rule_tags or "").lower()
            )
            row["cells"].append({
                "rule": rule,
                "count": count,
                "density": round(count / len(site_reports), 2) if site_reports else 0,
            })
        matrix.append(row)

    return {
        "rules": IOGP_RULES,
        "sites": top_sites,
        "matrix": matrix,
        "total_high_medium": len(reports),
    }
