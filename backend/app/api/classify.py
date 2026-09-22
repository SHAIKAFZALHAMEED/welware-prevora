from fastapi import APIRouter
from pydantic import BaseModel
from app.nlp.dispatcher import dispatch_classify

router = APIRouter()


class ClassifyIn(BaseModel):
    report_text: str
    site: str = "Unknown"
    activity: str = "Unknown"


class ClassifyOut(BaseModel):
    sif_potential: str
    confidence: float
    rule_tags: list[str]
    evidence_spans: list[str]
    counterfactual_delta: int
    barrier_proximity_label: str


@router.post("/", response_model=ClassifyOut)
async def classify(body: ClassifyIn):
    """Classify a free-text safety report and return SIF intelligence."""
    result = dispatch_classify(body.report_text)

    delta = result["counterfactual_delta"]
    if delta == 1:
        barrier_label = "1 barrier from fatality — CRITICAL"
    elif delta == 2:
        barrier_label = "2 barriers from fatality — HIGH"
    elif delta == 3:
        barrier_label = "3 barriers from fatality — MODERATE"
    else:
        barrier_label = f"{delta} barriers from fatality — LOW PROXIMITY"

    return ClassifyOut(
        sif_potential=result["sif_potential"],
        confidence=result["confidence"],
        rule_tags=result["rule_tags"],
        evidence_spans=result["evidence_spans"],
        counterfactual_delta=delta,
        barrier_proximity_label=barrier_label,
    )
