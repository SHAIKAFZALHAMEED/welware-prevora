"""
Site Intelligence API
──────────────────────
Serves canonical per-site safety data from the single-source-of-truth
canonical_sites.py dataset. No report scanning — no contradictions.

All derived values (health, DNA, state, unstated rate) come from
derive_barrier() in canonical_sites.py applied to raw count tuples.
"""
from fastapi import APIRouter, HTTPException
from app.api.canonical_sites import get_site_record, CANONICAL_SITES, BARRIER_META

router = APIRouter()


@router.get("/site-intelligence")
async def get_site_intelligence(site: str):
    """
    Full site intelligence panel for a given site_id.
    Returns consistent barrier data, DNA scores, convergence reasoning,
    similar sites, and PREVORA insight — all from one canonical dataset.
    """
    # Accept either site_id (e.g. "moran") or full name (e.g. "Moran Compressor Station")
    site_id = site.lower().replace(" ", "_")

    # Direct ID match
    record = get_site_record(site_id)

    # Fallback: match by partial name
    if not record:
        for sid, raw in CANONICAL_SITES.items():
            if site.lower() in raw["name"].lower() or raw["name"].lower() in site.lower():
                record = get_site_record(sid)
                break

    if not record:
        raise HTTPException(status_code=404, detail=f"Site '{site}' not found in canonical dataset")

    return record


@router.get("/all-sites-summary")
async def get_all_sites_summary():
    """
    Summary of all 12 canonical sites for map marker coloring.
    Returns: site_id, name, region, barrier_health, degrading_count, convergence_count.
    Lightweight endpoint called once when the map loads.
    """
    results = []
    for site_id in CANONICAL_SITES:
        r = get_site_record(site_id)
        if r:
            results.append({
                "site_id": site_id,
                "name": r["site"],
                "region": r["region"],
                "barrier_health": r["barrier_health"],
                "degrading_count": r["degrading_count"],
                "convergence_count": r["convergence_count"],
                "high_sif": r["high_sif"],
                "data_coverage": r["data_coverage"],
            })
    return sorted(results, key=lambda x: x["barrier_health"])
