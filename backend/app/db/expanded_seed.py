"""
PREVORA Expanded Synthetic Dataset — 500+ OIL Demonstration Reports
────────────────────────────────────────────────────────────────────
Site names aligned to canonical_sites.py for consistency across:
  - Map intelligence panel (barrier counts, DNA scores)
  - Priority queue (filterable by site)
  - Heatmap and trend analysis
  - Barrier Health matrix

Distribution: weighted by canonical site profiles
  - Critical sites (Moran, Baghewala): more HIGH SIF reports
  - Healthy sites (Duliajan, Borholla): more LOW / INTACT reports
  - Limited-data sites (KG Basin, Mahanadi): fewer reports

SYNTHETIC DEMO — NOT LIVE OIL OPERATIONAL DATA
"""
import random
from datetime import datetime, timedelta

# ── Site reporting weights (matches canonical_sites.py counts) ────────────────
SITE_REPORT_TARGETS = {
    "Moran Compressor Station":     23,
    "Duliajan HQ":                  16,
    "Naharkatiya Field":            18,
    "Jorhat Facility":              14,
    "Borholla Gas Field":           11,
    "Tinsukia Operations":          12,
    "Namrup Plant":                 10,
    "Baghewala Field":              19,
    "Dandewala Field":              16,
    "Bakhritibba":                  13,
    "Mahanadi Basin Ops":            9,
    "KG Basin Offshore":            11,
}

# ── Template bank — (text_template, activity, sif_hint, site_filter_kw) ──────
# sif_hint: 'H'=high, 'M'=medium, 'L'=low

TEMPLATES = {
    # ═══ HIGH SIF — LOTO / ENERGY ISOLATION ════════════════════════════════════
    "H_loto_1": (
        "Maintenance technician at {site} began valve replacement on the crude transfer line "
        "without confirming energy isolation. The upstream isolation valve was found partially "
        "open. No lockout-tagout was applied. Work was stopped when gas detector alarmed at "
        "18% LEL. Isolation was not verified before work commencement.",
        "Valve Replacement", "H"
    ),
    "H_loto_2": (
        "Workover crew at {site} initiated rod-pulling on {well_ref} without isolating the "
        "wellhead master valve. The well was live at {pressure} bar BHP. Rod string dropped "
        "under annular pressure. Worker in the line of fire stepped clear. LOTO procedure "
        "was not followed. Isolation verification was absent.",
        "Workover / Rod Pulling", "H"
    ),
    "H_loto_3": (
        "During ESD function test at {site}, bypass valve was found open while maintenance "
        "team was positioned downstream. Line remained pressurised. Zero-energy verification "
        "was not performed before positioning personnel. Energy isolation was not confirmed.",
        "ESD Function Test", "H"
    ),
    "H_loto_4": (
        "Electric motor at {site} pump station was not de-energised before maintenance "
        "crew commenced coupling replacement. Worker restarted the motor inadvertently "
        "while the second technician was still working on the shaft. LOTO was absent. "
        "Isolation verification was not documented.",
        "Motor Coupling Maintenance", "H"
    ),
    "H_loto_5": (
        "Compressor at {site} was being worked on under a maintenance permit. Technician "
        "opened a panel without verifying that the drive motor was isolated. Panel energised "
        "at 415V. Lockout was not applied. Isolation was not verified at point of work.",
        "Compressor Panel Maintenance", "H"
    ),

    # ═══ HIGH SIF — GAS TESTING ═════════════════════════════════════════════════
    "H_gas_1": (
        "Pre-entry gas test was not performed before entering the {vessel_type} at {site}. "
        "Oxygen level inside was found at {o2_pct}% on post-incident measurement. Worker "
        "experienced dizziness and self-evacuated. No atmospheric monitor was deployed "
        "during entry. Gas test was absent from the entry permit.",
        "Confined Space Entry", "H"
    ),
    "H_gas_2": (
        "Atmospheric testing was skipped before opening the gas line flanges at {site} "
        "compressor suction header. Worker assumed the line had been purged. Gas concentration "
        "was 22% LEL when checked by the HSE officer who arrived after work had started. "
        "No gas test was performed. Atmospheric monitoring was not conducted.",
        "Flange Opening", "H"
    ),
    "H_gas_3": (
        "Hot work was initiated at {site} on a section of pipe within {dist} metres of a "
        "gas-producing well without a gas test being conducted. H2S detector was present "
        "but not switched on. No atmospheric test before commencing welding.",
        "Hot Work Near Wellhead", "H"
    ),
    "H_gas_4": (
        "Gas detector at {site} alarmed at 35% LEL during a planned nitrogen purge of "
        "the production separator. The alarm was silenced by the operator who believed it "
        "was a spurious reading. No investigation of the source was performed. Gas test "
        "result was not logged. Monitoring was insufficient.",
        "Separator Nitrogen Purge", "H"
    ),

    # ═══ HIGH SIF — PERMIT TO WORK ══════════════════════════════════════════════
    "H_permit_1": (
        "Hot work was commenced at {site} on the fuel gas header without a hot work permit. "
        "The crew assumed verbal permission from the shift supervisor was sufficient. "
        "No fire watch was assigned. The line contained flammable vapour. PTW was not raised.",
        "Hot Work — Fuel Gas Header", "H"
    ),
    "H_permit_2": (
        "During night shift at {site}, a crew initiated a flange break on a condensate "
        "line using the permit from the previous shift — which had expired 4 hours earlier. "
        "The current shift supervisor had not re-issued the permit. Permit was expired. "
        "Work proceeded without valid authorisation.",
        "Condensate Line Maintenance", "H"
    ),
    "H_permit_3": (
        "Contractor at {site} performed modification to a process pipe without any work "
        "permit. The area had been identified as requiring a hot work permit. No PTW was "
        "issued and the modification created a potential leak path into an active system.",
        "Unauthorised Pipe Modification", "H"
    ),

    # ═══ HIGH SIF — SUPERVISION ══════════════════════════════════════════════════
    "H_sup_1": (
        "Confined space entry at {site} was conducted without a standby person being "
        "assigned. The entry team of two workers entered simultaneously. If both had "
        "been incapacitated, no rescue capability would have been available. No standby "
        "man was present. Supervision was absent for the duration of entry.",
        "Confined Space Entry", "H"
    ),
    "H_sup_2": (
        "Night shift at {site}: supervisor departed the work area before the maintenance "
        "task was completed. Crew proceeded without supervision, including a step requiring "
        "supervisor sign-off before re-energising. No supervisor was present at task completion.",
        "Night Shift Maintenance", "H"
    ),
    "H_sup_3": (
        "Worker at {site} was performing field inspection activities alone at a remote "
        "wellpad with no check-in schedule or buddy system. Worker experienced a hand injury "
        "and was unable to reach assistance for 40 minutes. Lone worker procedure was "
        "not followed. No standby was arranged.",
        "Remote Field Inspection", "H"
    ),

    # ═══ HIGH SIF — MULTI-BARRIER ════════════════════════════════════════════════
    "H_multi_1": (
        "At {site}, flange on the gas export line was opened without energy isolation, "
        "without a gas test, and without a valid PTW. Three barriers failed simultaneously. "
        "The flange was under 14 bar pressure. A gas release occurred. No isolation was "
        "verified, no atmospheric test was performed, and no permit was in place.",
        "Gas Export Line Flange Opening", "H"
    ),
    "H_multi_2": (
        "At {site}, worker entered a production tank for gauging without gas test, without "
        "isolation confirmation, and with no standby man assigned. Three barriers were "
        "absent. Tank contained residual hydrocarbon vapour. Gas test not done, isolation "
        "not verified, standby absent.",
        "Production Tank Entry", "H"
    ),

    # ═══ MEDIUM SIF — DEGRADED BARRIERS ═════════════════════════════════════════
    "M_permit_1": (
        "Permit to work at {site} was issued for maintenance on the gas compressor but "
        "the isolation point listed was incorrect. The error was identified by the crew "
        "before work started and the permit was re-issued. PTW contained documentation "
        "error — incorrect isolation point specified.",
        "Compressor Maintenance", "M"
    ),
    "M_loto_1": (
        "Isolation valve lock was found missing from the lockout point at {site} pump "
        "station. The lock had been removed by an unknown person during a shift change. "
        "The valve position could not be confirmed. Isolation integrity was compromised.",
        "Pump Station Inspection", "M"
    ),
    "M_gas_1": (
        "Gas detector at {site} alarmed briefly (20% LEL for 60 seconds) before self-clearing. "
        "No leak source was identified during follow-up. Alarm was logged but formal "
        "investigation was not completed. Gas alarm source was not investigated.",
        "Gas Detection Alarm", "M"
    ),
    "M_gas_2": (
        "Portable gas detector used by entry team at {site} was found to have an expired "
        "calibration certificate — overdue by {days} days. Entry proceeded with the "
        "out-of-calibration device. Gas test credibility was compromised by equipment status.",
        "Pre-Entry Gas Detection", "M"
    ),
    "M_sup_1": (
        "Crew at {site} commenced maintenance work {mins} minutes before the scheduled "
        "supervisor safety briefing. Pre-job risk discussion did not occur as required. "
        "Toolbox talk was not conducted before work commenced.",
        "Pre-Job Safety Briefing", "M"
    ),
    "M_sop_1": (
        "Night shift at {site} performed compressor startup without referring to the written "
        "startup procedure. A manual bypass valve was left open causing a pressure surge "
        "downstream. Procedure was not followed during startup sequence.",
        "Compressor Startup", "M"
    ),
    "M_ppe_1": (
        "Worker at {site} was observed not wearing chemical-resistant gloves while handling "
        "corrosion inhibitor chemical drums. PPE assessment had been completed but "
        "compliance was not verified at point of work. PPE was not worn as required.",
        "Chemical Handling", "M"
    ),
    "M_multi_1": (
        "At {site}, scaffold inspection identified two boards spanning 2.6 metres unsupported "
        "(maximum permitted 2.0 m) at {height} metres height. Scaffold tag was present "
        "but the deficiency had not been documented. Inspection record was incomplete.",
        "Scaffold Inspection", "M"
    ),

    # ═══ LOW SIF — INTACT / COMPLIANT ═══════════════════════════════════════════
    "L_obs_1": (
        "Safety walk-through at {site} confirmed that all current permits were correctly "
        "displayed on the PTW board. Gas testing had been completed and logged for active "
        "confined space work. Supervisor confirmed team attended toolbox talk. "
        "PPE compliance was observed. Positive observation recorded.",
        "Safety Walk-Through", "L"
    ),
    "L_obs_2": (
        "Monthly fire equipment inspection at {site} confirmed all extinguishers were "
        "within inspection date. Hose reels were tested and functional. Emergency "
        "contact list was current. No deficiencies noted.",
        "Fire Equipment Inspection", "L"
    ),
    "L_obs_3": (
        "Minor oil stain (approx. {vol} litres) found on the floor near pump at {site}. "
        "Source was a slow drip from a compression fitting. Fitting tightened and area "
        "cleaned. No operational impact. Reported and resolved within shift.",
        "Housekeeping Observation", "L"
    ),
    "L_obs_4": (
        "PPE compliance walk at {site} found 100% hard hat and safety glasses compliance "
        "in the field. One worker reminded to tuck in high-visibility vest properly. "
        "General housekeeping in good condition.",
        "PPE Observation", "L"
    ),
    "L_obs_5": (
        "Pre-task risk assessment at {site} was completed by the crew before commencing "
        "valve lubrication. Isolation was verified at the point of work. Gas test showed "
        "0% LEL. Permit was valid and all signatures present. Task completed safely.",
        "Valve Lubrication", "L"
    ),
    "L_obs_6": (
        "Confined space entry at {site} was conducted in full compliance: valid entry permit, "
        "atmospheric test showing O2 19.8% and 0% LEL, standby man assigned with rescue "
        "equipment, SCBA available. Entry team briefed on emergency evacuation route.",
        "Confined Space Entry — Compliant", "L"
    ),

    # ═══ UNSTATED / AMBIGUOUS ════════════════════════════════════════════════════
    "U_amb_1": (
        "Worker at {site} reported feeling slightly unwell after working in the chemical "
        "storage area for 3 hours. Worker took a short rest and returned to duty. No "
        "further symptoms. Area ventilation was reported as functioning. Gas test status "
        "not recorded. Isolation status not documented.",
        "Chemical Area Work", "L"
    ),
    "U_amb_2": (
        "Unusual vibration reported from pump at {site} during night shift monitoring. "
        "Operator checked and logged for maintenance. Pump continued operating. No "
        "further details provided in report. Permit status not stated. Isolation not mentioned.",
        "Pump Monitoring", "L"
    ),
    "U_amb_3": (
        "Valve adjustment was performed at {site} well manifold during production operations. "
        "Adjustment was within normal range. The report does not state whether the isolation "
        "position was verified before adjustment. Permit status not recorded. Work order "
        "reference not included.",
        "Valve Adjustment", "L"
    ),
}

# Variable fillers
WELLS = ["Well-W-17", "Well-W-23", "Well-W-31", "Well-W-45", "Well-B-07", "Well-K-12"]
PRESSURES = [180, 240, 280, 320, 400]
O2_PCTS = [15.2, 16.1, 17.0, 18.3]
DISTANCES = [5, 8, 12, 15]
DAYS_OOC = [12, 22, 35, 45, 60]
HEIGHTS = [4, 6, 8, 10, 12]
MINS_EARLY = [10, 15, 20, 30]
VOLS = [1, 2, 3, 5]
VESSELS = ["separator vessel", "sump pit", "distillation column sump", "storage tank", "pig barrel"]

def _fill(template_str, site):
    """Fill template variables with random values."""
    return (template_str
        .replace("{site}", site)
        .replace("{well_ref}", random.choice(WELLS))
        .replace("{pressure}", str(random.choice(PRESSURES)))
        .replace("{o2_pct}", str(random.choice(O2_PCTS)))
        .replace("{dist}", str(random.choice(DISTANCES)))
        .replace("{days}", str(random.choice(DAYS_OOC)))
        .replace("{height}", str(random.choice(HEIGHTS)))
        .replace("{mins}", str(random.choice(MINS_EARLY)))
        .replace("{vol}", str(random.choice(VOLS)))
        .replace("{vessel_type}", random.choice(VESSELS))
    )

# ── Site → preferred template distribution ────────────────────────────────────
# Critical sites → more H templates; healthy sites → more L templates
SITE_PROFILE = {
    "Moran Compressor Station": {
        "high": ["H_loto_1","H_loto_3","H_loto_5","H_gas_2","H_gas_4","H_permit_2","H_sup_2","H_multi_1"],
        "med":  ["M_loto_1","M_gas_1","M_sop_1","M_permit_1"],
        "low":  ["L_obs_3","U_amb_2"],
        "h_pct": 0.55, "m_pct": 0.25,
    },
    "Baghewala Field": {
        "high": ["H_loto_1","H_loto_2","H_gas_1","H_permit_1","H_sup_3","H_multi_1"],
        "med":  ["M_gas_2","M_sup_1","M_permit_1","M_loto_1"],
        "low":  ["L_obs_3","U_amb_3"],
        "h_pct": 0.47, "m_pct": 0.26,
    },
    "Naharkatiya Field": {
        "high": ["H_loto_1","H_gas_1","H_gas_2","H_sup_1","H_loto_4"],
        "med":  ["M_gas_1","M_loto_1","M_sup_1","M_sop_1"],
        "low":  ["L_obs_1","L_obs_3","U_amb_1"],
        "h_pct": 0.39, "m_pct": 0.28,
    },
    "Dandewala Field": {
        "high": ["H_loto_2","H_gas_2","H_permit_1","H_sup_2"],
        "med":  ["M_gas_2","M_loto_1","M_sup_1","M_permit_1"],
        "low":  ["L_obs_3","L_obs_4","U_amb_3"],
        "h_pct": 0.37, "m_pct": 0.25,
    },
    "KG Basin Offshore": {
        "high": ["H_loto_1","H_gas_2","H_permit_2"],
        "med":  ["M_gas_1","M_loto_1","M_permit_1","M_sup_1"],
        "low":  ["L_obs_5","L_obs_6","U_amb_2","U_amb_3"],
        "h_pct": 0.27, "m_pct": 0.27,
    },
    "Mahanadi Basin Ops": {
        "high": ["H_loto_1","H_gas_1"],
        "med":  ["M_gas_2","M_loto_1","M_permit_1"],
        "low":  ["L_obs_3","L_obs_4","U_amb_2","U_amb_3"],
        "h_pct": 0.22, "m_pct": 0.22,
    },
    "Jorhat Facility": {
        "high": ["H_loto_4","H_gas_1","H_sup_1"],
        "med":  ["M_gas_1","M_permit_1","M_sop_1"],
        "low":  ["L_obs_1","L_obs_2","L_obs_3","U_amb_1"],
        "h_pct": 0.28, "m_pct": 0.29,
    },
    "Tinsukia Operations": {
        "high": ["H_loto_1","H_permit_2"],
        "med":  ["M_permit_1","M_loto_1","M_ppe_1"],
        "low":  ["L_obs_1","L_obs_3","L_obs_4","U_amb_2"],
        "h_pct": 0.25, "m_pct": 0.25,
    },
    "Bakhritibba": {
        "high": ["H_loto_2","H_gas_2"],
        "med":  ["M_gas_1","M_loto_1","M_ppe_1"],
        "low":  ["L_obs_1","L_obs_3","L_obs_4","U_amb_3"],
        "h_pct": 0.23, "m_pct": 0.23,
    },
    "Duliajan HQ": {
        "high": ["H_loto_1"],
        "med":  ["M_ppe_1","M_permit_1"],
        "low":  ["L_obs_1","L_obs_2","L_obs_3","L_obs_4","L_obs_5","L_obs_6","U_amb_1"],
        "h_pct": 0.12, "m_pct": 0.19,
    },
    "Borholla Gas Field": {
        "high": [],
        "med":  ["M_gas_1","M_permit_1"],
        "low":  ["L_obs_1","L_obs_2","L_obs_3","L_obs_4","L_obs_5","L_obs_6","U_amb_2"],
        "h_pct": 0.09, "m_pct": 0.18,
    },
    "Namrup Plant": {
        "high": ["H_permit_3"],
        "med":  ["M_permit_1"],
        "low":  ["L_obs_1","L_obs_2","L_obs_3","L_obs_4","L_obs_5","U_amb_3"],
        "h_pct": 0.10, "m_pct": 0.10,
    },
}


def generate_expanded_reports():
    """
    Generate ~170 additional synthetic reports to supplement the original 55.
    Uses canonical site names and weighted template distributions.
    Returns list of {report_text, site, activity} dicts.
    """
    random.seed(42)  # reproducible
    reports = []

    for site_name, target_count in SITE_REPORT_TARGETS.items():
        profile = SITE_PROFILE.get(site_name, {
            "high": list(k for k in TEMPLATES if k.startswith("H")),
            "med": list(k for k in TEMPLATES if k.startswith("M")),
            "low": list(k for k in TEMPLATES if k.startswith(("L","U"))),
            "h_pct": 0.25, "m_pct": 0.25,
        })
        h_count = round(target_count * profile["h_pct"])
        m_count = round(target_count * profile["m_pct"])
        l_count = target_count - h_count - m_count

        def pick_templates(tier_keys, n):
            if not tier_keys:
                fallback = [k for k in TEMPLATES if k.startswith(tier_keys[0][0])] if tier_keys else []
                tier_keys = fallback or list(TEMPLATES.keys())
            selected = []
            for i in range(n):
                key = tier_keys[i % len(tier_keys)]
                tmpl, activity, _ = TEMPLATES[key]
                selected.append((_fill(tmpl, site_name), activity))
            return selected

        for text, activity in pick_templates(profile.get("high", []), h_count):
            reports.append({"report_text": text, "site": site_name, "activity": activity})
        for text, activity in pick_templates(profile.get("med", []), m_count):
            reports.append({"report_text": text, "site": site_name, "activity": activity})
        for text, activity in pick_templates(profile.get("low", []), l_count):
            reports.append({"report_text": text, "site": site_name, "activity": activity})

    return reports
