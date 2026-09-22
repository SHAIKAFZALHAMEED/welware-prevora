"""
PREVORA Synthetic Dataset Seed — v2
─────────────────────────────────────
Layer 1 (original):   55 canonical narrative reports (OIL-context scenarios)
Layer 2 (expanded):  ~170 additional reports using canonical site names
                      from expanded_seed.py, aligned to canonical_sites.py
Total target: ~225 synthetic OIL demonstration reports

Layer 3 (external benchmark) is stored separately in app/data/external_benchmark.py
and served via /benchmark endpoints — NOT mixed with Layer 1/2 data.

SYNTHETIC DEMO — NOT LIVE OIL OPERATIONAL DATA
"""
from sqlalchemy import select, text
from app.db.database import AsyncSessionLocal
from app.models.report import Report, ReviewStatus
from app.nlp.classifier import classify_report
from app.db.expanded_seed import generate_expanded_reports

SYNTHETIC_REPORTS = [
    # ── CRITICAL / HIGH SIF ──────────────────────────────────────────────────
    {
        "report_text": "During high-pressure nitrogen purging of the wellhead christmas tree at Moran Compressor Station, the secondary swivel joint sheared under 3,200 PSI and ejected a metal plug approximately 15 metres, narrowly missing two workers. No PTW was issued for the pressure test. Gas detector was not deployed.",
        "site": "Moran Compressor Station", "activity": "Wellhead Pressure Testing",
    },
    {
        "report_text": "Worker entered confined space (separator vessel V-101) at Jorhat Facility for internal inspection. Atmospheric testing was not performed before entry. Oxygen level was later found to be 16.2%. No standby man was assigned. Worker self-evacuated after feeling dizzy.",
        "site": "Jorhat Facility", "activity": "Confined Space Entry",
    },
    {
        "report_text": "Hot work was being performed (grinding) on a fuel gas line at Moran Compressor Station. The gas detector alarmed at 20% LEL but work continued for approximately 8 minutes before supervisor intervened. No fire watch was assigned.",
        "site": "Moran Compressor Station", "activity": "Hot Work / Grinding",
    },
    {
        "report_text": "Workover crew at Naharkatiya Field began pulling rods on Well-W-17 without isolating the wellhead. The manual isolation valve was found partially open. Rod string dropped unexpectedly under annular pressure. Worker in the line of fire managed to step clear.",
        "site": "Naharkatiya Field", "activity": "Workover / Rod Pulling",
    },
    {
        "report_text": "Technician climbed to the top of a 12-metre condensate storage tank at Baghewala Field to take manual dip measurement. No fall arrest harness was worn. Safety handrails on one side were reported missing for over two weeks. Wind speed was 35 km/h at the time.",
        "site": "Baghewala Field", "activity": "Manual Tank Gauging",
    },
    {
        "report_text": "During emergency shutdown test at Moran Compressor Station, one of the ESD solenoid valves failed to close. The line remained pressurised at 85 bar while maintenance team was positioned downstream for valve replacement. Barrier failure: ESD bypass not confirmed closed. Energy isolation was not verified.",
        "site": "Moran Compressor Station", "activity": "ESD Function Test",
    },
    {
        "report_text": "Scaffolding collapsed on the second level of the process tower at Jorhat Facility during routine inspection work. Two workers fell 4.5 metres. Scaffolding was erected without a valid scaffold tag and had not been inspected after heavy rainfall the previous night.",
        "site": "Jorhat Facility", "activity": "Scaffold Inspection",
    },
    {
        "report_text": "A flange on the gas export line at Moran Compressor Station was found leaking when a worker noticed hydrocarbon smell near pump P-201. Investigation revealed that the flange had been re-assembled after maintenance without proper torqueing. No PTW closeout inspection was performed.",
        "site": "Moran Compressor Station", "activity": "Flange Reassembly Post-Maintenance",
    },
    {
        "report_text": "At Naharkatiya Field, pipe handling crew was guiding a 9 5/8 inch casing joint into the rotary table when the tugger line slipped. The 400 kg joint swung laterally across the rig floor. Three workers were in the swing radius. No drop zone was marked.",
        "site": "Naharkatiya Field", "activity": "Casing Running Operations",
    },
    {
        "report_text": "Worker performing routine valve lubrication at Moran Compressor Station received a flash of gas when he loosened a grease fitting on a live valve without first checking the bleeder. Grease fitting was connected to a gas-charged line at 45 bar. No gas test was performed. Worker sustained minor eye irritation.",
        "site": "Moran Compressor Station", "activity": "Valve Maintenance",
    },
    {
        "report_text": "Electrical technician at Baghewala Field isolated the wrong breaker before working on a live control panel. The panel he was working on remained energised at 440V. Isolation was not verified using a lock-out tag-out procedure. Work stopped when he noticed live indicators before touching terminals.",
        "site": "Baghewala Field", "activity": "Electrical Panel Maintenance",
    },
    {
        "report_text": "At pump house at Duliajan HQ, a worker slipped on a hydrocarbon spill near crude pump P-112. The spill had been reported two days prior but not cleaned.",
        "site": "Duliajan HQ", "activity": "Pump Inspection Walkthrough",
    },
    {
        "report_text": "During acid stimulation of Well-W-23 at Naharkatiya Field, the flowback hose disconnected under pressure at the wellhead and sprayed hydrochloric acid (15% concentration) across a radius of approximately 3 metres. Two workers in the exclusion zone received acid exposure.",
        "site": "Naharkatiya Field", "activity": "Acid Stimulation / Flowback",
    },
    {
        "report_text": "At KG Basin Offshore, a crane lift of a 2-tonne compressor module was performed without a lift plan or rigging inspection. The lifting sling was found to be beyond its rated capacity. The lift was stopped by the HSE officer before personnel moved under the suspended load.",
        "site": "KG Basin Offshore", "activity": "Crane Lifting Operations",
    },
    # ── MEDIUM SIF ──────────────────────────────────────────────────────────
    {
        "report_text": "Valve tag was found missing from an isolation valve on the condensate transfer line at Tinsukia Operations during a shift handover inspection. The valve's position (open/closed) could not be confirmed. Transfer operations were suspended pending physical inspection.",
        "site": "Tinsukia Operations", "activity": "Shift Handover Valve Inspection",
    },
    {
        "report_text": "Gas detector at Moran Compressor Station alarmed briefly (25% LEL for approximately 90 seconds) before self-clearing. No leak source was identified during follow-up inspection. Alarm was logged but no formal investigation was initiated.",
        "site": "Moran Compressor Station", "activity": "Gas Detection / Monitoring",
    },
    {
        "report_text": "Worker carrying tools on an elevated walkway at Naharkatiya Field tripped on an unsecured cable lying across the grating. No injury occurred. The cable had been temporarily routed for an ongoing job and was not barricaded or marked.",
        "site": "Naharkatiya Field", "activity": "Elevated Walkway Access",
    },
    {
        "report_text": "Night shift operator at Jorhat Facility conducted lineup for gas compression startup without referring to the written operating procedure. A manual bypass valve was inadvertently left open causing a pressure surge downstream. Compressor tripped on high discharge pressure.",
        "site": "Jorhat Facility", "activity": "Compressor Startup",
    },
    {
        "report_text": "A portable gas detector used by the entry team at Mahanadi Basin Ops manifold area failed to alarm when tested in a known gas atmosphere prior to confined space entry. Device calibration was found to be expired by 45 days.",
        "site": "Mahanadi Basin Ops", "activity": "Pre-Entry Gas Detection",
    },
    {
        "report_text": "During welding at Baghewala Field pipe rack, a spark landed on a cloth rag saturated with diesel that had been left near the weld zone. A small fire started and was extinguished by the welder using a handheld extinguisher within 30 seconds. No burns sustained.",
        "site": "Baghewala Field", "activity": "Welding at Pipe Rack",
    },
    {
        "report_text": "Scaffold board at Dandewala Field found spanning 2.8 metres unsupported (max permitted 2.0 m) at 8-metre height. Tag was present but board replacement had not been documented.",
        "site": "Dandewala Field", "activity": "Scaffold Inspection",
    },
    {
        "report_text": "Contractor at Baghewala Field performed modification to a process pipe without raising a work permit. Area had been identified as requiring a hot work permit. Modification created a potential leak path into an active system.",
        "site": "Baghewala Field", "activity": "Unauthorised Pipe Modification",
    },
    {
        "report_text": "Safety valve PSV-301 at Jorhat Facility found to be gagged (held open by a mechanical pin) with a yellow tag stating 'under maintenance'. However, no active PTW was open for this work. Line downstream was at operating pressure.",
        "site": "Jorhat Facility", "activity": "Safety Valve Maintenance",
    },
    {
        "report_text": "Night shift crew at KG Basin Offshore conducted a pressure test on the BOP stack at 5,000 PSI without evacuating non-essential personnel from the rig floor. BOP testing requires a 50-metre exclusion zone per OIL drilling standards.",
        "site": "KG Basin Offshore", "activity": "BOP Pressure Testing",
    },
    # ── LOW / NON-SIF ────────────────────────────────────────────────────────
    {
        "report_text": "Worker reported a small oil stain approximately 20 cm diameter on the floor of the rig doghouse at Duliajan HQ. Source identified as a slow drip from a hydraulic line fitting. Fitting was tightened and stain cleaned. No operational impact.",
        "site": "Duliajan HQ", "activity": "Rig Floor Housekeeping",
    },
    {
        "report_text": "Gate to the equipment storage yard at Jorhat Facility was found unlocked during morning security round. Gate was secured by the security officer. No evidence of unauthorised access.",
        "site": "Jorhat Facility", "activity": "Security Inspection",
    },
    {
        "report_text": "PPE vending machine at Duliajan HQ main gate reported to be out of stock of medium-sized gloves. Safety store notified. Gloves replenished within 2 hours.",
        "site": "Duliajan HQ", "activity": "PPE Management",
    },
    {
        "report_text": "Minor oil spill (estimated 2 litres) from sample point on crude transfer line at Borholla Gas Field. Worker took sample without placing drip tray. Spill contained and cleaned within 15 minutes. No waterway impact.",
        "site": "Borholla Gas Field", "activity": "Crude Sampling",
    },
    {
        "report_text": "Fire extinguisher at Namrup Plant compressor building was found with inspection tag expired by 10 days. Extinguisher recharged and tagged same day.",
        "site": "Namrup Plant", "activity": "Fire Equipment Inspection",
    },
    # ── AMBIGUOUS ────────────────────────────────────────────────────────────
    {
        "report_text": "Worker reported feeling unwell and slightly dizzy after working for 3 hours in the chemical storage area at Baghewala Field. He took a short break and felt better. Area ventilation was noted as functioning. Worker returned to duty. Gas test status not recorded.",
        "site": "Baghewala Field", "activity": "Chemical Storage Area Work",
    },
    {
        "report_text": "Unusual noise reported from pump at Moran Compressor Station during night shift. Operator checked and noted slight vibration increase. Logged for maintenance review next day. Pump continued operating.",
        "site": "Moran Compressor Station", "activity": "Pump Monitoring",
    },
    # ── CANONICAL STORY CASES ───────────────────────────────────────────────
    {
        "report_text": "Well kill operation at Naharkatiya Field at Well-W-45 was initiated without a signed kill sheet or mud weight confirmation. Kill mud density was found to be 0.15 SG below the required value. Well showed signs of influx (pit gain of 1.5 m3) before operation was halted.",
        "site": "Naharkatiya Field", "activity": "Well Kill / Control",
    },
    {
        "report_text": "At Baghewala Field, bypass valve around the pressure relief valve PRV-201 was found in the open position. With PRV bypassed and the line at 38 bar, there was no automatic overpressure protection. Discovered during monthly safety round.",
        "site": "Baghewala Field", "activity": "Safety Round Inspection",
    },
    {
        "report_text": "During maintenance at Moran Compressor Station, technician loosened a chemical injection line while chemical was still pressurised. Corrosion inhibitor chemical sprayed and contacted worker's face. Worker was not wearing face shield — only safety glasses. PPE was insufficient.",
        "site": "Moran Compressor Station", "activity": "Chemical Injection Pump Maintenance",
    },
    {
        "report_text": "Operator at Mahanadi Basin Ops adjusted wellhead choke valve during production monitoring. The adjustment was within normal operating range. The report does not state whether isolation was confirmed before adjustment. Permit status not recorded.",
        "site": "Mahanadi Basin Ops", "activity": "Wellhead Valve Adjustment",
    },
    # ── CANONICAL STORY — WELL-W-31 (featured in Incident Story page) ───────
    {
        "report_text": "A roustabout sustained a minor finger laceration while handling a valve handwheel on Well-W-31 at Moran Compressor Station. First aid was administered and the injury was recorded as a minor first-aid case. Investigation revealed the handwheel controls the wellhead master valve on a well flowing at 280 bar BHP. The worker had bypassed the isolation procedure because he assumed the valve was in the closed position. Wellhead pressure was live at the time of the incident. Energy isolation was not verified.",
        "site": "Moran Compressor Station", "activity": "Wellhead Valve Handwheel Operation",
    },
    {
        "report_text": "During night shift at Moran Compressor Station — Well-W-31 area — a roustabout was found operating the wellhead master valve handwheel without isolation confirmation. The well was live at high pressure. This is the second report from this well in 48 hours involving the same bypass of isolation procedure on the master valve. Same root cause: inadequate PTW briefing for night crew. LOTO not applied.",
        "site": "Moran Compressor Station", "activity": "Wellhead Valve Handwheel Operation",
    },
]


async def seed_database():
    """Seed with Layer 1 + Layer 2 if table is empty."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Report).limit(1))
        if result.scalars().first() is not None:
            return  # already seeded

        # Layer 1: original canonical narratives
        all_reports = list(SYNTHETIC_REPORTS)

        # Layer 2: expanded synthetic with canonical site names
        all_reports.extend(generate_expanded_reports())

        print(f"[seed] Seeding {len(all_reports)} synthetic reports...")

        for item in all_reports:
            classification = classify_report(item["report_text"])
            report = Report(
                report_text=item["report_text"],
                site=item["site"],
                activity=item["activity"],
                sif_potential=classification["sif_potential"],
                confidence=classification["confidence"],
                rule_tags=",".join(classification["rule_tags"]),
                evidence_spans="|".join(classification["evidence_spans"]),
                counterfactual_delta=classification["counterfactual_delta"],
                review_status=ReviewStatus.PENDING,
            )
            session.add(report)

        await session.commit()
        print(f"[seed] Done — {len(all_reports)} reports seeded.")


async def force_reseed():
    """Drop all reports and re-seed. Use for development only."""
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM reports"))
        await session.commit()
    await seed_database()
