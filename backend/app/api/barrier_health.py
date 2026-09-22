"""
Barrier Health Intelligence Engine
────────────────────────────────────
Aggregates all SIF reports into a continuously-updated map of
how each critical safety barrier is performing — per site and
across the whole organization.

Outputs:
  • Per-barrier health scores (0–100)
  • Site × Barrier health matrix
  • Convergence zones (sites where 3+ barriers are degrading)
"""
from fastapi import APIRouter
from sqlalchemy import select
from collections import defaultdict

from app.db.database import AsyncSessionLocal
from app.models.report import Report, SIFPotential

router = APIRouter()

# ── Barrier taxonomy (same as BarrierModel.jsx) ─────────────────────────────
BARRIERS = [
    {
        "id": "loto",
        "name": "Energy Isolation",
        "short": "LOTO",
        "keywords": ["isolation", "loto", "lockout", "tagout", "de-energised",
                     "valve closed", "isolated", "energy isolated"],
        "fail_keywords": ["no isolation", "assumed closed", "not isolated", "live",
                          "pressurised", "bypass", "loto not done", "no loto",
                          "isolation not done", "isolation bypassed"],
    },
    {
        "id": "gas",
        "name": "Gas / Atmospheric Testing",
        "short": "Gas Test",
        "keywords": ["gas test", "atmospheric test", "h2s monitor", "gas detector",
                     "lel check", "gas reading", "gas check", "oxygen test"],
        "fail_keywords": ["no gas test", "without test", "no detector", "no monitor",
                          "not tested", "gas not checked", "without gas", "no atmospheric"],
    },
    {
        "id": "permit",
        "name": "Permit to Work",
        "short": "PTW",
        "keywords": ["ptw", "permit", "hot work permit", "work permit", "permit issued",
                     "permit raised"],
        "fail_keywords": ["no permit", "without permit", "bypass permit", "skipped permit",
                          "no ptw", "permit not raised", "permit not issued"],
    },
    {
        "id": "ppe",
        "name": "PPE",
        "short": "PPE",
        "keywords": ["ppe", "helmet", "harness", "gloves", "safety belt",
                     "respirator", "scba", "protective equipment"],
        "fail_keywords": ["no ppe", "without helmet", "no harness", "no safety belt",
                          "missing ppe", "ppe not worn", "without ppe"],
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
    },
    {
        "id": "sop",
        "name": "Safe Work Procedure",
        "short": "SOP",
        "keywords": ["procedure", "sop", "jsa", "risk assessment", "method statement",
                     "work instruction", "risk assessment done"],
        "fail_keywords": ["no procedure", "not followed", "deviated", "skipped steps",
                          "improvised", "no jsa", "procedure not followed",
                          "no risk assessment"],
    },
]

HEALTH_THRESHOLDS = {
    "green":  80,   # ≥ 80 → 🟢
    "yellow": 60,   # 60–79 → 🟡
    "orange": 40,   # 40–59 → 🟠
    # < 40 → 🔴
}

def assess_barrier(barrier: dict, text: str) -> str:
    """Returns: INTACT | FAILED | UNSTATED"""
    t = text.lower()
    has_fail = any(k in t for k in barrier["fail_keywords"])
    has_mention = any(k in t for k in barrier["keywords"])
    if has_fail:
        return "FAILED"
    if has_mention:
        return "INTACT"
    return "UNSTATED"


def health_color(score: float) -> str:
    if score >= HEALTH_THRESHOLDS["green"]:
        return "green"
    if score >= HEALTH_THRESHOLDS["yellow"]:
        return "yellow"
    if score >= HEALTH_THRESHOLDS["orange"]:
        return "orange"
    return "red"


def compute_health(intact: int, failed: int, unstated: int, total_sif: int) -> float:
    """
    Health = percentage of clean (intact) barrier mentions out of all
    evidence we have, with a penalty for unstated rate in SIF reports.
    """
    mentioned = intact + failed
    if mentioned == 0:
        # No direct evidence — health is penalized if unstated rate is high
        if total_sif == 0:
            return 75.0   # neutral — no data
        unstated_rate = unstated / total_sif
        return max(35.0, 75.0 - unstated_rate * 50)

    base = (intact / mentioned) * 100
    # Penalize high unstated rate (silent failures are dangerous)
    if total_sif > 0:
        unstated_rate = unstated / total_sif
        base = base - (unstated_rate * 20)
    return round(max(0.0, min(100.0, base)), 1)


@router.get("/barrier-health/matrix")
async def get_barrier_health_matrix():
    """
    Returns site × barrier health matrix.
    Each cell: { score, color, intact, failed, unstated }
    """
    async with AsyncSessionLocal() as db:
        reports = (await db.execute(select(Report))).scalars().all()

    # Only consider SIF-relevant reports (HIGH + MEDIUM carry barrier signal)
    sif_reports = [r for r in reports if r.sif_potential in (
        SIFPotential.HIGH, SIFPotential.MEDIUM
    )]

    # ── Organization-level aggregation ───────────────────────────────────
    org_stats = {b["id"]: {"intact": 0, "failed": 0, "unstated": 0}
                 for b in BARRIERS}
    for r in sif_reports:
        for b in BARRIERS:
            state = assess_barrier(b, r.report_text)
            org_stats[b["id"]][state.lower()] += 1

    org_health = {}
    for b in BARRIERS:
        s = org_stats[b["id"]]
        score = compute_health(s["intact"], s["failed"], s["unstated"], len(sif_reports))
        org_health[b["id"]] = {
            "id": b["id"],
            "name": b["name"],
            "short": b["short"],
            "score": score,
            "color": health_color(score),
            **s,
            "total_sif": len(sif_reports),
        }

    # ── Gap 4: Trend via report-ID split (early half vs recent half) ──────────
    if len(sif_reports) >= 4:
        sorted_r = sorted(sif_reports, key=lambda r: r.id)
        mid = len(sorted_r) // 2
        early, recent = sorted_r[:mid], sorted_r[mid:]
        for b in BARRIERS:
            early_h  = compute_health(
                sum(1 for r in early  if assess_barrier(b, r.report_text) == "INTACT"),
                sum(1 for r in early  if assess_barrier(b, r.report_text) == "FAILED"),
                sum(1 for r in early  if assess_barrier(b, r.report_text) == "UNSTATED"),
                len(early),
            )
            recent_h = compute_health(
                sum(1 for r in recent if assess_barrier(b, r.report_text) == "INTACT"),
                sum(1 for r in recent if assess_barrier(b, r.report_text) == "FAILED"),
                sum(1 for r in recent if assess_barrier(b, r.report_text) == "UNSTATED"),
                len(recent),
            )
            delta = round(recent_h - early_h, 1)
            direction = "up" if delta > 3 else ("down" if delta < -3 else "stable")
            org_health[b["id"]]["trend_delta"] = delta
            org_health[b["id"]]["trend"] = direction
    else:
        for b in BARRIERS:
            org_health[b["id"]]["trend_delta"] = 0
            org_health[b["id"]]["trend"] = "stable"

    # ── Per-site aggregation ──────────────────────────────────────────────
    sites: dict[str, list] = defaultdict(list)
    for r in sif_reports:
        sites[r.site or "Unknown"].append(r)

    site_matrix = {}
    for site, rpts in sites.items():
        site_barriers = {}
        for b in BARRIERS:
            intact = failed = unstated = 0
            for r in rpts:
                state = assess_barrier(b, r.report_text)
                if state == "INTACT":
                    intact += 1
                elif state == "FAILED":
                    failed += 1
                else:
                    unstated += 1
            score = compute_health(intact, failed, unstated, len(rpts))
            site_barriers[b["id"]] = {
                "score": score,
                "color": health_color(score),
                "intact": intact,
                "failed": failed,
                "unstated": unstated,
            }
        site_matrix[site] = {
            "site": site,
            "total_reports": len(rpts),
            "high_sif": sum(1 for r in rpts if r.sif_potential == SIFPotential.HIGH),
            "barriers": site_barriers,
            "degrading_count": sum(
                1 for bid in site_barriers
                if site_barriers[bid]["color"] in ("red", "orange")
            ),
        }

    # Sort sites by HIGH SIF count (most critical first)
    sorted_sites = sorted(
        site_matrix.values(),
        key=lambda s: (s["high_sif"], s["degrading_count"]),
        reverse=True,
    )

    # ── Global stats ──────────────────────────────────────────────────────
    degrading_barriers = sum(
        1 for b in org_health.values() if b["color"] in ("red", "orange")
    )

    return {
        "total_reports": len(reports),
        "sif_reports": len(sif_reports),
        "degrading_barriers": degrading_barriers,
        "barriers": BARRIERS,
        "org_health": org_health,
        "sites": sorted_sites[:12],  # top 12 sites
    }


@router.get("/barrier-health/convergence")
async def get_convergence_zones():
    """Returns sites where 3+ barriers are simultaneously degrading."""
    matrix = await get_barrier_health_matrix()
    convergence = []

    for site_data in matrix["sites"]:
        barriers_by_color = {"red": [], "orange": [], "yellow": [], "green": []}
        for bid, bdata in site_data["barriers"].items():
            barriers_by_color[bdata["color"]].append(bid)

        red_count = len(barriers_by_color["red"])
        orange_count = len(barriers_by_color["orange"])
        degrading = barriers_by_color["red"] + barriers_by_color["orange"]

        if len(degrading) >= 3:
            barrier_names = {b["id"]: b["short"] for b in BARRIERS}
            avg_score = sum(
                site_data["barriers"][bid]["score"] for bid in degrading
            ) / len(degrading)

            convergence.append({
                "site": site_data["site"],
                "degrading_count": len(degrading),
                "total_barriers": len(BARRIERS),
                "red_barriers": [barrier_names[b] for b in barriers_by_color["red"]],
                "orange_barriers": [barrier_names[b] for b in barriers_by_color["orange"]],
                "degrading_barriers": [barrier_names[b] for b in degrading],
                "degrading_ids": degrading,
                "barrier_scores": {bid: site_data["barriers"][bid]["score"] for bid in degrading},
                "avg_degraded_score": round(avg_score, 1),
                "high_sif": site_data["high_sif"],
                "severity": "CRITICAL" if red_count >= 3 else "WARNING",
            })

    convergence.sort(key=lambda c: c["degrading_count"], reverse=True)
    return convergence


@router.get("/barrier-health/simulate")
async def simulate_intervention(site: str):
    """
    Gap 2 — Simulate Intervention:
    For a given convergence zone site, compute projected barrier health
    improvement if each degraded barrier (or combinations) were restored.
    Returns options ranked by estimated improvement.
    """
    matrix = await get_barrier_health_matrix()
    site_data = next((s for s in matrix["sites"] if s["site"] == site), None)
    if not site_data:
        return {"error": "Site not found", "options": []}

    # Find all degraded barriers for this site
    degraded = [
        (bid, bdata)
        for bid, bdata in site_data["barriers"].items()
        if bdata["color"] in ("red", "orange")
    ]
    if not degraded:
        return {"site": site, "options": [], "message": "No degraded barriers to simulate."}

    RESTORED_SCORE = 78.0   # Realistic post-intervention healthy baseline
    barrier_names = {b["id"]: b["short"] for b in BARRIERS}

    def compute_system_health(overrides: dict) -> float:
        """Average health across all barriers, with overrides for restored ones."""
        scores = []
        for bid, bdata in site_data["barriers"].items():
            scores.append(overrides.get(bid, bdata["score"]))
        return round(sum(scores) / len(scores), 1)

    current_avg = compute_system_health({})

    # Generate single-barrier options
    options = []
    for bid, bdata in sorted(degraded, key=lambda x: x[1]["score"]):
        projected = compute_system_health({bid: RESTORED_SCORE})
        options.append({
            "label": f"Restore {barrier_names.get(bid, bid)}",
            "barriers": [barrier_names.get(bid, bid)],
            "barrier_ids": [bid],
            "current_score": round(bdata["score"], 1),
            "projected_score": projected,
            "improvement": round(projected - current_avg, 1),
        })

    # Combo option: all degraded barriers restored
    if len(degraded) >= 2:
        all_overrides = {bid: RESTORED_SCORE for bid, _ in degraded}
        projected_all = compute_system_health(all_overrides)
        options.append({
            "label": f"Restore All ({len(degraded)} barriers)",
            "barriers": [barrier_names.get(bid, bid) for bid, _ in degraded],
            "barrier_ids": [bid for bid, _ in degraded],
            "current_score": round(sum(bd["score"] for _, bd in degraded) / len(degraded), 1),
            "projected_score": projected_all,
            "improvement": round(projected_all - current_avg, 1),
        })

    # Sort by improvement descending, label options A/B/C
    options.sort(key=lambda o: o["improvement"], reverse=True)
    labels = "ABCDEFG"
    for i, opt in enumerate(options[:5]):
        opt["option"] = labels[i]
    options = options[:5]
    if options:
        options[0]["recommended"] = True

    return {
        "site": site,
        "current_avg_health": current_avg,
        "options": options,
    }
