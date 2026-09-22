import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ShieldAlert, ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import './BarrierModel.css'

/* ─── Barrier definitions ────────────────────────────────────────────────── */
const ALL_BARRIERS = [
  {
    id: 'permit',
    name: 'Permit to Work (PTW)',
    keywords: ['ptw', 'permit', 'hot work permit', 'work permit'],
    failKeywords: ['no permit', 'without permit', 'bypass', 'skipped', 'no ptw'],
    icon: '📋',
    desc: 'Formal written system for controlling hazardous work',
  },
  {
    id: 'isolation',
    name: 'Energy Isolation (LOTO)',
    keywords: ['isolation', 'loto', 'lockout', 'tagout', 'de-energised', 'valve closed', 'isolated'],
    failKeywords: ['no isolation', 'assumed closed', 'not isolated', 'live', 'pressurised', 'bypass', 'loto not done'],
    icon: '🔒',
    desc: 'Isolate all energy sources before work begins',
  },
  {
    id: 'gas',
    name: 'Atmospheric / Gas Testing',
    keywords: ['gas test', 'atmospheric test', 'h2s monitor', 'gas detector', 'lel check', 'gas reading'],
    failKeywords: ['no gas test', 'without test', 'no detector', 'no monitor', 'not tested', 'gas not checked'],
    icon: '🌬️',
    desc: 'Verify atmosphere is safe before confined space entry',
  },
  {
    id: 'supervision',
    name: 'Supervision / Standby',
    keywords: ['supervisor', 'standby man', 'attendant', 'watch', 'buddy'],
    failKeywords: ['no standby', 'no supervisor', 'absent', 'alone', 'no attendant', 'unsupervised'],
    icon: '👷',
    desc: 'Competent person present during high-risk tasks',
  },
  {
    id: 'ppe',
    name: 'Personal Protective Equipment',
    keywords: ['ppe', 'helmet', 'harness', 'gloves', 'safety belt', 'respirator', 'scba'],
    failKeywords: ['no ppe', 'without helmet', 'no harness', 'no safety belt', 'missing ppe', 'ppe not worn'],
    icon: '🦺',
    desc: 'Last line of physical defence against injury',
  },
  {
    id: 'procedure',
    name: 'Safe Work Procedure / SOP',
    keywords: ['procedure', 'sop', 'jsa', 'risk assessment', 'method statement', 'work instruction'],
    failKeywords: ['no procedure', 'not followed', 'deviated', 'skipped steps', 'improvised', 'no jsa'],
    icon: '📝',
    desc: 'Documented safe method for performing the task',
  },
]

function assessBarrier(barrier, reportText) {
  const text = reportText.toLowerCase()
  const hasEvidence = barrier.keywords.some(k => text.includes(k))
  const hasFail = barrier.failKeywords.some(k => text.includes(k))

  if (hasFail) return { status: 'FAILED', label: 'FAILED — Hole Present' }
  if (hasEvidence) return { status: 'INTACT', label: 'INTACT' }
  return { status: 'UNKNOWN', label: 'No mention — assumed absent' }
}

function BarrierSlice({ barrier, assessment, index, visible }) {
  const STATUS_COLOR = {
    FAILED:  { bg: 'rgba(239,68,68,0.15)',  border: '#ef4444', text: '#ef4444', hole: true },
    INTACT:  { bg: 'rgba(34,197,94,0.12)',  border: '#22c55e', text: '#22c55e', hole: false },
    UNKNOWN: { bg: 'rgba(245,158,11,0.10)', border: '#f59e0b', text: '#f59e0b', hole: true },
  }
  const c = STATUS_COLOR[assessment.status]

  return (
    <div
      className={`barrier-slice ${visible ? 'slice-visible' : ''}`}
      style={{ animationDelay: `${index * 0.12}s`, borderColor: c.border, background: c.bg }}
    >
      {/* Cheese hole visual */}
      {c.hole && (
        <div className="cheese-hole">
          <div className="hole-inner" />
        </div>
      )}

      <div className="slice-left">
        <span className="slice-icon">{barrier.icon}</span>
        <div>
          <div className="slice-name">{barrier.name}</div>
          <div className="slice-desc">{barrier.desc}</div>
        </div>
      </div>

      <div className="slice-right">
        <span className={`slice-status status-${assessment.status.toLowerCase()}`} style={{ color: c.text }}>
          {assessment.status === 'FAILED'
            ? <><XCircle size={14} /> {assessment.label}</>
            : assessment.status === 'INTACT'
            ? <><CheckCircle2 size={14} /> {assessment.label}</>
            : <><AlertTriangle size={14} /> {assessment.label}</>
          }
        </span>
      </div>
    </div>
  )
}

export default function BarrierModel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [siteHealth, setSiteHealth] = useState(null)

  useEffect(() => {
    api.getReport(id).then(setReport).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (report) {
      setTimeout(() => setVisible(true), 100)
      // Fetch site-level barrier health to show the contribution link
      api.getBarrierMatrix().then(matrix => {
        const found = matrix.sites?.find(s => s.site === report.site)
        if (found) setSiteHealth(found)
      }).catch(() => {})
    }
  }, [report])

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
  if (!report) return null

  const assessments = ALL_BARRIERS.map(b => ({
    barrier: b,
    result: assessBarrier(b, report.report_text),
  }))

  const failCount = assessments.filter(a => a.result.status === 'FAILED').length
  const unknownCount = assessments.filter(a => a.result.status === 'UNKNOWN').length
  const intactCount = assessments.filter(a => a.result.status === 'INTACT').length
  const sifPath = failCount + unknownCount >= 3  // SIF path open if 3+ barriers failed/absent

  return (
    <div className="barrier-page fade-in">
      {/* Back */}
      <button className="btn btn-ghost back-btn" onClick={() => navigate(`/report/${id}`)}>
        <ArrowLeft size={15} /> Back to Report
      </button>

      {/* Header */}
      <div className="barrier-header">
        <div className="bh-left">
          <ShieldAlert size={22} color="var(--amber)" />
          <div>
            <h1 className="barrier-title">Swiss Cheese Barrier Analysis</h1>
            <p className="barrier-sub">
              Report #{id} · {report.site} · {report.activity}
            </p>
          </div>
        </div>
        <div className={`sif-verdict ${sifPath ? 'verdict-open' : 'verdict-blocked'}`}>
          {sifPath
            ? '⚠️ SIF PATH IS OPEN'
            : '✅ SIF PATH BLOCKED'
          }
        </div>
      </div>

      {/* Gap 1 — Site Barrier Health Contribution Strip */}
      {siteHealth && (
        <div className="site-health-strip card">
          <div className="shs-left">
            <span className="shs-label">↳ This report contributes to</span>
            <span className="shs-site">{report.site}</span>
            <span className="shs-label">barrier health scores:</span>
            <div className="shs-scores">
              {Object.entries(siteHealth.barriers).map(([bid, bdata]) => (
                <span key={bid} className={`shs-chip shs-${bdata.color}`}>
                  {bdata.color === 'red' ? '🔴' : bdata.color === 'orange' ? '🟠' : bdata.color === 'yellow' ? '🟡' : '🟢'}
                  {' '}{bid.toUpperCase()} {Math.round(bdata.score)}
                </span>
              ))}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/barrier-health')}
          >
            View Defence Monitor →
          </button>
        </div>
      )}


      <div className="card reason-explainer">
        <div className="re-title">📐 James Reason's Swiss Cheese Model</div>
        <div className="re-body">
          When safety barriers have holes (failures or absences), and those holes align, a hazard
          passes through all layers and causes a Serious Injury or Fatality. PREVORA identifies
          which barriers are intact and which have holes — for every report.
        </div>
        <div className="re-chips">
          <span className="re-chip chip-fail">🔴 {failCount} Failed</span>
          <span className="re-chip chip-unknown">🟡 {unknownCount} Absent / Unknown</span>
          <span className="re-chip chip-intact">🟢 {intactCount} Intact</span>
        </div>
      </div>

      {/* Cheese diagram — visual */}
      <div className="card cheese-diagram">
        <div className="cd-label">HAZARD PATHWAY THROUGH BARRIERS</div>
        <div className="cd-track">
          <div className="cd-hazard">
            <span className="hazard-emoji">☠️</span>
            <span className="hazard-label">HAZARD</span>
          </div>
          <div className="cd-slices-row">
            {assessments.map((a, i) => (
              <div
                key={a.barrier.id}
                className={`cd-barrier-col ${a.result.status === 'FAILED' || a.result.status === 'UNKNOWN' ? 'col-holed' : 'col-solid'}`}
                title={`${a.barrier.name}: ${a.result.label}`}
              >
                <div className="cd-barrier-body">
                  <div className="cd-barrier-icon">{a.barrier.icon}</div>
                  {(a.result.status === 'FAILED' || a.result.status === 'UNKNOWN') && (
                    <div className="cd-barrier-hole" />
                  )}
                </div>
                <div className="cd-barrier-name">{a.barrier.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
          <div className={`cd-outcome ${sifPath ? 'outcome-sif' : 'outcome-safe'}`}>
            <span className="outcome-emoji">{sifPath ? '💀' : '🛡️'}</span>
            <span className="outcome-label">{sifPath ? 'SIF' : 'SAFE'}</span>
          </div>
        </div>
        <div className="cd-arrow-label">Hazard travels left → right through each barrier</div>
      </div>

      {/* Barrier slices — detailed */}
      <div className="barrier-slices">
        <h2 className="section-label" style={{ marginBottom: 12 }}>Barrier-by-Barrier Assessment</h2>
        {assessments.map((a, i) => (
          <BarrierSlice
            key={a.barrier.id}
            barrier={a.barrier}
            assessment={a.result}
            index={i}
            visible={visible}
          />
        ))}
      </div>

      {/* Report text */}
      <div className="card barrier-report-text">
        <div className="section-label" style={{ marginBottom: 8 }}>Original Report</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {report.report_text}
        </p>
      </div>

      {/* What needs to happen */}
      {sifPath && (
        <div className="card barrier-action">
          <h3 className="section-label">🚨 Recommended Interventions</h3>
          <div className="action-list">
            {assessments.filter(a => a.result.status !== 'INTACT').map(a => (
              <div key={a.barrier.id} className="action-item">
                <span className="action-icon">{a.barrier.icon}</span>
                <div>
                  <div className="action-name">{a.barrier.name}</div>
                  <div className="action-fix">
                    Immediate check: verify {a.barrier.name.toLowerCase()} compliance before next entry
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
