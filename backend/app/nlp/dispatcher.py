"""
Tiered Fallback NLP Dispatcher
================================
Tier 1: DistilBERT / RoBERTa fine-tuned (loads if model present)
Tier 2: Production rule-based SIF classifier (always available, zero-download)

Phase 2 adds:
- Dispatcher logic that checks for Tier 1 availability
- Confidence calibration blending
- Audit trail metadata (which tier was used)
"""
import os
from typing import Any
from app.nlp.classifier import classify_report as _rule_classify


_TIER1_AVAILABLE = False
_TIER1_PIPELINE = None
MODEL_PATH = os.environ.get("SIF_MODEL_PATH", "")

# Tier 1 labels expected from the HF pipeline (zero-shot or fine-tuned)
TIER1_LABEL_MAP = {
    "SIF-HIGH": "HIGH",
    "HIGH": "HIGH",
    "LABEL_2": "HIGH",
    "SIF-MEDIUM": "MEDIUM",
    "MEDIUM": "MEDIUM",
    "LABEL_1": "MEDIUM",
    "SIF-LOW": "LOW",
    "LOW": "LOW",
    "NON-SIF": "LOW",
    "LABEL_0": "LOW",
    "UNCERTAIN": "UNCERTAIN",
}


def _try_load_tier1() -> bool:
    """Attempt to load Tier 1 transformer pipeline. Silently falls back if unavailable."""
    global _TIER1_PIPELINE, _TIER1_AVAILABLE
    if not MODEL_PATH:
        return False
    try:
        from transformers import pipeline  # type: ignore
        _TIER1_PIPELINE = pipeline(
            "text-classification",
            model=MODEL_PATH,
            top_k=None,
            device=-1,          # CPU only for now
            truncation=True,
            max_length=512,
        )
        _TIER1_AVAILABLE = True
        print(f"[NLP] Tier 1 transformer loaded from: {MODEL_PATH}")
        return True
    except Exception as e:
        print(f"[NLP] Tier 1 not available ({e}), using Tier 2 rule-based classifier.")
        return False


def _classify_tier1(text: str) -> dict | None:
    """Run Tier 1 transformer inference and normalize output."""
    if not _TIER1_PIPELINE:
        return None
    try:
        results = _TIER1_PIPELINE(text[:512])[0]  # top_k=None returns list of dicts
        # Sort by score descending
        results = sorted(results, key=lambda x: x["score"], reverse=True)
        top = results[0]
        label = TIER1_LABEL_MAP.get(top["label"].upper(), "UNCERTAIN")
        confidence = round(top["score"], 3)
        return {
            "sif_potential": label,
            "confidence": confidence,
            "tier": "TRANSFORMER",
        }
    except Exception as e:
        print(f"[NLP] Tier 1 inference failed ({e}), falling back to Tier 2.")
        return None


def dispatch_classify(text: str) -> dict:
    """
    Main dispatcher: tries Tier 1 (transformer) first, falls back to Tier 2 (rules).
    Returns unified output dict compatible with the Report model.
    """
    tier1_result = _classify_tier1(text) if _TIER1_AVAILABLE else None

    # Tier 2: always runs (for evidence, rule tags, delta — even in Tier 1 mode)
    tier2_result = _rule_classify(text)

    if tier1_result:
        # Blend: Tier 1 owns the SIF tier + confidence; Tier 2 provides evidence + rules
        return {
            "sif_potential": tier1_result["sif_potential"],
            "confidence": tier1_result["confidence"],
            "rule_tags": tier2_result["rule_tags"],
            "evidence_spans": tier2_result["evidence_spans"],
            "counterfactual_delta": tier2_result["counterfactual_delta"],
            "classifier_tier": "TIER1_TRANSFORMER",
        }
    else:
        return {
            "sif_potential": tier2_result["sif_potential"],
            "confidence": tier2_result["confidence"],
            "rule_tags": tier2_result["rule_tags"],
            "evidence_spans": tier2_result["evidence_spans"],
            "counterfactual_delta": tier2_result["counterfactual_delta"],
            "classifier_tier": "TIER2_RULE_BASED",
        }


# Attempt to load Tier 1 at module import time (non-blocking)
_try_load_tier1()
