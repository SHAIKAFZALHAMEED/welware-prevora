# PREVORA — SIF Sentinel
### AI/NLP Safety Intelligence Platform for Oil India Limited
**Team WELWARE · SIH Problem Statement SIH26165**

---

## What It Does

PREVORA (PRE-Vention Of Repeat Accidents) automatically scans UA/UC and Near-Miss safety reports, detects **Serious Injury and Fatality (SIF) Precursors** using a tiered NLP classifier, and surfaces them in a priority triage queue — replacing 45-day manual review lag with **< 5-second AI classification**.

### Key Capabilities
| Feature | Detail |
|---|---|
| **SIF Classification** | HIGH / MEDIUM / LOW / UNCERTAIN — Tier 2 rule-based (instant) → Tier 1 DistilBERT (when `SIF_MODEL_PATH` set) |
| **Evidence Highlighting** | Inline yellow-highlighted spans showing exact triggering phrases |
| **Counterfactual Delta** | Barrier proximity score: "CRITICAL — 1 barrier from fatality" |
| **IOGP Life-Saving Rules** | 7 rule categories auto-tagged per report |
| **Active Learning** | Human reviews rebuild keyword boosts in real time |
| **Priority Queue** | Sorted by SIF-Potential × Confidence — bulk triage with multi-select |
| **Duplicate Detection** | Jaccard similarity flags recurring same-site systemic patterns |
| **Hero Demo Reports** | Top-3 highest-confidence HIGH SIF pinned at queue top |
| **Similar SIF Callout** | Cross-report rule-tag similarity on every report detail |

---

## Quick Start

### Requirements
- Python 3.10+
- Node.js 22+ (bundled at `d:/SIH2026/Welware/node-v22.11.0-win-x64/`)
- No GPU or internet required — fully offline

### 1 — Start Backend
```powershell
cd d:/SIH2026/Welware/backend
# Activate venv if needed: .\venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8000
```
Backend starts at **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

### 2 — Start Frontend
```powershell
cd d:/SIH2026/Welware/frontend
$env:Path = "d:\SIH2026\Welware\node-v22.11.0-win-x64;$env:Path"
npm run dev
```
Frontend starts at **http://localhost:5173**

### 3 — Login
| Role | Email | Password |
|---|---|---|
| HSE Officer | `hse@oil.in` | `prevora2026` |
| Admin | `admin@oil.in` | `admin2026` |

---

## Evaluator Demo Walkthrough

### Recommended 8-minute evaluator script

**Step 1 — Dashboard Overview** *(2 min)*  
Navigate to `http://localhost:5173` → Login → Dashboard  
- Show **SIF Density: 15.1%** and IOGP rule breakdown  
- Click "Energy Isolation (LOTO)" bar → filters Queue automatically  
- Show **Classifier Intelligence panel**: tier badge, keyword chips, review rate

**Step 2 — Priority Queue + Hero Reports** *(1.5 min)*  
Navigate to **Queue** tab  
- Hero cards (amber border) pinned at top — click **Report #50** (Rig-11, 85% conf)  
- Show inline evidence highlighting + counterfactual delta  
- Click **Confirm SIF** → active learning refreshes keywords  
- Back to Queue → **multi-select 3 reports** → bulk flag as "Needs Review"

**Step 3 — Edge Cases** *(2 min)*  
Use Queue filter: **Site = Well-W-31**  
- Open "Wellhead Valve Handwheel" report (EC-4) → minor laceration, but **HIGH SIF**  
  - Point out: *"PREVORA flags latent potential — a safety system would miss this as first-aid only"*  
- Notice **amber banner**: "Recurring same-site pattern — 2 similar reports from Well-W-31"  
- Second Well-W-31 report (EC-5) = duplicate of same systemic failure across shifts  

Filter: **Site = Pump House P-3**  
- EC-3 (fire extinguisher) → correctly classified **LOW** — show it's filtered out of HIGH queue

**Step 4 — Real-Time Classification** *(1.5 min)*  
Navigate to **Classify** tab  
- Paste: *"Worker entered H2S zone without detector. Area concentration 18ppm. No standby man."*  
- Click **Analyse Only** → **HIGH SIF, 80% conf, Confined Space Entry**  
- Show classifier tier badge: "📐 Rule-Based (Tier 2)"  
- Click **Analyse & Submit** → report ingested, appears in Queue instantly

**Step 5 — Active Learning** *(1 min)*  
Back to Dashboard → **Sync Reviews** button  
- Confirmed SIF keywords now listed: `pressure`, `isolation`, `bypass`…  
- Explain: "Each confirmation trains the active learning engine — keyword frequency boosts"

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Version, classifier tier |
| POST | `/api/v1/auth/login` | JWT authentication |
| GET | `/api/v1/reports/` | Paginated report list with filters |
| POST | `/api/v1/classify/` | Ad-hoc classification (no persist) |
| POST | `/api/v1/ingest/` | Classify + persist in one call |
| PATCH | `/api/v1/reports/{id}/review` | Human confirm/reject + AL refresh |
| POST | `/api/v1/reports/bulk-review` | Batch triage multiple reports |
| GET | `/api/v1/reports/hero` | Top-3 demo hero reports |
| GET | `/api/v1/reports/{id}/similar` | Similar SIF by rule-tag overlap |
| POST | `/api/v1/reports/{id}/check-duplicate` | Jaccard duplicate detection |
| GET | `/api/v1/dashboard/summary` | Aggregate SIF statistics |
| GET | `/api/v1/dashboard/rule-distribution` | IOGP rule frequency |
| GET | `/api/v1/dashboard/site-ranking` | Site SIF-density table |
| GET | `/api/v1/feedback/stats` | Active learning statistics |
| POST | `/api/v1/admin/reclassify-all` | Batch re-classify all reports |
| GET | `/api/v1/demo/walkthrough` | Ordered evaluator demo sequence |
| GET | `/api/v1/demo/edge-cases` | 5 canonical edge-case reports |
| GET | `/api/v1/demo/stats` | Real-time presentation snapshot |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  React + Vite Frontend                   │
│  Dashboard │ Priority Queue │ Classify │ Report Detail   │
└──────────────────────┬───────────────────────────────────┘
                       │ REST / JSON
┌──────────────────────▼───────────────────────────────────┐
│                FastAPI Backend (Python)                   │
│  app/api/  reports │ classify │ ingest │ dashboard       │
│             feedback │ extras │ demo                     │
│  app/nlp/  dispatcher → Tier 2 Rule-Based classifier     │
│                    ↳ Tier 1 DistilBERT (when ready)     │
│             active_learning — keyword frequency engine    │
│  app/db/   SQLite (swap to Supabase with DATABASE_URL)   │
└──────────────────────────────────────────────────────────┘
```

### Classifier Tiers
| Tier | Trigger | Latency |
|---|---|---|
| **Tier 1** | `SIF_MODEL_PATH` env var set → DistilBERT | ~200ms |
| **Tier 2** | Default fallback → Rule-Based + Keyword Scoring | **< 1ms** |

### Swapping to Supabase
```bash
export DATABASE_URL="postgresql+asyncpg://user:pass@host/db"
uvicorn app.main:app --port 8000
```

---

## Project Structure

```
Welware/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers
│   │   │   ├── auth.py, reports.py, classify.py, ingest.py
│   │   │   ├── dashboard.py, feedback.py, extras.py, demo.py
│   │   ├── db/           # SQLAlchemy + seed data
│   │   ├── models/       # Report ORM model
│   │   └── nlp/          # classifier, dispatcher, active_learning
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, Queue, Classify, ReportDetail, Login
│   │   ├── components/   # Sidebar, ProtectedRoute
│   │   ├── api.js        # Typed API client
│   │   └── index.css     # Design system tokens
│   └── vite.config.js
└── README.md
```

---

## SIH Compliance Checklist

| Expected Outcome | Status |
|---|---|
| NLP/AI engine detects SIF precursors in UA/UC reports | ✅ Tiered classifier with 7 IOGP rule categories |
| Prioritised queue for safety professionals | ✅ Sorted by SIF-Potential × Confidence |
| Evidence highlighting / explainability | ✅ Inline yellow-highlighted trigger phrases |
| Counterfactual analysis | ✅ Barrier proximity delta (1–4 scale) |
| Human-in-the-loop review workflow | ✅ Confirm / Reject / Flag with notes |
| Active learning from human feedback | ✅ Keyword frequency rebuild on every review |
| Site-level trend aggregation | ✅ Density ranking + IOGP rule bar chart |
| Real-time classification | ✅ < 1ms rule-based, < 200ms transformer |
| Scalable backend | ✅ FastAPI async + SQLite → Supabase swap |
| Responsive web interface | ✅ 1200px → 600px breakpoints |
