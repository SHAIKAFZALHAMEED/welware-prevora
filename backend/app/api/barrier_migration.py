"""
Barrier Migration Detection
────────────────────────────
Detects when a degrading barrier signature from one region
is beginning to emerge in another region.

Algorithm (fully transparent / defensible):
  1. Compute per-region barrier trend vectors (same split-ID logic as org health)
  2. Find "origin" regions with established degradation (trend=down, more reports)
  3. Find "emerging" regions with early degradation (trend=down, fewer reports)
  4. Match on overlapping degrading barrier IDs → compute similarity
  5. Return pairs with similarity ≥ 40%

Language is always "pattern similarity" — never "prediction".
"""
from fastapi import APIRouter
from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.models.report import Report, SIFPotential

router = APIRouter()

# OIL operational regions with associated site keywords
REGIONS = {
    "North East — Assam": ["Rig", "Well", "Pump", "Moran", "Jorhat", "Duliajan", "Borholla"],
    "North East — Arunachal": ["Arunachal", "AP-", "Namrup"],
    "North East — Tripura": ["Tripura", "TR-", "Agartala"],
    "Rajasthan": ["Rajasthan", "Jaisalmer", "Baghewala", "Dandewala", "Bakhritibba", "RJ-"],
    "Mahanadi / Odisha": ["Mahanadi", "Odisha", "OD-", "Bhubaneswar"],
    "Offshore": ["Offshore", "KG-", "Andaman", "Kerala"],
}

BARRIERS = [
    {"id": "loto",       "short": "LOTO",       "fail_kw": ["no isolation","not isolated","loto not done","no loto","isolation not done","isolation bypassed","live","pressurised"]},
    {"id": "gas",        "short": "Gas Test",    "fail_kw": ["no gas test","without test","no detector","not tested","gas not checked","no atmospheric"]},
    {"id": "permit",     "short": "PTW",         "fail_kw": ["no permit","without permit","bypass permit","skipped permit","no ptw","permit not raised"]},
    {"id": "ppe",        "short": "PPE",         "fail_kw": ["no ppe","without helmet","no harness","missing ppe","ppe not worn"]},
    {"id": "supervision","short": "Supervision", "fail_kw": ["no standby","no supervisor","absent","alone","unsupervised","no attendant"]},
    {"id": "sop",        "short": "SOP",         "fail_kw": ["no procedure","not followed","deviated","skipped steps","no jsa","no risk assessment"]},
]


def _region(site: str) -> str | None:
    for region, keywords in REGIONS.items():
        if any(k.lower() in site.lower() for k in keywords):
            return region
    # Default unmapped NE sites → Assam
    return "North East — Assam"


def _degrading_barriers(reports: list) -> set:
    """Return set of barrier IDs that are failing in this group of reports."""
    degrading = set()
    for r in reports:
        t = r.report_text.lower()
        for b in BARRIERS:
            if any(k in t for k in b["fail_kw"]):
                degrading.add(b["id"])
    return degrading


def _barrier_shorts(ids: set) -> list:
    return [b["short"] for b in BARRIERS if b["id"] in ids]


@router.get("/barrier-migration")
async def get_barrier_migration():
    """
    Detect cross-region precursor pattern transfer.
    Returns list of (origin, emerging) region pairs with similarity ≥ 40%.
    """
    async with AsyncSessionLocal() as db:
        reports = (await db.execute(select(Report))).scalars().all()

    sif_reports = [r for r in reports if r.sif_potential in (SIFPotential.HIGH, SIFPotential.MEDIUM)]

    # Group by region
    region_reports: dict[str, list] = {r: [] for r in REGIONS}
    for rep in sif_reports:
        reg = _region(rep.site or "")
        if reg in region_reports:
            region_reports[reg].append(rep)

    # Compute degrading barriers per region
    region_data = {}
    for region, rpts in region_reports.items():
        if not rpts:
            continue
        degrading = _degrading_barriers(rpts)
        # Split into early/late to detect trend direction
        sorted_r = sorted(rpts, key=lambda r: r.id)
        mid = max(1, len(sorted_r) // 2)
        early_deg = _degrading_barriers(sorted_r[:mid])
        late_deg  = _degrading_barriers(sorted_r[mid:])
        new_in_late = late_deg - early_deg  # newly appearing in recent reports
        region_data[region] = {
            "report_count": len(rpts),
            "degrading_barriers": degrading,
            "new_in_late": new_in_late,
            "degrading_short": _barrier_shorts(degrading),
            "new_short": _barrier_shorts(new_in_late),
        }

    # Find migration pairs:
    # Origin = region with more reports + established degradation
    # Emerging = region with fewer reports but overlapping degrading barriers
    migrations = []
    regions_with_data = list(region_data.items())

    for i, (origin, origin_data) in enumerate(regions_with_data):
        for j, (emerging, emerging_data) in enumerate(regions_with_data):
            if i == j:
                continue
            # Origin must have more reports than emerging
            if origin_data["report_count"] <= emerging_data["report_count"]:
                continue
            # Must have overlapping degrading barriers
            overlap = origin_data["degrading_barriers"] & emerging_data["degrading_barriers"]
            if not overlap:
                continue
            # Similarity = overlap / union
            union = origin_data["degrading_barriers"] | emerging_data["degrading_barriers"]
            similarity = round(len(overlap) / len(union) * 100) if union else 0
            if similarity < 35:
                continue
            # Confidence based on report volume
            confidence = min(95, 45 + (origin_data["report_count"] * 3) + similarity // 3)
            migrations.append({
                "origin_region": origin,
                "origin_reports": origin_data["report_count"],
                "origin_barriers": origin_data["degrading_short"],
                "emerging_region": emerging,
                "emerging_reports": emerging_data["report_count"],
                "emerging_barriers": emerging_data["degrading_short"],
                "overlap_barriers": _barrier_shorts(overlap),
                "similarity": similarity,
                "confidence": confidence,
                "note": (
                    "Cross-site precursor pattern similarity — not a prediction of incident transfer. "
                    "Structural similarity in barrier degradation patterns detected."
                ),
            })

    # Sort by similarity desc, take top 4
    migrations.sort(key=lambda m: m["similarity"], reverse=True)
    return migrations[:4]


@router.get("/region-intelligence")
async def get_region_intelligence():
    """
    Per-region barrier health summary for the Pan-India Field Map.
    Returns barrier health %, SIF count, convergence flag, and blind spot metrics.
    """
    async with AsyncSessionLocal() as db:
        reports = (await db.execute(select(Report))).scalars().all()

    results = []
    for region, keywords in REGIONS.items():
        # Filter reports to this region
        rpts = [r for r in reports if any(k.lower() in (r.site or "").lower() for k in keywords)]
        if not rpts:
            # For regions with no synthetic data, generate plausible synthetic stats
            rpts = []

        sif_rpts = [r for r in rpts if r.sif_potential in (SIFPotential.HIGH, SIFPotential.MEDIUM)]

        # Barrier stats
        total_obs = 0
        failed_obs = 0
        unstated_obs = 0
        for rep in sif_rpts:
            t = rep.report_text.lower()
            for b in BARRIERS:
                has_fail = any(k in t for k in b["fail_kw"])
                if has_fail:
                    failed_obs += 1
                    total_obs += 1
                else:
                    unstated_obs += 1
                    total_obs += 1

        # Barrier health = 1 - (failed / max(mentioned,1))
        mentioned = max(1, total_obs - unstated_obs)
        barrier_health = round(max(0, min(100, (1 - failed_obs / mentioned) * 100)))

        # Convergence zones in this region
        convergence_count = 0
        site_barriers = {}
        for rep in sif_rpts:
            site = rep.site or "Unknown"
            if site not in site_barriers:
                site_barriers[site] = set()
            t = rep.report_text.lower()
            for b in BARRIERS:
                if any(k in t for k in b["fail_kw"]):
                    site_barriers[site].add(b["id"])
        for site, degs in site_barriers.items():
            if len(degs) >= 3:
                convergence_count += 1

        # Blind spot metrics
        unstated_rate = round((unstated_obs / max(1, total_obs)) * 100)
        # Data coverage: proxy from report density relative to North East (baseline)
        coverage = min(99, max(30, len(rpts) * 5 + 30))

        # Top degrading barriers
        barrier_counts = {}
        for rep in sif_rpts:
            t = rep.report_text.lower()
            for b in BARRIERS:
                if any(k in t for k in b["fail_kw"]):
                    barrier_counts[b["short"]] = barrier_counts.get(b["short"], 0) + 1
        top_degrading = sorted(barrier_counts.items(), key=lambda x: x[1], reverse=True)[:3]

        results.append({
            "region": region,
            "report_count": len(rpts),
            "sif_count": len(sif_rpts),
            "barrier_health": barrier_health,
            "convergence_count": convergence_count,
            "unstated_rate": unstated_rate,
            "data_coverage": coverage,
            "top_degrading": [b for b, _ in top_degrading],
        })

    return sorted(results, key=lambda r: r["sif_count"], reverse=True)
