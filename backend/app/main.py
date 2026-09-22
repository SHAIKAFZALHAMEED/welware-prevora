from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import pathlib

from app.db.database import init_db
from app.api import reports, classify, auth, dashboard, ingest, feedback, extras, demo, heatmap, geomap, barrier_health, barrier_detail, barrier_migration, site_intelligence
from app.db.seed import seed_database, force_reseed


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_database()
    yield


app = FastAPI(
    title="PREVORA — SIF Sentinel API",
    description=(
        "AI/NLP Safety Intelligence Platform for OIL UA/UC and Near-Miss Reports. "
        "Tiered classifier: Tier 1 DistilBERT (when model present) → Tier 2 Rule-Based Fallback."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ──────────────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Authentication"])
app.include_router(extras.router,    prefix="/api/v1/reports",   tags=["Reports — Phase 3"])  # must be before reports router
app.include_router(reports.router,   prefix="/api/v1/reports",   tags=["Reports"])
app.include_router(classify.router,  prefix="/api/v1/classify",  tags=["Classification"])
app.include_router(ingest.router,    prefix="/api/v1/ingest",    tags=["Ingest"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(feedback.router,  prefix="/api/v1/feedback",  tags=["Feedback / Active Learning"])
app.include_router(demo.router,      prefix="/api/v1/demo",      tags=["Demo / Phase 4"])
app.include_router(heatmap.router,   prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(geomap.router,        prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(barrier_health.router,    prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(barrier_detail.router,    prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(barrier_migration.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(site_intelligence.router, prefix="/api/v1/dashboard", tags=["Dashboard"])

# ── Serve built React frontend ──────────────────────────────────────────────
_DIST = pathlib.Path(__file__).parent.parent.parent / "frontend" / "dist"
if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # API routes are already handled above — this only catches unknown paths
        index = _DIST / "index.html"
        return FileResponse(str(index))


@app.get("/api/v1/benchmark/summary", tags=["Benchmark"])
async def benchmark_summary():
    """Layer 3 — External benchmark summary (OSHA/CSB/MSHA). NOT OIL data."""
    from app.data.external_benchmark import get_benchmark_summary
    return get_benchmark_summary()


@app.get("/api/v1/benchmark/records", tags=["Benchmark"])
async def benchmark_records(sif: str = None):
    """Layer 3 — External benchmark narratives for classifier validation."""
    from app.data.external_benchmark import EXTERNAL_BENCHMARK
    records = EXTERNAL_BENCHMARK
    if sif:
        records = [r for r in records if r["sif_expected"] == sif.upper()]
    return {
        "total": len(records),
        "data_note": "External benchmark — NOT OIL India Limited operational data.",
        "records": records,
    }


@app.get("/api/v1/data/oil-sites-metadata", tags=["Data Layers"])
async def oil_sites_metadata():
    """Layer 1 — OIL India Limited site location metadata."""
    import json, pathlib
    meta_path = pathlib.Path(__file__).parent / "data" / "oil_sites_metadata.json"
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": "PREVORA SIF Sentinel",
        "version": "2.0.0",
        "classifier": "TIER2_RULE_BASED",
        "tier1_ready": False,   # Set True when SIF_MODEL_PATH is configured
    }


@app.post("/api/v1/admin/reclassify-all", tags=["Admin"])
async def reclassify_all():
    """
    Batch re-classify all existing reports using current classifier.
    Use after updating the classifier model or weights.
    Phase 2 / Phase 4 utility endpoint.
    """
    from sqlalchemy import select
    from app.db.database import AsyncSessionLocal
    from app.models.report import Report, SIFPotential
    from app.nlp.dispatcher import dispatch_classify

    updated = 0
    errors = 0

    async with AsyncSessionLocal() as db:
        reports_list = (await db.execute(select(Report))).scalars().all()

        for r in reports_list:
            try:
                result = dispatch_classify(r.report_text)
                r.sif_potential = SIFPotential(result["sif_potential"])
                r.confidence = result["confidence"]
                r.rule_tags = ", ".join(result["rule_tags"])
                r.evidence_spans = " | ".join(result["evidence_spans"])
                r.counterfactual_delta = result["counterfactual_delta"]
                updated += 1
            except Exception:
                errors += 1

        await db.commit()

    return {
        "status": "complete",
        "updated": updated,
        "errors": errors,
        "classifier_tier": "TIER2_RULE_BASED",
    }


@app.post("/api/v1/admin/force-reseed", tags=["Admin"])
async def admin_force_reseed():
    """
    Drop all reports and re-seed with the expanded canonical dataset (~225 reports).
    WARNING: Deletes all existing reports. Development / demo-prep use only.
    """
    await force_reseed()
    from sqlalchemy import select, func
    from app.db.database import AsyncSessionLocal
    from app.models.report import Report
    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count()).select_from(Report))).scalar()
    return {
        "status": "reseeded",
        "total_reports": count,
        "layers": {
            "layer1": "35 canonical OIL narrative reports",
            "layer2": "~190 expanded synthetic reports (canonical site names)",
            "layer3": "External benchmark via /benchmark endpoints",
        },
        "demo_note": "SYNTHETIC DEMO — NOT LIVE OIL OPERATIONAL DATA",
    }
