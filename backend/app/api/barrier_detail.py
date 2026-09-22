"""
Barrier Detail Drill-Down Endpoint
────────────────────────────────────
For a given site + barrier ID, returns:
  • Score / color / trend
  • Failed / absent / unstated counts
  • Actual evidence spans from report text
  • Report IDs that contributed
  • Suggested intervention
"""
from fastapi import APIRouter, Query
from sqlalchemy import select
from typing import Optional
import re

from app.db.database import AsyncSessionLocal
from app.models.report import Report, SIFPotential

router = APIRouter()

# Re-use barrier taxonomy (same as barrier_health.py)
BARRIERS = [
    {
        "id": "loto",
        "name": "Energy Isolation (LOTO)",
        "short": "LOTO",
        "keywords": ["isolation", "loto", "lockout", "tagout", "de-energised",
                     "valve closed", "isolated", "energy isolated"],
        "fail_keywords": ["no isolation", "assumed closed", "not isolated", "live",
                          "pressurised", "bypass", "loto not done", "no loto",
                          "isolation not done", "isolation bypassed"],
        "intervention": "Mandatory LOTO permit before any maintenance. Verify zero-energy state with try-out before work begins.",
    },
    {
        "id": "gas",
        "name": "Gas / Atmospheric Testing",
        "short": "Gas Test",
        "keywords": ["gas test", "atmospheric test", "h2s monitor", "gas detector",
                     "lel check", "gas reading", "gas check", "oxygen test"],
        "fail_keywords": ["no gas test", "without test", "no detector", "no monitor",
                          "not tested", "gas not checked", "without gas", "no atmospheric"],
        "intervention": "Mandatory atmospheric testing before confined space entry or hot work. Log detector readings on permit.",
    },
    {
        "id": "permit",
        "name": "Permit to Work (PTW)",
        "short": "PTW",
        "keywords": ["ptw", "permit", "hot work permit", "work permit", "permit issued",
                     "permit raised"],
        "fail_keywords": ["no permit", "without permit", "bypass permit", "skipped permit",
                          "no ptw", "permit not raised", "permit not issued"],
        "intervention": "Enforce PTW compliance for all non-routine work. Zero-tolerance policy for permit bypass.",
    },
    {
        "id": "ppe",
        "name": "Personal Protective Equipment",
        "short": "PPE",
        "keywords": ["ppe", "helmet", "harness", "gloves", "safety belt",
                     "respirator", "scba", "protective equipment"],
        "fail_keywords": ["no ppe", "without helmet", "no harness", "no safety belt",
                          "missing ppe", "ppe not worn", "without ppe"],
        "intervention": "Conduct PPE compliance audit at site. Supervisor sign-off required before job start.",
    },
    {
        "id": "supervision",
        "name": "Supervision / Standby",
        "short": "Supervision",
        "keywords": ["supervisor", "standby man", "attendant", "watch", "buddy",
                     "standby", "safety watch"],
        "fail_keywords": ["no standby", "no supervisor", "absent", "alone",
                          "no attendant", "unsupervised", "without standby",
                          "no safety watch"],
        "intervention": "Mandatory standby person for all confined space, height, and hot work operations. Verify before work starts.",
    },
    {
        "id": "sop",
        "name": "Safe Work Procedure (SOP)",
        "short": "SOP",
        "keywords": ["procedure", "sop", "jsa", "risk assessment", "method statement",
                     "work instruction", "risk assessment done"],
        "fail_keywords": ["no procedure", "not followed", "deviated", "skipped steps",
                          "improvised", "no jsa", "procedure not followed",
                          "no risk assessment"],
        "intervention": "Review and re-issue SOP for this activity. Toolbox talk mandatory before restart.",
    },
]

BARRIER_MAP = {b["id"]: b for b in BARRIERS}


def _assess_state(barrier: dict, text: str) -> str:
    t = text.lower()
    if any(k in t for k in barrier["fail_keywords"]):
        return "FAILED"
    if any(k in t for k in barrier["keywords"]):
        return "INTACT"
    return "UNSTATED"


def _extract_evidence(barrier: dict, text: str, max_spans: int = 4) -> list[str]:
    """Extract sentence-level evidence spans containing barrier keywords."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    spans = []
    all_kw = barrier["keywords"] + barrier["fail_keywords"]
    for sent in sentences:
        if any(k in sent.lower() for k in all_kw):
            snippet = sent.strip()
            if len(snippet) > 180:
                snippet = snippet[:177] + "…"
            if snippet and snippet not in spans:
                spans.append(snippet)
        if len(spans) >= max_spans:
            break
    return spans


def _health_color(score: float) -> str:
    if score >= 80: return "green"
    if score >= 60: return "yellow"
    if score >= 40: return "orange"
    return "red"


@router.get("/barrier-health/detail")
async def get_barrier_detail(
    barrier_id: str = Query(..., alias="barrier"),
    site: Optional[str] = Query(None),
):
    """
    Drill-down for a single barrier (optionally filtered by site).
    Returns counts, evidence spans, trend, and intervention recommendation.
    """
    b = BARRIER_MAP.get(barrier_id)
    if not b:
        return {"error": f"Unknown barrier id: {barrier_id}"}

    async with AsyncSessionLocal() as db:
        reports = (await db.execute(select(Report))).scalars().all()

    sif_reports = [
        r for r in reports
        if r.sif_potential in (SIFPotential.HIGH, SIFPotential.MEDIUM)
    ]
    if site:
        site_reports = [r for r in sif_reports if r.site == site]
    else:
        site_reports = sif_reports

    intact = failed = unstated = 0
    evidence_spans = []
    contributing_ids = []
    failed_reports = []

    for r in site_reports:
        state = _assess_state(b, r.report_text)
        if state == "INTACT":
            intact += 1
        elif state == "FAILED":
            failed += 1
            spans = _extract_evidence(b, r.report_text)
            evidence_spans.extend(spans)
            failed_reports.append({"id": r.id, "site": r.site, "activity": r.activity})
        else:
            unstated += 1

        if state in ("FAILED", "INTACT"):
            contributing_ids.append(r.id)

    total = len(site_reports)
    mentioned = intact + failed
    score = round(
        (intact / mentioned * 100 - (unstated / total * 20)) if mentioned > 0
        else max(35.0, 75.0 - (unstated / total * 50) if total > 0 else 75.0),
        1,
    )
    score = max(0.0, min(100.0, score))

    # Trend via ID split
    if len(site_reports) >= 4:
        sorted_r = sorted(site_reports, key=lambda r: r.id)
        mid = len(sorted_r) // 2
        early, recent = sorted_r[:mid], sorted_r[mid:]

        def _h(rpts):
            i = sum(1 for r in rpts if _assess_state(b, r.report_text) == "INTACT")
            f = sum(1 for r in rpts if _assess_state(b, r.report_text) == "FAILED")
            u = sum(1 for r in rpts if _assess_state(b, r.report_text) == "UNSTATED")
            m = i + f
            if m == 0:
                return max(35.0, 75.0 - (u / len(rpts) * 50))
            return max(0, min(100, i / m * 100 - (u / len(rpts) * 20)))

        early_h, recent_h = _h(early), _h(recent)
        delta = round(recent_h - early_h, 1)
        trend = "up" if delta > 3 else ("down" if delta < -3 else "stable")
    else:
        delta, trend = 0, "stable"

    # Confidence based on evidence volume
    confidence = min(99, round(50 + (len(site_reports) / max(1, total) * 49)))

    # Deduplicate evidence
    seen = set()
    unique_evidence = []
    for s in evidence_spans:
        if s not in seen:
            seen.add(s)
            unique_evidence.append(s)

    return {
        "barrier_id": barrier_id,
        "barrier_name": b["name"],
        "barrier_short": b["short"],
        "site": site or "All Sites",
        "score": score,
        "color": _health_color(score),
        "intact": intact,
        "failed": failed,
        "unstated": unstated,
        "total_reports": total,
        "trend": trend,
        "trend_delta": delta,
        "confidence": confidence,
        "evidence_spans": unique_evidence[:5],
        "failed_report_ids": [r["id"] for r in failed_reports[:10]],
        "intervention": b["intervention"],
    }
