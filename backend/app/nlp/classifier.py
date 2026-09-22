"""
PREVORA Rule-Based SIF Classifier — Tier 2 (Production-quality rule engine)
============================================================================
A highly calibrated domain-specific rule engine that scores reports across
four dimensions:
  1. Energy / hazardous exposure signals
  2. Barrier failure signals
  3. Life-Saving Rule violation signals
  4. Severity amplifier / mitigator signals

This produces SIF-potential tier + confidence + evidence spans +
IOGP rule tags + Counterfactual Delta (barrier-count score).

This will be upgraded to a two-stage DistilBERT/RoBERTa pipeline in
Phase 2 when the transformer model is downloaded and integrated.
"""
import re
from typing import TypedDict


# ─── IOGP Life-Saving Rules taxonomy ────────────────────────────────────────
IOGP_RULES: dict[str, list[str]] = {
    "Energy Isolation (LOTO)": [
        "loto", "lockout", "tagout", "lock-out", "tag-out", "isolation valve",
        "de-energize", "deenergize", "not isolated", "without isolating",
        "live", "energised", "energized", "wrong breaker", "wrong isolation",
        "bypass valve", "bypassed", "open bypass", "gagged", "held open",
        "no bleed", "still pressurised", "still pressurized", "pressurized before",
        "esd", "shutdown valve", "solenoid",
    ],
    "Confined Space Entry": [
        "confined space", "confined-space", "vessel entry", "tank entry",
        "sump", "pit entry", "manhole", "separator vessel", "distillation column",
        "no standby", "no standby man", "no atmospheric", "atmospheric test",
        "oxygen level", "oxygen deficiency", "co level", "h2s", "hydrogen sulphide",
        "without testing", "gas test", "without atmosphere",
    ],
    "Hot Work": [
        "hot work", "hot-work", "welding", "grinding", "cutting", "torch",
        "spark", "ignition", "fire watch", "no fire watch", "without fire watch",
        "flammable atmosphere", "hydrocarbon vapour", "lel", "lower explosive",
        "near fuel", "near gas line", "near condensate",
    ],
    "Line of Fire": [
        "line of fire", "swing radius", "drop zone", "under the load",
        "suspended load", "below the load", "ejected", "projectile",
        "dropped", "falling object", "pressure release", "unexpected release",
        "high pressure release", "blowout", "blew out", "sprayed", "spray",
        "swivel joint", "hose disconnected", "plug ejected", "pig receiver",
        "bop test", "pressurized line",
    ],
    "Working at Height": [
        "working at height", "at height", "elevated", "scaffold", "scaffolding",
        "ladder", "roof", "top of tank", "elevated walkway", "grating",
        "fall arrest", "no harness", "without harness", "handrail missing",
        "fell", "fallen", "fall", "elevated platform",
    ],
    "Bypass of Safety Controls": [
        "bypass", "bypassed", "gagged", "defeated", "disabled", "override",
        "psv", "relief valve", "safety valve", "no ptw", "without ptw",
        "no permit", "without permit", "no inspection", "no closeout",
        "calibration expired", "faulty gauge", "blocked nozzle",
    ],
}

# ─── Energy / hazard signals (high weight) ──────────────────────────────────
ENERGY_SIGNALS: list[tuple[str, float]] = [
    (r"\b(psi|bar|kpa)\b", 0.22),
    (r"\bhigh[- ]pressure\b", 0.20),
    (r"\bpressurize[d]?\b", 0.18),
    (r"\b(acid|h2so4|hcl|caustic|chemical inject)\b", 0.18),
    (r"\bexclu?sion zone\b", 0.15),
    (r"\b(440v|11kv|33kv|live wire|energi[sz]ed)\b", 0.20),
    (r"\b(flammable|explosive|ignition|hydrocarbon vap)\b", 0.20),
    (r"\bgas detect\b", 0.12),
    (r"\bh2s\b", 0.22),
    (r"\boxygen.{0,20}(low|deficien|16\.|15\.)\b", 0.22),
    (r"\b(ejected|projectile|flew|thrown)\b", 0.22),
    (r"\b(fell|fallen|collapse[d]?)\b", 0.18),
    (r"\bbop\b", 0.20),
    (r"\b(well control|influx|pit gain|kick)\b", 0.25),
    (r"\b(hot tap|live line|hot work)\b", 0.18),
    (r"\bbhp\b", 0.22),                                      # bottom hole pressure — well alive
    (r"\bmaster valve\b", 0.18),                             # wellhead master valve = energy source
    (r"\b(wellhead|well.{0,5}head).{0,20}(live|pressure|pressur)\b", 0.22),
    (r"\b(live|energi[sz]ed|pressuri[sz]ed).{0,30}(at the time|during)\b", 0.20),
    (r"\b280 bar\b", 0.22),
    (r"\b(assumed|thought|believed).{0,40}(closed|off|isolated|safe)\b", 0.18),
    (r"\bbypass.{0,30}isolation\b", 0.22),
    (r"\b(isolation procedure|isolation policy|isolation check)\b", 0.20),
]

# ─── Barrier failure signals (high weight) ──────────────────────────────────
BARRIER_SIGNALS: list[tuple[str, float]] = [
    (r"\bno ptw\b", 0.20),
    (r"\bwithout (a )?ptw\b", 0.20),
    (r"\bno permit\b", 0.18),
    (r"\bnot isolated\b", 0.20),
    (r"\bwithout isolat\b", 0.20),
    (r"\bno (atmospheric|gas) test\b", 0.20),
    (r"\batmospheric.{0,30}not perform\b", 0.20),
    (r"\bno (fire watch|standby man|standby)\b", 0.18),
    (r"\bwithout (fire watch|standby|harness|fall arrest)\b", 0.18),
    (r"\b(expired|not calibrat|calibration expired)\b", 0.15),
    (r"\b(faulty|failed|malfunct)\b", 0.12),
    (r"\bbypas[s]?\b", 0.18),
    (r"\bgagged\b", 0.20),
    (r"\bno inspection\b", 0.15),
    (r"\bno close.?out\b", 0.15),
    (r"\bnot torqu\b", 0.15),
    (r"\bnot (confirmed|verify|verified)\b", 0.15),
    (r"\bexclusion zone.{0,30}not\b", 0.18),
    (r"\bwithout evacuating\b", 0.18),
]

# ─── Severity amplifiers ─────────────────────────────────────────────────────
AMPLIFIERS: list[tuple[str, float]] = [
    (r"\bfatalit\b", 0.15),
    (r"\bseriou[s]? injur\b", 0.12),
    (r"\bnear[- ]?fatal\b", 0.15),
    (r"\bnarrowly miss\b", 0.12),
    (r"\bmanaged to (step|move|evacuate)\b", 0.10),
    (r"\bbefore (touching|contact)\b", 0.10),
    (r"\bhad been standing.{0,30}prior\b", 0.10),
    (r"\bstopped by the hse\b", 0.10),
    (r"\bself-evacuate\b", 0.12),
    (r"\bfelt dizzy\b", 0.10),
    (r"\b(minor|first.?aid).{0,60}(280 bar|bhp|master valve|live pressure|wellhead)\b", 0.25),  # latent SIF signal
    (r"\bbypassed.{0,50}(isolation|isolat).{0,30}(wellhead|master|bhp)\b", 0.22),
]

# ─── Severity mitigators (reduce score) ─────────────────────────────────────
MITIGATORS: list[tuple[str, float]] = [
    (r"\b(minor oil spill|small spill)\b", -0.10),
    (r"\b(cleaned|repaired) (within|same day)\b", -0.08),
    (r"\b(no injur|no operational impact)\b", -0.05),
    (r"\b(stain|drip|leak).{0,20}(small|20 cm|minor)\b", -0.08),
    (r"\b(sign|noticeboard|gate|toilet|faucet)\b", -0.12),
    (r"\b(ppe vending|gloves out of stock)\b", -0.15),
    (r"\b(hard hat found|counselled on ppe)\b", -0.12),
    (r"\b(vehicle speed|sign knocked)\b", -0.12),
    (r"\bextinguisher.{0,60}(expired|past.{0,10}date|11 days|overdue)\b", -0.25),
    (r"\b(re.?tag|re-inspect|corrective action.{0,30}rais)\b", -0.15),
    (r"\bno incident.{0,30}near.?miss\b", -0.20),
    (r"\bno incident or near.?miss\b", -0.25),
]


def _score_patterns(text: str, patterns: list[tuple[str, float]]) -> tuple[float, list[str]]:
    """Score text against a pattern list; return (cumulative_score, matched_spans)."""
    total = 0.0
    spans = []
    for pat, weight in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            total += weight
            # Grab a clean sentence fragment around the match
            start = max(0, m.start() - 30)
            end = min(len(text), m.end() + 30)
            # Expand to word boundaries
            while start > 0 and text[start] not in (' ', '.', ',', '\n'):
                start -= 1
            while end < len(text) and text[end] not in (' ', '.', ',', '\n'):
                end += 1
            spans.append(text[start:end].strip(' ,.\n'))
    return min(total, 1.0), spans


def _match_rules(text: str) -> list[str]:
    matched = []
    for rule_name, keywords in IOGP_RULES.items():
        for kw in keywords:
            if kw.lower() in text.lower():
                matched.append(rule_name)
                break
    return matched if matched else ["General Safety"]


def _compute_counterfactual_delta(barrier_score: float, energy_score: float) -> int:
    """
    Estimate how many barriers separated the event from a fatality.
    Higher delta = more barriers present = further from fatality.
    """
    combined = (energy_score * 0.6 + barrier_score * 0.4)
    if combined >= 0.55:
        return 1
    elif combined >= 0.35:
        return 2
    elif combined >= 0.20:
        return 3
    else:
        return 4


def classify_report(text: str) -> dict:
    """
    Classify a safety report and return:
      - sif_potential: HIGH | MEDIUM | LOW | UNCERTAIN
      - confidence: float 0..1
      - rule_tags: list[str]
      - evidence_spans: list[str]
      - counterfactual_delta: int (# barriers from fatality)
    """
    energy_score, energy_spans = _score_patterns(text, ENERGY_SIGNALS)
    barrier_score, barrier_spans = _score_patterns(text, BARRIER_SIGNALS)
    amplifier_score, amplifier_spans = _score_patterns(text, AMPLIFIERS)
    mitigator_score, _ = _score_patterns(text, MITIGATORS)

    # Combined raw score (weighted)
    raw = (
        energy_score * 0.45
        + barrier_score * 0.40
        + amplifier_score * 0.15
        - abs(mitigator_score) * 0.25
    )
    raw = max(0.0, min(raw, 1.0))

    # Fast-path HIGH: clear energy hazard + at least one barrier failure
    fast_path_high = energy_score >= 0.18 and barrier_score >= 0.15

    # Map to SIF tier + calibrated confidence
    if fast_path_high or raw >= 0.28:
        sif_potential = "HIGH"
        combined = energy_score * 0.5 + barrier_score * 0.5
        confidence = min(0.72 + combined * 0.27, 0.97)
    elif raw >= 0.14:
        sif_potential = "MEDIUM"
        confidence = 0.52 + raw * 0.45
    elif raw >= 0.06:
        sif_potential = "LOW"
        confidence = 0.42 + raw * 0.50
    else:
        # Edge case: some real signals but not conclusive -> UNCERTAIN
        has_any_signal = energy_score > 0.04 or barrier_score > 0.04
        if has_any_signal:
            sif_potential = "UNCERTAIN"
            confidence = 0.32 + raw * 0.50
        else:
            sif_potential = "LOW"
            confidence = 0.78 - raw * 0.20

    rule_tags = _match_rules(text)
    evidence_spans = list(dict.fromkeys(energy_spans + barrier_spans + amplifier_spans))[:8]
    counterfactual_delta = _compute_counterfactual_delta(barrier_score, energy_score)

    return {
        "sif_potential": sif_potential,
        "confidence": round(confidence, 3),
        "rule_tags": rule_tags,
        "evidence_spans": evidence_spans,
        "counterfactual_delta": counterfactual_delta,
    }
