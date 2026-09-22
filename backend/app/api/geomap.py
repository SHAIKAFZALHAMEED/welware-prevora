"""
Geo Map endpoint — OIL India Assam field coordinates.
Returns each site with lat/lng for map rendering.
"""
from fastapi import APIRouter
from sqlalchemy import select
from collections import Counter

from app.db.database import AsyncSessionLocal
from app.models.report import Report, SIFPotential

router = APIRouter()

# OIL India Assam field coordinates (approximate real locations)
SITE_COORDS = {
    "Rig-04":                         {"lat": 27.48, "lng": 95.22, "field": "Duliajan"},
    "Rig-09":                         {"lat": 27.51, "lng": 95.18, "field": "Duliajan"},
    "Rig-11":                         {"lat": 27.46, "lng": 95.31, "field": "Duliajan"},
    "Rig-12":                         {"lat": 27.52, "lng": 95.25, "field": "Duliajan"},
    "Well-W-17":                      {"lat": 27.38, "lng": 95.05, "field": "Moran"},
    "Well-W-23":                      {"lat": 27.35, "lng": 95.10, "field": "Moran"},
    "Well-W-31":                      {"lat": 27.33, "lng": 95.08, "field": "Moran"},
    "Jorhat Processing Plant":        {"lat": 26.75, "lng": 94.20, "field": "Jorhat"},
    "Tank Farm TF-03":                {"lat": 27.49, "lng": 95.19, "field": "Duliajan"},
    "Duliajan Tank Farm":             {"lat": 27.49, "lng": 95.21, "field": "Duliajan"},
    "Moran Compressor Station":       {"lat": 27.36, "lng": 95.07, "field": "Moran"},
    "Digboi Refinery":                {"lat": 27.38, "lng": 95.62, "field": "Digboi"},
    "CPF-2 Central Processing Facility": {"lat": 27.44, "lng": 95.15, "field": "Duliajan"},
    "CPF-1 Central Processing Facility": {"lat": 27.43, "lng": 95.13, "field": "Duliajan"},
    "Lakwa Field Station":            {"lat": 26.87, "lng": 94.72, "field": "Lakwa"},
    "GGS-09 Gas Gathering Station":   {"lat": 27.30, "lng": 95.02, "field": "Sivasagar"},
    "Digboi Facility":                {"lat": 27.38, "lng": 95.62, "field": "Digboi"},
    "Pump House P-3":                 {"lat": 27.47, "lng": 95.20, "field": "Duliajan"},
}

DEFAULT_COORD = {"lat": 27.40, "lng": 95.20, "field": "Assam"}


@router.get("/map-sites")
async def get_map_sites():
    """
    Returns all sites with coordinates, SIF counts, and density
    for rendering on the Assam field map.
    """
    async with AsyncSessionLocal() as db:
        reports = (await db.execute(select(Report))).scalars().all()

    site_data = {}
    for r in reports:
        if r.site not in site_data:
            coords = SITE_COORDS.get(r.site, DEFAULT_COORD)
            site_data[r.site] = {
                "site": r.site,
                "lat": coords["lat"],
                "lng": coords["lng"],
                "field": coords["field"],
                "total": 0, "high": 0, "medium": 0,
                "low": 0, "rule_tags": [],
            }
        s = site_data[r.site]
        s["total"] += 1
        if r.sif_potential == SIFPotential.HIGH:
            s["high"] += 1
        elif r.sif_potential == SIFPotential.MEDIUM:
            s["medium"] += 1
        else:
            s["low"] += 1
        if r.rule_tags:
            s["rule_tags"].extend([t.strip() for t in r.rule_tags.split(",") if t.strip()])

    # Compute density + top rule per site
    result = []
    for s in site_data.values():
        s["sif_density"] = round((s["high"] + s["medium"]) / s["total"], 2) if s["total"] else 0
        tag_counts = Counter(s["rule_tags"])
        s["top_rule"] = tag_counts.most_common(1)[0][0] if tag_counts else ""
        s["rule_tags"] = list(set(s["rule_tags"]))[:3]
        result.append(s)

    result.sort(key=lambda x: x["high"], reverse=True)
    return result
