"""
Active Learning Feedback Engine
=================================
Tracks human-confirmed SIF classifications to:
1. Build a ground-truth audit trail
2. Derive keyword weight boost hints for the rule-based classifier
3. Expose statistics for Phase 4 confidence contextualization

Phase 4 upgrade: feed confirmed examples into LoRA fine-tuning of DistilBERT.
"""
from collections import defaultdict
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.report import Report, ReviewStatus, SIFPotential


class ActiveLearningEngine:
    """In-memory weight boost registry. Persists across requests (singleton)."""

    def __init__(self):
        self.confirmed_sif_keywords: dict[str, int] = defaultdict(int)
        self.confirmed_count = 0
        self.rejected_count = 0
        self.total_reviewed = 0

    async def refresh_from_db(self):
        """Re-build keyword frequency from all CONFIRMED_SIF reviews in DB."""
        import re
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(
                select(Report.report_text, Report.rule_tags).where(
                    Report.review_status == ReviewStatus.CONFIRMED_SIF
                )
            )).all()

        self.confirmed_sif_keywords.clear()
        for row in rows:
            # Tokenise report text into meaningful words
            words = re.findall(r'\b[a-z]{4,}\b', (row.report_text or "").lower())
            for word in words:
                self.confirmed_sif_keywords[word] += 1

        self.confirmed_count = len(rows)

    async def get_stats(self) -> dict:
        async with AsyncSessionLocal() as db:
            confirmed = (await db.execute(
                select(Report).where(Report.review_status == ReviewStatus.CONFIRMED_SIF)
            )).scalars().all()
            rejected = (await db.execute(
                select(Report).where(Report.review_status == ReviewStatus.REJECTED)
            )).scalars().all()
            total_reviewed = (await db.execute(
                select(Report).where(
                    Report.review_status != ReviewStatus.PENDING
                )
            )).scalars().all()

        # Rule accuracy by confirmed vs rejected
        rule_counts: dict[str, dict] = {}
        for r in confirmed:
            for tag in (r.rule_tags or "").split(","):
                tag = tag.strip()
                if not tag:
                    continue
                if tag not in rule_counts:
                    rule_counts[tag] = {"confirmed": 0, "rejected": 0}
                rule_counts[tag]["confirmed"] += 1
        for r in rejected:
            for tag in (r.rule_tags or "").split(","):
                tag = tag.strip()
                if tag in rule_counts:
                    rule_counts[tag]["rejected"] += 1

        top_keywords = sorted(
            self.confirmed_sif_keywords.items(), key=lambda x: x[1], reverse=True
        )[:15]

        return {
            "confirmed_sif_count": len(confirmed),
            "rejected_count": len(rejected),
            "total_reviewed": len(total_reviewed),
            "review_rate_pct": round(len(total_reviewed) / max(len(confirmed) + len(rejected) + 1, 1) * 100, 1),
            "rule_accuracy": rule_counts,
            "top_confirmed_keywords": [{"word": w, "freq": f} for w, f in top_keywords],
            "classifier_tier": "TIER2_RULE_BASED",
            "phase2_note": "DistilBERT Tier 1 upgrade ready when SIF_MODEL_PATH env var is set.",
        }

    def get_confidence_boost(self, text: str) -> float:
        """
        Returns a small confidence boost (0.0–0.08) if the report text
        contains words seen frequently in confirmed SIF cases.
        Used by the dispatcher for blended scoring in future phases.
        """
        import re
        words = set(re.findall(r'\b[a-z]{4,}\b', text.lower()))
        matches = sum(1 for w in words if self.confirmed_sif_keywords.get(w, 0) >= 3)
        return min(matches * 0.01, 0.08)


# Singleton
active_learning = ActiveLearningEngine()
