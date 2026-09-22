import { useState } from 'react'
import { api } from '../api'
import { FlaskConical, Sparkles, Save } from 'lucide-react'
import './Classify.css'

export default function Classify() {
  const [text, setText] = useState('')
  const [site, setSite] = useState('')
  const [activity, setActivity] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleClassify = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      const res = await api.classify(text.trim(), site || 'Unknown', activity || 'Unknown')
      setResult(res)
    } catch {
      setError('Classification failed. Ensure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleIngest = async () => {
    if (!text.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.ingest(text.trim(), site || 'Unknown', activity || 'Unknown')
      setSaved(true)
    } catch {
      setError('Failed to save report to database.')
    } finally {
      setSaving(false)
    }
  }

  const tierClass = result?.sif_potential?.toLowerCase()

  return (
    <div className="classify-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Classify Report</h1>
          <p className="page-sub">Paste any safety report text for instant SIF-potential analysis</p>
        </div>
      </div>

      <div className="classify-grid">
        {/* Form */}
        <form onSubmit={handleClassify} className="card classify-form">
          <div className="field">
            <label>Report Narrative *</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the full safety report text here (UA, UC, near-miss, or incident narrative)…"
              rows={10}
              required
              className="narrative-input"
            />
          </div>
          <div className="classify-meta-row">
            <div className="field">
              <label>Site (optional)</label>
              <input type="text" value={site} onChange={e => setSite(e.target.value)} placeholder="e.g. Rig-04" />
            </div>
            <div className="field">
              <label>Activity (optional)</label>
              <input type="text" value={activity} onChange={e => setActivity(e.target.value)} placeholder="e.g. Pressure Testing" />
            </div>
          </div>
          {error && <p className="login-error">{error}</p>}
          {saved && <p className="save-success">✅ Report saved to database and queued for review.</p>}
          <div className="classify-actions">
            <button type="submit" className="btn btn-primary classify-btn" disabled={loading || !text.trim()}>
              {loading ? <span className="spinner" /> : <><Sparkles size={16} /> Analyse Only</>}
            </button>
            <button type="button" className="btn btn-ghost classify-btn" disabled={saving || !text.trim()} onClick={handleIngest}>
              {saving ? <span className="spinner" /> : <><Save size={16} /> Analyse & Submit</>}
            </button>
          </div>
        </form>

        {/* Result */}
        <div className="classify-result">
          {!result && !loading && (
            <div className="result-placeholder card">
              <FlaskConical size={40} color="var(--text-muted)" />
              <p>Classification result will appear here</p>
            </div>
          )}

          {loading && (
            <div className="result-placeholder card">
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
              <p>Analysing report…</p>
            </div>
          )}

          {result && (
            <div className={`result-card card tier-border-${tierClass}`}>
              <div className="result-header">
                <span className={`badge badge-${tierClass} result-badge`}>{result.sif_potential} SIF POTENTIAL</span>
                <span className="result-conf">{(result.confidence * 100).toFixed(1)}% confidence</span>
                <span className="badge badge-rule tier-badge">
                  {result.classifier_tier === 'TIER1_TRANSFORMER' ? '🤖 Transformer' : '📐 Rule-Based'}
                </span>
              </div>

              <div className="result-delta">
                <div className="delta-row">
                  <span>Counterfactual Delta</span>
                  <span className="delta-value" style={{ color: result.counterfactual_delta <= 1 ? '#ef4444' : result.counterfactual_delta <= 2 ? '#f97316' : 'var(--amber)' }}>
                    {result.barrier_proximity_label}
                  </span>
                </div>
              </div>

              <div className="result-section">
                <span className="section-label">IOGP Life-Saving Rules</span>
                <div className="rules-list">
                  {result.rule_tags.map(tag => (
                    <div key={tag} className="rule-item">🛡️ {tag}</div>
                  ))}
                </div>
              </div>

              {result.evidence_spans.length > 0 && (
                <div className="result-section">
                  <span className="section-label">Evidence Spans</span>
                  <div className="evidence-list">
                    {result.evidence_spans.map((span, i) => (
                      <span key={i} className="evidence-chip">{span}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="result-safety-note">
                {result.sif_potential === 'UNCERTAIN' || result.confidence < 0.65 ? (
                  <p>⚠️ Low confidence — this report is flagged for mandatory human review.</p>
                ) : (
                  <p>✅ Classification complete. Review by an HSE officer is recommended for High and Medium cases.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
