import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Shield, Zap, LinkIcon, AlertTriangle, Copy } from 'lucide-react'
import './ReportDetail.css'

function highlightEvidence(text, spans) {
  if (!spans || spans.length === 0) return text
  let result = text
  const sorted = [...spans].sort((a, b) => b.length - a.length)
  sorted.forEach(span => {
    const phrase = span.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (phrase.length < 6) return
    result = result.replace(new RegExp(phrase, 'gi'), (m) => `§§§${m}§§§`)
  })
  return result
}

function HighlightedText({ text, spans }) {
  const marked = highlightEvidence(text, spans)
  const parts = marked.split('§§§')
  return (
    <p className="report-text">
      {parts.map((part, i) => {
        if (i % 2 === 1) return <mark key={i} className="evidence-mark">{part}</mark>
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  const [similar, setSimilar] = useState([])
  const [duplicate, setDuplicate] = useState(null)

  useEffect(() => {
    api.getReport(id)
      .then(r => {
        setReport(r)
        setNotes(r.reviewer_notes || '')
        // Auto-check duplicates after report loads
        api.checkDuplicate(id, r.report_text).then(setDuplicate).catch(() => {})
      })
      .finally(() => setLoading(false))
    api.getSimilarSIF(id).then(setSimilar).catch(() => {})
  }, [id])

  const review = async (status) => {
    setReviewing(true)
    try {
      const updated = await api.reviewReport(id, status, notes)
      setReport(updated)
    } finally {
      setReviewing(false)
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
  if (!report) return <div className="page-loading"><p>Report not found</p></div>

  const tierClass = report.sif_potential.toLowerCase()
  // Safe language: protective barrier gap, not fatality prediction
  const deltaLabels = [
    '',
    'Critical gap — only 1 protective barrier separates this scenario from a serious outcome',
    'High gap — 2 protective barriers remain between this event pattern and a serious outcome',
    'Moderate gap — 3 protective barriers noted as functional',
    'Low gap — 4 or more barriers recorded as functional',
  ]
  const deltaLabel = deltaLabels[Math.min(report.counterfactual_delta, 4)] || 'Barrier gap not assessed'

  return (
    <div className="report-detail fade-in">
      <button className="btn btn-ghost back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back to Queue
      </button>

      {/* Duplicate / Recurring Pattern Banner */}
      {duplicate?.is_duplicate && (
        <div className={`duplicate-banner ${duplicate.same_site_recurring_pattern ? 'duplicate-banner-urgent' : ''}`}>
          <Copy size={15} />
          <span>
            {duplicate.same_site_recurring_pattern
              ? `⚠️ Recurring same-site pattern — ${duplicate.duplicate_count} similar report(s) from this site. ${duplicate.note}`
              : `${duplicate.duplicate_count} similar report(s) found in the system.`
            }
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/queue?site=${encodeURIComponent(report.site)}`)}
          >
            View all from {report.site}
          </button>
        </div>
      )}

      <div className="detail-grid">
        {/* Left: Report Content */}
        <div className="detail-main">
          <div className={`detail-header tier-${tierClass}`}>
            <div className="detail-meta">
              <span className={`badge badge-${tierClass}`}>{report.sif_potential} SIF POTENTIAL</span>
              <span className="report-id">Report #{report.id}</span>
            </div>
            <h2 className="detail-site">{report.site}</h2>
            <p className="detail-activity">{report.activity}</p>
            {(report.sif_potential === 'HIGH' || report.sif_potential === 'MEDIUM') && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 12, alignSelf: 'flex-start', gap: 8 }}
                onClick={() => navigate(`/barrier/${report.id}`)}
              >
                🧀 View Swiss Cheese Barrier Analysis →
              </button>
            )}
          </div>

          {/* Structured Safety Record */}
          <div className="card narrative-card" style={{ marginBottom: 0 }}>
            <div className="narrative-label" style={{ marginBottom: 12 }}>
              <Shield size={14} color="var(--amber)" />
              Structured Safety Record — NLP Extraction
            </div>
            <div className="rd-struct-grid">
              {[
                ['Activity',          report.activity],
                ['Site / Location',   report.site],
                ['SIF Potential',     report.sif_potential],
                ['IOGP Rule',         report.rule_tags?.[0] || 'Not mapped'],
                ['Confidence',        `${(report.confidence * 100).toFixed(0)}%`],
                ['Report Type',       report.report_type || 'Safety Observation'],
              ].map(([k, v]) => (
                <div key={k} className="rd-struct-row">
                  <span className="rd-struct-key">{k}</span>
                  <span className="rd-struct-val">{v}</span>
                </div>
              ))}
            </div>
            {report.evidence_spans?.length > 0 && (
              <div className="rd-why-flagged">
                <div className="rd-why-label">Why is this flagged?</div>
                {report.evidence_spans.slice(0, 3).map((span, i) => (
                  <div key={i} className="rd-why-item">
                    <span className="rd-why-bullet">•</span>
                    <span className="rd-why-text">Evidence: &ldquo;{span}&rdquo;</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card narrative-card">
            <div className="narrative-label">
              <Shield size={14} color="var(--amber)" />
              Full Narrative — Evidence Highlighted
            </div>
            <HighlightedText text={report.report_text} spans={report.evidence_spans} />
          </div>

          {/* Evidence Spans */}
          {report.evidence_spans.length > 0 && (
            <div className="card evidence-card">
              <h3 className="section-label">Extracted Evidence Phrases</h3>
              <div className="evidence-list">
                {report.evidence_spans.map((span, i) => (
                  <span key={i} className="evidence-chip">{span}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Intelligence Panel */}
        <div className="detail-aside">
          {/* Confidence */}
          <div className="card intel-card">
            <h3 className="section-label">Classification Intelligence</h3>
            <div className="conf-display">
              <div className="conf-circle" style={{ '--pct': report.confidence }}>
                <div className="conf-inner">
                  <span className="conf-num">{(report.confidence * 100).toFixed(0)}%</span>
                  <span className="conf-label">Confidence</span>
                </div>
              </div>
              <div className="conf-details">
                <div className="intel-row">
                  <span>SIF Potential</span>
                  <span className={`badge badge-${tierClass}`}>{report.sif_potential}</span>
                </div>
                <div className="intel-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Protective Barrier Gap</span>
                  <span className="delta-label" style={{ color: report.counterfactual_delta <= 1 ? '#ef4444' : report.counterfactual_delta <= 2 ? '#f97316' : 'var(--amber)', fontSize: '0.7rem' }}>
                    {deltaLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* IOGP Rules */}
          <div className="card intel-card">
            <h3 className="section-label">IOGP Life-Saving Rules</h3>
            <div className="rules-list">
              {report.rule_tags.map(tag => (
                <div key={tag} className="rule-item">
                  <Shield size={14} color="var(--amber)" />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Barrier states with UNSTATED clarification */}
          {report.barriers?.length > 0 && (
            <div className="card intel-card">
              <h3 className="section-label">Barrier Assessment</h3>
              <p className="rd-unstated-note">
                <span style={{ color: '#9ca3af', fontWeight: 700 }}>? UNSTATED</span> means the report does
                not mention this control. It is <strong>not</strong> the same as FAILED.
              </p>
              {report.barriers.map(b => (
                <div key={b.id || b.name} className="intel-row">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.short || b.name}</span>
                  <span className={`badge badge-barrier-${(b.state || 'UNSTATED').toLowerCase()}`}>
                    {b.state === 'UNSTATED' ? '?' : b.state === 'FAILED' ? '✕' : b.state === 'INTACT' ? '✓' : '—'} {b.state}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Review Actions */}
          <div className="card intel-card">
            <h3 className="section-label">Human-in-the-Loop Review</h3>
            <div className="review-status-row">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Current:</span>
              <span className={`badge badge-${report.review_status === 'CONFIRMED_SIF' ? 'confirmed' : report.review_status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                {report.review_status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="notes-toggle" onClick={() => setShowNotes(v => !v)}>
              <AlertCircle size={13} /> {showNotes ? 'Hide' : 'Add'} reviewer notes
            </div>
            {showNotes && (
              <textarea
                className="review-notes"
                placeholder="Notes for audit trail…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            )}

            <div className="review-actions">
              <button
                id={`confirm-sif-${id}`}
                className="btn btn-success"
                onClick={() => review('CONFIRMED_SIF')}
                disabled={reviewing}
              >
                <CheckCircle size={16} />
                Confirm SIF
              </button>
              <button
                id={`reject-sif-${id}`}
                className="btn btn-danger"
                onClick={() => review('REJECTED')}
                disabled={reviewing}
              >
                <XCircle size={16} />
                Disagree
              </button>
              <button
                id={`flag-review-${id}`}
                className="btn btn-ghost"
                onClick={() => review('NEEDS_REVIEW')}
                disabled={reviewing}
              >
                Flag
              </button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="card intel-card">
            <h3 className="section-label">Timestamps</h3>
            <div className="intel-row"><span>Submitted</span><span>{new Date(report.created_at).toLocaleString()}</span></div>
            {report.reviewed_at && <div className="intel-row"><span>Reviewed</span><span>{new Date(report.reviewed_at).toLocaleString()}</span></div>}
          </div>
          {/* Similar Confirmed SIF callout — Active Learning */}
          {similar.length > 0 && (
            <div className="card intel-card similar-card">
              <h3 className="section-label">
                <LinkIcon size={13} /> Similar Confirmed SIF Incidents
              </h3>
              <p className="similar-sub">Reports with matching IOGP rule tags — confirmed by human reviewers</p>
              {similar.map(s => (
                <div
                  key={s.id}
                  className="similar-row"
                  onClick={() => navigate(`/report/${s.id}`)}
                >
                  <div className="similar-meta">
                    <span className={`badge badge-${s.sif_potential.toLowerCase()}`}>{s.sif_potential}</span>
                    <span className="similar-site">{s.site} · {s.activity}</span>
                    <span className="similar-conf">{(s.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="similar-excerpt">{s.excerpt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
