"""
Feedback / Active Learning API
================================
Exposes active learning statistics and triggers refresh.
Used by the dashboard's "Model Health" panel in Phase 3.
"""
from fastapi import APIRouter
from app.nlp.active_learning import active_learning

router = APIRouter()


@router.get("/stats")
async def get_feedback_stats():
    """
    Returns human-review statistics and active learning keyword frequency.
    Powers the 'Classifier Intelligence' panel on the dashboard.
    """
    await active_learning.refresh_from_db()
    return await active_learning.get_stats()


@router.post("/refresh")
async def refresh_active_learning():
    """Manually trigger a keyword frequency rebuild from confirmed SIF reviews."""
    await active_learning.refresh_from_db()
    return {"status": "refreshed", "confirmed_count": active_learning.confirmed_count}
