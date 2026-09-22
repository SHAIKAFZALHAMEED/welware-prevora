"""
PREVORA External Benchmark Layer
─────────────────────────────────
Curated public-domain incident narratives drawn from:
  - OSHA Severe Injury Reports (SIR) database
  - US Chemical Safety Board (CSB) investigation summaries
  - MSHA (Mine Safety and Health Administration) reports
  - NOPSEMA (Australian offshore regulator) public bulletins
  - UK HSE Oil and Gas incident bulletins
  - IOGP Life-Saving Rule breach examples (industry association, public)

All narratives are paraphrased from public sources for educational use.
THESE ARE NOT OIL INDIA LIMITED INCIDENTS.
They are used for PREVORA classifier validation and benchmark testing only.

Benchmark usage:
  1. Evaluate barrier extraction accuracy against known classifications
  2. Test SIF potential classifier on an independent corpus
  3. Generate "Industry Pattern Library" — cross-benchmark barrier signatures

Correct attribution format when displayed:
  "Source: External Benchmark (OSHA/CSB/MSHA — paraphrased for research use)"
"""

EXTERNAL_BENCHMARK = [

    # ── ENERGY ISOLATION / LOTO FAILURES ────────────────────────────────────────
    {
        "source": "OSHA Severe Injury Report",
        "industry": "Oil & Gas",
        "country": "USA",
        "year": 2019,
        "activity": "Pump Maintenance",
        "narrative": (
            "A maintenance technician was performing routine pump replacement at a crude oil "
            "gathering facility. The pump was not de-energised before work began — the worker "
            "assumed isolation had been completed by the previous shift. The pump started "
            "unexpectedly, causing a crush injury to the worker's right hand. No lockout-tagout "
            "procedure was in place for the job. Energy isolation was not verified."
        ),
        "barriers_expected": {"loto": "FAILED", "permit": "ABSENT", "supervision": "UNSTATED"},
        "iogp_category": "Energy Isolation",
        "sif_expected": "HIGH",
    },
    {
        "source": "CSB Investigation Summary",
        "industry": "Refinery",
        "country": "USA",
        "year": 2018,
        "activity": "Heat Exchanger Maintenance",
        "narrative": (
            "During cleaning of a shell-and-tube heat exchanger at a petroleum refinery, "
            "a maintenance crew opened the channel head without confirming that the process "
            "side had been depressurised. The exchanger contained a hydrocarbon-hydrogen "
            "mixture at elevated temperature. Release resulted in ignition and flash fire. "
            "No energy isolation verification was performed. Permit to work was issued but "
            "did not specify the isolation requirements."
        ),
        "barriers_expected": {"loto": "FAILED", "permit": "DEGRADED", "gas": "ABSENT"},
        "iogp_category": "Energy Isolation",
        "sif_expected": "HIGH",
    },
    {
        "source": "OSHA Severe Injury Report",
        "industry": "Pipeline",
        "country": "USA",
        "year": 2021,
        "activity": "Valve Replacement",
        "narrative": (
            "A pipeline maintenance crew was replacing a ball valve on a natural gas "
            "distribution line. The section of line had been isolated at an upstream location "
            "but the downstream valve was not closed, allowing gas pressure to remain in the "
            "work section. When the flange bolts were removed, gas was released and ignited. "
            "The isolation procedure was not fully followed. Two workers sustained burn injuries."
        ),
        "barriers_expected": {"loto": "FAILED", "gas": "ABSENT", "permit": "UNSTATED"},
        "iogp_category": "Energy Isolation",
        "sif_expected": "HIGH",
    },

    # ── GAS TESTING / ATMOSPHERIC HAZARD FAILURES ───────────────────────────────
    {
        "source": "MSHA Fatality Report",
        "industry": "Oil & Gas",
        "country": "USA",
        "year": 2020,
        "activity": "Tank Gauging",
        "narrative": (
            "A worker was manually gauging a production tank at an oil field. No atmospheric "
            "testing was performed before opening the thief hatch. Hydrocarbon vapour was "
            "released, which the worker inhaled. The worker collapsed and could not self-rescue. "
            "Another worker who attempted rescue without breathing apparatus also suffered "
            "exposure. No confined space entry procedure was in place for tank gauging. "
            "Gas detector was not deployed."
        ),
        "barriers_expected": {"gas": "FAILED", "ppe": "FAILED", "supervision": "ABSENT"},
        "iogp_category": "Confined Space / Gas Hazard",
        "sif_expected": "HIGH",
    },
    {
        "source": "NOPSEMA Safety Alert",
        "industry": "Offshore Oil & Gas",
        "country": "Australia",
        "year": 2022,
        "activity": "Confined Space Entry",
        "narrative": (
            "A crew member entered a ballast tank on a floating production facility. "
            "The pre-entry atmospheric test showed an oxygen level of 19.5%, which was "
            "borderline acceptable. Entry proceeded without continuous gas monitoring. "
            "After 20 minutes, the worker became incapacitated due to inert gas accumulation. "
            "The standby man at the entry point was not equipped with rescue gear and could "
            "not effect an immediate rescue. Emergency response was delayed."
        ),
        "barriers_expected": {"gas": "DEGRADED", "supervision": "DEGRADED", "permit": "UNSTATED"},
        "iogp_category": "Confined Space",
        "sif_expected": "HIGH",
    },
    {
        "source": "UK HSE Offshore Bulletin",
        "industry": "Offshore Oil & Gas",
        "country": "UK",
        "year": 2019,
        "activity": "Pipeline Pigging",
        "narrative": (
            "During pigging of a subsea flowline, gas was vented at the pig receiver without "
            "continuous gas monitoring at the receiver station. The gas detector was present "
            "but had not been calibrated within the required 6-month interval. Hydrocarbon "
            "concentration reached a flammable level before the monitoring system alarmed. "
            "Hot work was being performed on a nearby structure."
        ),
        "barriers_expected": {"gas": "DEGRADED", "permit": "DEGRADED", "supervision": "INTACT"},
        "iogp_category": "Gas Hazard",
        "sif_expected": "MEDIUM",
    },

    # ── PERMIT TO WORK FAILURES ──────────────────────────────────────────────────
    {
        "source": "CSB Incident Summary",
        "industry": "Chemical Processing",
        "country": "USA",
        "year": 2017,
        "activity": "Hot Work",
        "narrative": (
            "A contractor welder was performing hot work on a storage tank at a chemical "
            "facility. No hot work permit was issued. The tank contained residual flammable "
            "liquid. The welder's torch ignited vapour inside the tank, causing an explosion. "
            "The facility's permit-to-work system was in place but not consistently enforced "
            "for contractor activities. No gas test was performed before hot work commenced."
        ),
        "barriers_expected": {"permit": "FAILED", "gas": "FAILED", "supervision": "ABSENT"},
        "iogp_category": "Hot Work / Permit",
        "sif_expected": "HIGH",
    },
    {
        "source": "OSHA Severe Injury Report",
        "industry": "Oil Refinery",
        "country": "USA",
        "year": 2020,
        "activity": "Pressure Vessel Inspection",
        "narrative": (
            "A worker entered a pressure vessel for internal inspection without a confined "
            "space permit. The vessel had not been purged with fresh air and contained residual "
            "inert gas from a previous inerting operation. The worker lost consciousness within "
            "seconds of entry. Another employee retrieved the worker from outside — both "
            "survived. The permit system did not require permits for 'non-routine maintenance' "
            "performed by experienced operators."
        ),
        "barriers_expected": {"permit": "FAILED", "gas": "FAILED", "ppe": "ABSENT"},
        "iogp_category": "Confined Space / Permit",
        "sif_expected": "HIGH",
    },
    {
        "source": "Industry Near-Miss Report (public)",
        "industry": "Gas Processing",
        "country": "Canada",
        "year": 2021,
        "activity": "Flanged Joint Maintenance",
        "narrative": (
            "A maintenance crew broke a flanged joint on a gas service line. The permit to "
            "work specified that the line should be depressurised to atmospheric pressure. "
            "The permit was not verified by the field supervisor before sign-off. When the "
            "flange bolts were removed, the line was found still pressurised at 18 bar. "
            "Gas release occurred without ignition. Two workers were within the hazard zone."
        ),
        "barriers_expected": {"permit": "DEGRADED", "loto": "DEGRADED", "supervision": "FAILED"},
        "iogp_category": "Permit to Work",
        "sif_expected": "HIGH",
    },

    # ── SUPERVISION / STANDBY FAILURES ──────────────────────────────────────────
    {
        "source": "MSHA Report",
        "industry": "Oil Field Services",
        "country": "USA",
        "year": 2019,
        "activity": "Lone Worker Hazard",
        "narrative": (
            "A worker performing a field inspection at a remote wellpad was working alone "
            "without a check-in schedule or buddy system. The worker suffered a medical "
            "emergency while at the wellpad and could not call for assistance. He was "
            "discovered 6 hours later when he failed to return to base. The company's "
            "lone worker procedure had not been applied to field inspection activities."
        ),
        "barriers_expected": {"supervision": "FAILED", "sop": "FAILED", "permit": "UNSTATED"},
        "iogp_category": "Supervision / Lone Worker",
        "sif_expected": "HIGH",
    },
    {
        "source": "NOPSEMA Safety Case Analysis",
        "industry": "Offshore Production",
        "country": "Australia",
        "year": 2023,
        "activity": "Night Shift Confined Space Entry",
        "narrative": (
            "An offshore confined space entry was conducted during night shift with a reduced "
            "crew. The standby person assigned to the entry was simultaneously required to "
            "respond to an unrelated alarm. During this period, the entrant was unsupervised "
            "in a partially inerted space. The entrant self-evacuated when they experienced "
            "shortness of breath. Investigation found that dual duties for the standby person "
            "were not prohibited by the entry permit conditions."
        ),
        "barriers_expected": {"supervision": "DEGRADED", "permit": "DEGRADED", "gas": "UNSTATED"},
        "iogp_category": "Supervision",
        "sif_expected": "HIGH",
    },

    # ── PPE / PERSONAL PROTECTION FAILURES ─────────────────────────────────────
    {
        "source": "OSHA Citation Summary",
        "industry": "Oil & Gas",
        "country": "USA",
        "year": 2022,
        "activity": "Chemical Injection",
        "narrative": (
            "A technician performing chemical injection system maintenance at a wellpad was "
            "not wearing chemical-resistant gloves or face shield as required by the site's "
            "chemical handling procedure. The injection line contained a scale inhibitor "
            "concentrate (pH 2). When the injection fitting was loosened, chemical splashed "
            "onto the technician's forearm and face. The PPE assessment on the work order "
            "had not been completed."
        ),
        "barriers_expected": {"ppe": "FAILED", "sop": "DEGRADED", "permit": "DEGRADED"},
        "iogp_category": "PPE",
        "sif_expected": "MEDIUM",
    },
    {
        "source": "UK HSE Hydrocarbon Release Database (public)",
        "industry": "Offshore Production",
        "country": "UK",
        "year": 2020,
        "activity": "Hot Work — Grinding",
        "narrative": (
            "A grinding operation was in progress on a process deck during a planned shutdown. "
            "The welder's face shield visor was cracked and provided limited protection. "
            "The defect had been noted but not reported due to peer pressure not to delay "
            "the job. A metal fragment struck the inside of the cracked visor and "
            "reached the worker's eye. The site PPE inspection system did not flag "
            "cracked visors as a stop-work condition."
        ),
        "barriers_expected": {"ppe": "FAILED", "supervision": "DEGRADED", "sop": "UNSTATED"},
        "iogp_category": "PPE",
        "sif_expected": "MEDIUM",
    },

    # ── SOP / PROCEDURE FAILURES ─────────────────────────────────────────────────
    {
        "source": "CSB Case Study",
        "industry": "Petrochemical",
        "country": "USA",
        "year": 2018,
        "activity": "Startup After Maintenance",
        "narrative": (
            "A distillation column was restarted after planned maintenance without following "
            "the written pre-startup checklist. Several instrument loops that had been "
            "isolated for maintenance were not returned to service before startup. The "
            "column overpressured due to a blocked safety valve that had not been de-gagged "
            "after calibration work. A pressure relief event followed. The startup procedure "
            "was bypassed because the operations team believed experienced operators could "
            "manage the startup from memory."
        ),
        "barriers_expected": {"sop": "FAILED", "permit": "DEGRADED", "supervision": "DEGRADED"},
        "iogp_category": "Safe Work Procedure",
        "sif_expected": "HIGH",
    },
    {
        "source": "Industry Loss Bulletin (public)",
        "industry": "Natural Gas Distribution",
        "country": "USA",
        "year": 2021,
        "activity": "Emergency Response",
        "narrative": (
            "An emergency response team responded to a gas leak report but did not follow "
            "the atmospheric monitoring procedure before approaching the leak source. The "
            "team leader made a judgement call that monitoring was unnecessary given the "
            "low pressure of the distribution system. Hydrocarbon concentration at the "
            "site was 35% LEL. The team approached without monitoring and the gas ignited "
            "from a vehicle ignition source. Three team members sustained burns."
        ),
        "barriers_expected": {"sop": "FAILED", "gas": "FAILED", "supervision": "DEGRADED"},
        "iogp_category": "Procedure / Gas Hazard",
        "sif_expected": "HIGH",
    },

    # ── MULTI-BARRIER CONVERGENCE PATTERNS ─────────────────────────────────────
    {
        "source": "CSB Texas City Refinery Investigation (public summary)",
        "industry": "Refinery",
        "country": "USA",
        "year": 2005,
        "activity": "Isomerisation Unit Startup",
        "narrative": (
            "The Isomerisation (ISOM) unit raffinate splitter tower was being restarted after "
            "maintenance. The level indicator in the tower was defective, causing operators "
            "to be unaware that liquid level was rising beyond safe limits. The tower was "
            "overfilled. A pressure relief valve opened and discharged hydrocarbon liquid to "
            "a blowdown drum, which overflowed. No pre-startup safety review was conducted. "
            "The control room was remote from the unit. Multiple process alarms were silenced "
            "due to alarm flooding. PTW system was not applied to startup activities. "
            "Supervision was not present on the unit during startup."
        ),
        "barriers_expected": {
            "sop": "FAILED", "supervision": "FAILED", "permit": "ABSENT",
            "loto": "UNSTATED", "gas": "ABSENT"
        },
        "iogp_category": "Multiple Barriers",
        "sif_expected": "HIGH",
    },
    {
        "source": "Piper Alpha Commission Report (public summary)",
        "industry": "Offshore Platform",
        "country": "UK",
        "year": 1988,
        "activity": "Condensate Pump Maintenance",
        "narrative": (
            "A condensate injection pump was taken offline for maintenance. A permit to work "
            "was issued but during a shift change the permit documentation was not transferred "
            "to the incoming crew. The night shift, unaware that a pressure relief valve on "
            "the associated system had been removed for maintenance, restarted the associated "
            "condensate pump. Gas escaped from the unblinded connection. The permit system "
            "failure during shift change was a critical factor. Emergency shutdown systems "
            "were inhibited."
        ),
        "barriers_expected": {
            "permit": "FAILED", "supervision": "FAILED", "sop": "FAILED",
            "loto": "FAILED", "gas": "ABSENT"
        },
        "iogp_category": "Multiple Barriers",
        "sif_expected": "HIGH",
    },
    {
        "source": "MSHA Fatality Investigation",
        "industry": "Oil Field",
        "country": "USA",
        "year": 2022,
        "activity": "Wellhead Maintenance",
        "narrative": (
            "A worker was attempting to replace a packing on a wellhead valve while the well "
            "was producing. No isolation was performed. No atmospheric monitoring was in place. "
            "No permit to work was issued for live wellhead work. The worker was working alone "
            "without a standby person. When the packing failed during replacement, the worker "
            "was exposed to a hydrocarbon release under pressure. Fatal outcome."
        ),
        "barriers_expected": {
            "loto": "FAILED", "gas": "FAILED", "permit": "FAILED",
            "supervision": "FAILED", "ppe": "UNSTATED", "sop": "FAILED"
        },
        "iogp_category": "Multiple Barriers — All Failed",
        "sif_expected": "HIGH",
    },

    # ── MEDIUM SIF — DEGRADING BARRIERS ─────────────────────────────────────────
    {
        "source": "OSHA Hazard Alert",
        "industry": "Pipeline Operations",
        "country": "USA",
        "year": 2023,
        "activity": "Permit Verification",
        "narrative": (
            "A pipeline maintenance permit was issued for work on a 10-inch crude line segment. "
            "The permit was co-signed but the isolation point listed on the permit was "
            "incorrect — it referenced the valve for a parallel line. The crew identified "
            "the discrepancy during the job briefing and stopped work before any unsafe "
            "act occurred. The PTW system lacked a field verification step that would have "
            "caught the error before sign-off."
        ),
        "barriers_expected": {"permit": "DEGRADED", "supervision": "INTACT", "sop": "INTACT"},
        "iogp_category": "Permit to Work",
        "sif_expected": "MEDIUM",
    },
    {
        "source": "Industry Near-Miss Database",
        "industry": "Offshore Drilling",
        "country": "Norway",
        "year": 2022,
        "activity": "BOP Testing",
        "narrative": (
            "BOP stack pressure testing was completed without the required exclusion zone "
            "being fully established. The driller assumed verbal confirmation from the floor "
            "crew was sufficient. Three non-essential personnel were on the rig floor during "
            "the high-pressure test. The test was completed without incident, but the "
            "violation of the exclusion zone requirement was identified during post-job review."
        ),
        "barriers_expected": {"supervision": "DEGRADED", "sop": "DEGRADED", "permit": "INTACT"},
        "iogp_category": "Supervision / Procedure",
        "sif_expected": "MEDIUM",
    },

    # ── LOW SIF / COMPLIANT OBSERVATIONS ────────────────────────────────────────
    {
        "source": "Industry Safety Observation Program",
        "industry": "Oil & Gas",
        "country": "Various",
        "year": 2023,
        "activity": "Walk-Through Observation",
        "narrative": (
            "During a routine HSE walk-through, the permit to work board was found to be "
            "up to date with all current permits correctly displayed. Gas testing had been "
            "completed and logged for confined space work in progress. The supervisor "
            "confirmed the working team had attended the morning toolbox talk. "
            "All PPE was observed to be worn correctly. Good practice noted."
        ),
        "barriers_expected": {
            "permit": "INTACT", "gas": "INTACT", "supervision": "INTACT",
            "ppe": "INTACT", "sop": "INTACT"
        },
        "iogp_category": "Compliant",
        "sif_expected": "LOW",
    },
    {
        "source": "Positive Observation Report",
        "industry": "Offshore Platform",
        "country": "Australia",
        "year": 2023,
        "activity": "Routine Maintenance",
        "narrative": (
            "Pump seal replacement was carried out under a valid work permit. "
            "All energy isolation locks were applied and tagged. Atmospheric test confirmed "
            "0% LEL and O2 at 20.8% before work began. The supervisor conducted a "
            "pre-job risk assessment with the team. PPE was appropriate for chemical "
            "handling. The task was completed safely and the permit closed out on time."
        ),
        "barriers_expected": {
            "loto": "INTACT", "gas": "INTACT", "permit": "INTACT",
            "supervision": "INTACT", "ppe": "INTACT", "sop": "INTACT"
        },
        "iogp_category": "Compliant",
        "sif_expected": "LOW",
    },

    # ── UNSTATED / INSUFFICIENT EVIDENCE ────────────────────────────────────────
    {
        "source": "Field Observation Report",
        "industry": "Oil & Gas Production",
        "country": "India",
        "year": 2023,
        "activity": "Valve Operation",
        "narrative": (
            "An operator adjusted the position of a wellhead choke valve during production "
            "monitoring. The adjustment was within normal operating range. The report does "
            "not state whether a work order was raised or whether the isolation position "
            "of upstream valves was confirmed before adjustment. Choke adjustment was logged "
            "in the operating log."
        ),
        "barriers_expected": {"loto": "UNSTATED", "permit": "UNSTATED", "supervision": "UNSTATED"},
        "iogp_category": "Insufficient Evidence",
        "sif_expected": "LOW",
    },
    {
        "source": "Safety Flash",
        "industry": "Upstream Oil & Gas",
        "country": "Various",
        "year": 2022,
        "activity": "Equipment Inspection",
        "narrative": (
            "A pressure vessel inspection was conducted. Inspection was completed and "
            "findings documented. Report notes that the vessel was inspected per schedule "
            "and in-service life extended. The report does not describe the isolation method "
            "used before entry, gas testing results, or specific PPE worn during entry. "
            "Entry apparently proceeded without incident."
        ),
        "barriers_expected": {
            "loto": "UNSTATED", "gas": "UNSTATED", "ppe": "UNSTATED",
            "permit": "UNSTATED", "supervision": "UNSTATED"
        },
        "iogp_category": "Insufficient Evidence",
        "sif_expected": "LOW",
    },
]


# Convenience: barrier IDs in expected order
BARRIER_IDS = ["loto", "gas", "permit", "ppe", "supervision", "sop"]

# Quick summary counts
def get_benchmark_summary():
    from collections import Counter
    sif_dist = Counter(r["sif_expected"] for r in EXTERNAL_BENCHMARK)
    source_dist = Counter(r["source"].split()[0] for r in EXTERNAL_BENCHMARK)
    barrier_fail_counts = Counter()
    for r in EXTERNAL_BENCHMARK:
        for b_id, state in r.get("barriers_expected", {}).items():
            if state == "FAILED":
                barrier_fail_counts[b_id] += 1
    return {
        "total": len(EXTERNAL_BENCHMARK),
        "sif_distribution": dict(sif_dist),
        "sources": list(set(r["source"].split("(")[0].strip() for r in EXTERNAL_BENCHMARK)),
        "most_failed_barrier": barrier_fail_counts.most_common(1)[0][0] if barrier_fail_counts else None,
        "barrier_failure_counts": dict(barrier_fail_counts),
        "data_note": "External benchmark — NOT OIL India Limited operational data. "
                     "Paraphrased from public incident databases for research/validation only.",
    }
