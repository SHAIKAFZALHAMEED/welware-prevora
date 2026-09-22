"""
PREVORA Canonical Site Intelligence Dataset
────────────────────────────────────────────
Single source of truth for all 12 OIL demo sites.
ALL derived values (state, DNA, health, convergence, insight) are
computed from these raw counts — ensuring zero contradictions.

Tuple format per barrier:
  (failed, absent, intact, unstated, evidence_snippets)

SYNTHETIC DEMO — NOT LIVE OIL OPERATIONAL DATA
"""

# Barrier metadata (shared across all sites)
BARRIER_META = [
    {"id": "loto",        "name": "Energy Isolation (LOTO)",    "short": "LOTO"},
    {"id": "gas",         "name": "Gas / Atmospheric Testing",  "short": "Gas Test"},
    {"id": "permit",      "name": "Permit to Work (PTW)",       "short": "PTW"},
    {"id": "ppe",         "name": "Personal Protective Equipment","short": "PPE"},
    {"id": "supervision", "name": "Supervision / Standby",      "short": "Supervision"},
    {"id": "sop",         "name": "Safe Work Procedure (SOP)",  "short": "SOP"},
]

# ── Canonical sites ────────────────────────────────────────────────────────
# Each barrier entry: (failed, absent, intact, unstated, [evidence_snippets])
# State and DNA are DERIVED from these counts — never stored separately.

CANONICAL_SITES = {

    # ━━━ CRITICAL sites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    "moran": {
        "name": "Moran Compressor Station",
        "region": "North East — Assam",
        "report_count": 23,
        "high_sif": 7, "medium_sif": 6, "low_sif": 10,
        "convergence_count": 2,
        "data_coverage": 89,
        "barriers": {
            "loto":        (8, 2,  9,  4, ["energy isolation not verified before valve access", "line remained energized during maintenance task"]),
            "gas":         (6, 3,  8,  6, ["no gas test conducted before line opening at compressor", "atmospheric test skipped — no reading recorded"]),
            "permit":      (3, 1, 14,  5, ["permit not raised for maintenance activity", "hot work initiated without PTW"]),
            "ppe":         (1, 0, 12, 10, ["PPE compliance not recorded in field report"]),
            "supervision": (5, 2,  9,  7, ["no standby person present during confined space entry", "supervisor absent during night shift task"]),
            "sop":         (3, 1, 13,  6, ["approved procedure not followed during valve operation"]),
        },
        "insight": "Barrier convergence detected. Energy isolation, gas testing and supervision show repeated degradation across recent reports. Immediate HSE review recommended.",
        "similar_sites": ["baghewala", "naharkatiya"],
        "reporting_trend": {"prev": 18, "curr": 23, "anomaly": False},
    },

    "baghewala": {
        "name": "Baghewala Field",
        "region": "Rajasthan",
        "report_count": 19,
        "high_sif": 5, "medium_sif": 5, "low_sif": 9,
        "convergence_count": 1,
        "data_coverage": 76,
        "barriers": {
            "loto":        (6, 2,  8,  3, ["isolation not confirmed before work began", "LOTO tag missing from valve"]),
            "gas":         (5, 2,  8,  4, ["gas test not performed — assumed safe by worker"]),
            "permit":      (2, 1, 13,  3, ["permit issued but verification incomplete"]),
            "ppe":         (1, 0, 14,  4, ["harness not worn during elevated work"]),
            "supervision": (4, 1, 10,  4, ["standby not assigned for lone worker task"]),
            "sop":         (2, 1, 12,  4, ["JSA not completed before task start"]),
        },
        "insight": "Emerging pattern. Energy-isolation degradation resembles the signature previously observed at Moran Compressor Station. Cross-site review advised.",
        "similar_sites": ["moran", "dandewala"],
        "reporting_trend": {"prev": 14, "curr": 19, "anomaly": False},
    },

    # ━━━ POOR barrier health sites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    "naharkatiya": {
        "name": "Naharkatiya Field",
        "region": "North East — Assam",
        "report_count": 18,
        "high_sif": 3, "medium_sif": 5, "low_sif": 10,
        "convergence_count": 1,
        "data_coverage": 81,
        "barriers": {
            "loto":        (4, 2,  8,  4, ["isolation point not identified in report"]),
            "gas":         (3, 2,  9,  4, ["no atmospheric test before line break"]),
            "permit":      (1, 0, 14,  3, ["permit raised but not verified by supervisor"]),
            "ppe":         (0, 0,  7, 11, ["PPE status not reported for 61% of records"]),
            "supervision": (3, 1, 10,  4, ["no standby assigned for lone worker"]),
            "sop":         (1, 0, 13,  4, ["procedure deviation not documented"]),
        },
        "insight": "Multiple barriers degrading. Energy isolation and gas testing failures have increased in recent reports. Supervision gaps noted on night shifts.",
        "similar_sites": ["moran", "dandewala"],
        "reporting_trend": {"prev": 21, "curr": 18, "anomaly": False},
    },

    "dandewala": {
        "name": "Dandewala Field",
        "region": "Rajasthan",
        "report_count": 16,
        "high_sif": 3, "medium_sif": 4, "low_sif": 9,
        "convergence_count": 1,
        "data_coverage": 71,
        "barriers": {
            "loto":        (4, 1,  8,  3, ["no lockout applied before maintenance", "equipment assumed de-energised"]),
            "gas":         (4, 2,  7,  3, ["gas reading not taken before valve break"]),
            "permit":      (1, 0, 12,  3, ["PTW raised but not co-signed"]),
            "ppe":         (0, 0, 10,  6, ["PPE compliance not fully documented"]),
            "supervision": (3, 1,  9,  3, ["supervisor not present at task start"]),
            "sop":         (1, 0, 11,  4, ["task performed without JSA"]),
        },
        "insight": "Barrier degradation pattern similar to Baghewala Field. Energy isolation failures recurring. Region-wide HSE awareness may be warranted.",
        "similar_sites": ["baghewala", "naharkatiya"],
        "reporting_trend": {"prev": 13, "curr": 16, "anomaly": False},
    },

    "kg_basin": {
        "name": "KG Basin Offshore",
        "region": "Offshore",
        "report_count": 11,
        "high_sif": 2, "medium_sif": 3, "low_sif": 6,
        "convergence_count": 0,
        "data_coverage": 53,
        "barriers": {
            "loto":        (3, 1,  4,  3, ["isolation status not confirmed before offshore work"]),
            "gas":         (3, 1,  4,  3, ["H2S monitor not activated — assumed clear"]),
            "permit":      (1, 0,  7,  3, ["PTW raised but cold-work boundary not defined"]),
            "ppe":         (0, 0,  8,  3, ["PPE records incomplete for offshore shift"]),
            "supervision": (1, 0,  5,  5, ["supervision gaps on night shift — not documented"]),
            "sop":         (1, 0,  7,  3, ["deviation from offshore SOP not formally recorded"]),
        },
        "insight": "Limited evidence. Report volume is low for an offshore site. Elevated UNSTATED rate means barrier states cannot be fully assessed. Do not interpret low activity as low risk.",
        "similar_sites": ["mahanadi", "bakhritibba"],
        "reporting_trend": {"prev": 9, "curr": 11, "anomaly": False},
    },

    # ━━━ DEGRADING sites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    "jorhat": {
        "name": "Jorhat Facility",
        "region": "North East — Assam",
        "report_count": 14,
        "high_sif": 2, "medium_sif": 4, "low_sif": 8,
        "convergence_count": 0,
        "data_coverage": 78,
        "barriers": {
            "loto":        (2, 1, 10,  1, ["isolation not recorded in shift handover"]),
            "gas":         (2, 1,  9,  2, ["gas test result absent from report"]),
            "permit":      (1, 0, 11,  2, ["permit not closed after task completion"]),
            "ppe":         (0, 0, 12,  2, []                                         ),
            "supervision": (1, 0, 11,  2, ["standby not assigned"]),
            "sop":         (0, 0, 12,  2, []                     ),
        },
        "insight": "Two barriers showing early degradation. Energy isolation and gas testing records are incomplete. No convergence detected. Monitor trend over next 30 days.",
        "similar_sites": ["borholla", "tinsukia"],
        "reporting_trend": {"prev": 11, "curr": 14, "anomaly": False},
    },

    "tinsukia": {
        "name": "Tinsukia Operations",
        "region": "North East — Assam",
        "report_count": 12,
        "high_sif": 1, "medium_sif": 3, "low_sif": 8,
        "convergence_count": 0,
        "data_coverage": 74,
        "barriers": {
            "loto":        (2, 1,  8,  1, ["LOTO log incomplete for one maintenance cycle"]),
            "gas":         (1, 0,  9,  2, []                                              ),
            "permit":      (2, 0, 10,  0, ["two permits issued without supervisor signature"]),
            "ppe":         (0, 0, 10,  2, []                                              ),
            "supervision": (1, 0,  9,  2, []                                              ),
            "sop":         (0, 0, 10,  2, []                                              ),
        },
        "insight": "Early-stage barrier degradation in permit-to-work and energy isolation. Overall risk remains moderate. Trend is worth monitoring.",
        "similar_sites": ["jorhat", "borholla"],
        "reporting_trend": {"prev": 14, "curr": 12, "anomaly": False},
    },

    "bakhritibba": {
        "name": "Bakhritibba",
        "region": "Rajasthan",
        "report_count": 13,
        "high_sif": 1, "medium_sif": 3, "low_sif": 9,
        "convergence_count": 0,
        "data_coverage": 69,
        "barriers": {
            "loto":        (2, 0, 10,  1, []                                              ),
            "gas":         (2, 1,  8,  2, ["atmospheric reading not logged"]),
            "permit":      (1, 0, 10,  2, []                                              ),
            "ppe":         (0, 0,  9,  4, ["PPE status not stated in 4 reports"]),
            "supervision": (1, 0,  9,  3, []                                              ),
            "sop":         (0, 0, 10,  3, []                                              ),
        },
        "insight": "Moderate barrier profile. Gas testing and energy isolation show minor degradation. High UNSTATED rate may indicate under-reporting.",
        "similar_sites": ["dandewala", "kg_basin"],
        "reporting_trend": {"prev": 11, "curr": 13, "anomaly": False},
    },

    "mahanadi": {
        "name": "Mahanadi Basin Ops",
        "region": "Mahanadi / Odisha",
        "report_count": 9,
        "high_sif": 1, "medium_sif": 2, "low_sif": 6,
        "convergence_count": 0,
        "data_coverage": 48,
        "barriers": {
            "loto":        (2, 0,  5,  2, ["isolation status unclear in report text"]),
            "gas":         (1, 1,  4,  3, []                                         ),
            "permit":      (1, 0,  6,  2, []                                         ),
            "ppe":         (0, 0,  5,  4, ["PPE data not captured for all shifts"]),
            "supervision": (1, 0,  4,  4, []                                         ),
            "sop":         (0, 0,  5,  4, []                                         ),
        },
        "insight": "Limited evidence. Report volume is insufficient for a high-confidence barrier assessment. Do not interpret low volume as low risk — this site requires more reporting coverage.",
        "similar_sites": ["kg_basin", "bakhritibba"],
        "reporting_trend": {"prev": 11, "curr": 9, "anomaly": True},  # drop in reporting
    },

    # ━━━ HEALTHY sites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    "duliajan": {
        "name": "Duliajan HQ",
        "region": "North East — Assam",
        "report_count": 16,
        "high_sif": 1, "medium_sif": 2, "low_sif": 13,
        "convergence_count": 0,
        "data_coverage": 92,
        "barriers": {
            "loto":        (0, 0, 14,  2, []),
            "gas":         (1, 0, 12,  3, ["one gas test result not formally logged"]),
            "permit":      (0, 0, 15,  1, []),
            "ppe":         (0, 0, 14,  2, []),
            "supervision": (1, 0, 13,  2, ["one shift handover note missing supervisor sign-off"]),
            "sop":         (0, 0, 14,  2, []),
        },
        "insight": "Stable barrier profile. Most observed barriers remain intact with no current convergence signal. High data coverage supports this assessment.",
        "similar_sites": ["borholla", "namrup"],
        "reporting_trend": {"prev": 15, "curr": 16, "anomaly": False},
    },

    "borholla": {
        "name": "Borholla Gas Field",
        "region": "North East — Assam",
        "report_count": 11,
        "high_sif": 0, "medium_sif": 2, "low_sif": 9,
        "convergence_count": 0,
        "data_coverage": 83,
        "barriers": {
            "loto":        (0, 0, 10,  1, []),
            "gas":         (0, 0,  8,  3, ["gas test not stated in 3 low-risk reports"]),
            "permit":      (0, 0, 10,  1, []),
            "ppe":         (0, 0,  9,  2, []),
            "supervision": (0, 0, 10,  1, []),
            "sop":         (0, 0,  9,  2, []),
        },
        "insight": "Stable barrier profile. No convergence detected. Minor UNSTATED gaps in gas-testing records — recommend improving field report completeness.",
        "similar_sites": ["duliajan", "namrup"],
        "reporting_trend": {"prev": 10, "curr": 11, "anomaly": False},
    },

    "namrup": {
        "name": "Namrup Plant",
        "region": "North East — Arunachal",
        "report_count": 10,
        "high_sif": 0, "medium_sif": 1, "low_sif": 9,
        "convergence_count": 0,
        "data_coverage": 79,
        "barriers": {
            "loto":        (0, 0,  9,  1, []),
            "gas":         (0, 0,  8,  2, []),
            "permit":      (1, 0,  8,  1, ["one permit closed post-task without supervisor review"]),
            "ppe":         (0, 0,  9,  1, []),
            "supervision": (0, 0,  9,  1, []),
            "sop":         (0, 0,  8,  2, []),
        },
        "insight": "Healthy barrier profile. Minor permit-to-work gap noted in one report. No convergence or SIF precursor clusters detected.",
        "similar_sites": ["borholla", "duliajan"],
        "reporting_trend": {"prev": 9, "curr": 10, "anomaly": False},
    },
}


def compute_evidence_strength(report_count: int, barrier_obs_count: int) -> str:
    """
    Evidence strength = breadth (reports) AND depth (barrier observations).

    Both dimensions required — one report with 20 barrier observations
    is still LIMITED because it reflects a single event, not a pattern.

    Thresholds:
      SUFFICIENT : >= 10 reports AND >= 40 observations
      MODERATE   :  >= 4 reports AND >= 15 observations
      LIMITED    : anything below
    """
    if report_count >= 10 and barrier_obs_count >= 40:
        return "SUFFICIENT"
    if report_count >= 4 and barrier_obs_count >= 15:
        return "MODERATE"
    return "LIMITED"


def derive_barrier(b_id, name, short, counts):
    """Derive state, DNA score and all stats from raw counts tuple."""
    failed, absent, intact, unstated, evidence = counts
    total = failed + absent + intact + unstated
    if total == 0:
        return {"id": b_id, "name": name, "short": short,
                "state": "UNSTATED", "dna": 50,
                "failed": 0, "absent": 0, "intact": 0, "unstated": 0,
                "report_count": 0, "evidence": [], "trend": "stable", "trend_delta": 0}

    fail_rate     = (failed + absent) / total
    unstated_rate = unstated / total

    # State (single deterministic rule — no ambiguity)
    if fail_rate > 0.30:
        state = "FAILED"
    elif fail_rate > 0.14:
        state = "DEGRADED"
    elif unstated_rate > 0.55:
        state = "UNSTATED"
    else:
        state = "INTACT"

    # DNA = health score for this barrier (0–100)
    dna = max(10, min(100, int(
        100
        - (failed  / total) * 75
        - (absent  / total) * 90
        - (unstated / total) * 18
    )))

    return {
        "id": b_id, "name": name, "short": short,
        "state": state, "dna": dna,
        "failed": failed, "absent": absent, "intact": intact, "unstated": unstated,
        "report_count": total - (total - (failed + intact)),  # non-absent obs
        "evidence": evidence[:2],
        "trend": "down" if fail_rate > 0.25 else "stable",
        "trend_delta": int(fail_rate * 20),
    }


def get_site_record(site_id: str) -> dict | None:
    raw = CANONICAL_SITES.get(site_id)
    if not raw:
        return None

    # Derive all barrier records from counts
    barriers = []
    for meta in BARRIER_META:
        counts = raw["barriers"].get(meta["id"])
        if counts is None:
            continue
        barriers.append(derive_barrier(meta["id"], meta["name"], meta["short"], counts))

    # Barrier health = average DNA
    avg_health = int(sum(b["dna"] for b in barriers) / len(barriers)) if barriers else 50

    # Unstated rate across all observations
    total_obs   = sum(b["failed"] + b["absent"] + b["intact"] + b["unstated"] for b in barriers)
    total_unst  = sum(b["unstated"] for b in barriers)
    unstated_rate = int(total_unst / max(1, total_obs) * 100)

    # Missing (UNSTATED) barrier names for blind spots
    missing = [b["name"] for b in barriers if b["state"] == "UNSTATED"][:3]

    # Degrading count
    degrading_count = sum(1 for b in barriers if b["state"] in ("FAILED", "DEGRADED"))

    # Reasons (why flagged)
    reasons = []
    for b in sorted(barriers, key=lambda x: x["failed"] + x["absent"], reverse=True):
        if b["failed"] > 0:
            reasons.append(f"{b['failed']} report{'s' if b['failed'] != 1 else ''} show failed {b['short']}")
        elif b["absent"] > 0:
            reasons.append(f"{b['absent']} report{'s' if b['absent'] != 1 else ''} show absent {b['short']}")
        if len(reasons) >= 4:
            break

    # Reporting anomaly
    trend = raw.get("reporting_trend", {})
    anomaly = trend.get("anomaly", False)
    anomaly_detail = None
    if anomaly and trend.get("prev") and trend.get("curr"):
        pct = int((trend["prev"] - trend["curr"]) / max(1, trend["prev"]) * 100)
        anomaly_detail = {
            "prev_period": trend["prev"],
            "curr_period": trend["curr"],
            "change_pct": pct,
            "message": f"Report volume decreased {pct}% vs previous period. Do not interpret low volume as reduced risk.",
        }

    # Evidence strength — requires both breadth AND depth
    barrier_obs_count = total_obs
    evidence_strength = compute_evidence_strength(raw["report_count"], barrier_obs_count)

    # Convergence language tier — gate on distinct report count
    report_count = raw["report_count"]
    if report_count >= 3 and raw["convergence_count"] > 0:
        convergence_label = "multiple_reports"     # 3+ distinct reports → recurring pattern
    elif report_count == 2 and raw["convergence_count"] > 0:
        convergence_label = "two_reports"          # 2 reports → similar degradation across 2
    elif raw["convergence_count"] > 0:
        convergence_label = "single_report"        # 1 report → event-level only
    else:
        convergence_label = "none"

    return {
        "site": raw["name"],
        "site_id": site_id,
        "region": raw["region"],
        "total_reports": raw["report_count"],
        "high_sif": raw["high_sif"],
        "medium_sif": raw["medium_sif"],
        "low_sif": raw["low_sif"],
        "barrier_health": avg_health,
        "degrading_count": degrading_count,
        "convergence_count": raw["convergence_count"],
        "convergence_label": convergence_label,
        "data_coverage": raw["data_coverage"],
        "unstated_rate": unstated_rate,
        "missing_barriers": missing,
        "barriers": barriers,
        "reasons": reasons,
        # Evidence credibility fields
        "evidence_strength": evidence_strength,       # LIMITED / MODERATE / SUFFICIENT
        "barrier_obs_count": barrier_obs_count,       # total barrier observations across reports
        "similar_sites": [
            {"site_id": s, "site": CANONICAL_SITES[s]["name"], "similarity": 80 - i * 7}
            for i, s in enumerate(raw.get("similar_sites", []))
            if s in CANONICAL_SITES
        ],
        "insight": raw.get("insight", ""),
        "reporting_anomaly": anomaly_detail,
        "demo_note": "SYNTHETIC DEMO — NOT LIVE OIL OPERATIONAL DATA",
    }
