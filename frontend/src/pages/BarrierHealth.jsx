import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ShieldAlert, TrendingDown, AlertTriangle, CheckCircle2, TrendingUp, Minus, X as XIcon, Zap, BookOpen } from 'lucide-react'
import './BarrierHealth.css'

const COLOR_ICON = { green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴' }
const COLOR_LABEL = { green: 'Healthy', yellow: 'Weakening', orange: 'Degraded', red: 'Critical' }

function HealthCell({ score, color, intact, failed, unstated, onClick }) {
  return (
    <button
      className={`hm-cell hm-cell-${color}`}
      onClick={onClick}
      title={`Score: ${score} | Intact: ${intact} | Failed: ${failed} | Unstated: ${unstated}`}
    >
      <span className="hm-cell-icon">{COLOR_ICON[color]}</span>
      <span className="hm-cell-score">{Math.round(score)}</span>
    </button>
  )
}

function OrgBarrierBar({ barrier }) {
  const w = Math.max(4, Math.round(barrier.score))
  const clr = {
    green: '#22c55e', yellow: '#eab308', orange: '#f59e0b', red: '#ef4444'
  }[barrier.color]
  const trendIcon = barrier.trend === 'up'
    ? <TrendingUp size={13} color="#22c55e" />
    : barrier.trend === 'down'
    ? <TrendingDown size={13} color="#ef4444" />
    : <Minus size={13} color="#6b7280" />
  const trendLabel = barrier.trend === 'up'
    ? `+${barrier.trend_delta}` : barrier.trend === 'down'
    ? `${barrier.trend_delta}` : '→'
  return (
    <div className="org-bar-row">
      <div className="org-bar-label">{barrier.short}</div>
      <div className="org-bar-track">
        <div className="org-bar-fill" style={{ width: `${w}%`, background: clr }} />
      </div>
      <div
        className="org-bar-score"
        style={{ color: clr }}
        title={`Health score (0–100): ${Math.round(barrier.score)} · Lower score = more barrier failures detected`}
      >
        {Math.round(barrier.score)}
      </div>
      <span className={`org-bar-status status-${barrier.color}`}>{COLOR_LABEL[barrier.color]}</span>
      <span
        className="org-bar-trend"
        title={`90-day change: ${trendLabel} points · Compared against earlier reporting period`}
      >
        {trendIcon}
        <span style={{ color: barrier.trend === 'up' ? '#22c55e' : barrier.trend === 'down' ? '#ef4444' : '#6b7280', fontSize: '0.62rem', fontWeight: 700 }}>
          {trendLabel}
        </span>
      </span>
    </div>
  )
}

/* ─── Barrier Drill-Down Panel ───────────────────────────────────────────── */
function BarrierDrillPanel({ barrierId, site, onClose, navigate }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setDetail(null)
    api.getBarrierDetail(barrierId, site)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [barrierId, site])

  const trendIcon = detail?.trend === 'up'
    ? <TrendingUp size={13} color="#22c55e" />
    : detail?.trend === 'down'
    ? <TrendingDown size={13} color="#ef4444" />
    : <Minus size={13} color="#6b7280" />

  return (
    <div className="drill-panel">
      <div className="drill-header">
        <div className="drill-title-block">
          <span className="drill-label">BARRIER DRILL-DOWN</span>
          {detail && (
            <span className={`drill-status-badge badge-${detail.color}`}>
              {COLOR_LABEL[detail.color]?.toUpperCase()}
            </span>
          )}
        </div>
        <button className="sim-close" onClick={onClose}><XIcon size={15} /></button>
      </div>

      {loading && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2, margin: '0 auto' }} />
        </div>
      )}

      {detail && !loading && (
        <div className="drill-body">
          <div className="drill-name">{detail.barrier_name}</div>
          <div className="drill-site">{detail.site}</div>

          <div className="drill-counts">
            <div className="drill-count dc-total">
              <span className="dc-num">{detail.total_reports}</span>
              <span className="dc-lbl">Reports</span>
            </div>
            <div className="drill-count dc-failed">
              <span className="dc-num">{detail.failed}</span>
              <span className="dc-lbl">🔴 Failed</span>
            </div>
            <div className="drill-count dc-unstated">
              <span className="dc-num">{detail.unstated}</span>
              <span className="dc-lbl">🟡 Unstated</span>
            </div>
            <div className="drill-count dc-intact">
              <span className="dc-num">{detail.intact}</span>
              <span className="dc-lbl">🟢 Intact</span>
            </div>
          </div>

          <div className="drill-score-row">
            <div>
              <div
                className="drill-score-val"
                style={{ color: detail.color === 'red' ? '#ef4444' : detail.color === 'orange' ? '#f59e0b' : '#22c55e' }}
              >
                {Math.round(detail.score)}<span className="drill-score-max">/100</span>
              </div>
              <div className="drill-score-lbl">Barrier Health Score</div>
            </div>
            <div className="drill-trend">
              {trendIcon}
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                {detail.trend === 'stable' ? 'Stable' : `${detail.trend_delta > 0 ? '+' : ''}${detail.trend_delta} pts`}
              </span>
              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>vs earlier reports</span>
            </div>
          </div>

          {detail.evidence_spans?.length > 0 && (
            <div className="drill-evidence">
              <div className="drill-section-label">Evidence from reports</div>
              {detail.evidence_spans.map((span, i) => (
                <blockquote key={i} className="drill-quote">"{span}"</blockquote>
              ))}
            </div>
          )}

          <div className="drill-intervention">
            <div className="drill-section-label">Suggested Intervention</div>
            <p className="drill-int-text">{detail.intervention}</p>
          </div>

          <div className="drill-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/queue?site=${encodeURIComponent(site)}`)}
            >
              View Reports →
            </button>
            <div className="drill-confidence">Confidence: {detail.confidence}%</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Gap 2: Simulate Intervention Modal ─────────────────────────────────── */
function SimulateModal({ zone, onClose }) {
  const [simData, setSimData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.simulateIntervention(zone.site)
      .then(setSimData)
      .finally(() => setLoading(false))
  }, [zone.site])

  return (
    <div className="sim-overlay" onClick={onClose}>
      <div className="sim-modal" onClick={e => e.stopPropagation()}>
        <div className="sim-header">
          <Zap size={18} color="var(--amber)" />
          <span>Barrier Scenario Simulation — <strong>{zone.site}</strong></span>
          <button className="sim-close" onClick={onClose}><XIcon size={16} /></button>
        </div>

        {loading && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, margin: '0 auto' }} />
          </div>
        )}

        {simData && !loading && (
          <>
            <div className="sim-current">
              Current system health score: <strong style={{ color: '#ef4444' }}>{simData.current_avg_health}</strong> / 100
            </div>
            <div className="sim-options">
              {simData.options?.map(opt => (
                <div key={opt.option} className={`sim-option ${opt.recommended ? 'sim-recommended' : ''}`}>
                  <div className="sim-opt-header">
                    <span className="sim-opt-label">Option {opt.option}</span>
                    {opt.recommended && <span className="sim-rec-badge">★ Recommended</span>}
                  </div>
                  <div className="sim-opt-action">{opt.label}</div>
                  <div className="sim-opt-scores">
                    <span className="sim-score sim-before">{simData.current_avg_health}</span>
                    <span className="sim-arrow">→</span>
                    <span className="sim-score sim-after">{opt.projected_score}</span>
                    <span className="sim-delta">+{opt.improvement} pts</span>
                  </div>
                  <div className="sim-bar-track">
                    <div className="sim-bar-before" style={{ width: `${simData.current_avg_health}%` }} />
                    <div className="sim-bar-after" style={{ width: `${opt.projected_score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="sim-disclaimer">
              <strong>⚠️ Scenario Estimate — Not a causal prediction.</strong> Scores represent estimated barrier health improvement based on observed failure patterns. Actual outcomes depend on field verification and compliance.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function ConvergenceCard({ zone, navigate }) {
  const [showSim, setShowSim] = useState(false)
  return (
    <>
      {showSim && <SimulateModal zone={zone} onClose={() => setShowSim(false)} />}
      <div className={`convergence-card ${zone.severity === 'CRITICAL' ? 'conv-critical' : 'conv-warning'}`}>
        <div className="conv-header">
          <AlertTriangle size={16} />
          <span className="conv-site">{zone.site}</span>
          <span className={`conv-badge ${zone.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
            {zone.severity}
          </span>
        </div>
        <div className="conv-stat">
          <strong>{zone.degrading_count}/{zone.total_barriers}</strong> barriers degrading
          · {zone.high_sif} HIGH SIF reports
        </div>
        <div className="conv-confidence">
          Confidence: {Math.min(99, 55 + zone.high_sif * 4)}% · based on {zone.high_sif} SIF reports, {zone.degrading_count} barrier states
        </div>
        <div className="conv-barriers">
          {zone.red_barriers.map(b => (
            <span key={b} className="conv-chip conv-chip-red">🔴 {b}</span>
          ))}
          {zone.orange_barriers.map(b => (
            <span key={b} className="conv-chip conv-chip-orange">🟠 {b}</span>
          ))}
        </div>
        <div className="conv-insight">
          {zone.degrading_count >= 4
            ? '⚠️ Multiple independent protection layers are simultaneously failing at this site. Immediate HSE review required.'
            : `${zone.degrading_count} protective barriers showing degraded evidence patterns.`
          }
        </div>
        <div className="conv-actions">
          <button
            className="btn btn-primary conv-btn"
            onClick={() => navigate(`/queue?site=${encodeURIComponent(zone.site)}`)}
          >
            Investigate {zone.site.split(' ')[0]} →
          </button>
          <button
            className="btn btn-ghost conv-btn"
            onClick={() => setShowSim(true)}
            style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
          >
            ⚡ Simulate Intervention
          </button>
        </div>
      </div>
    </>
  )
}

export default function BarrierHealth() {
  const [data, setData] = useState(null)
  const [convergence, setConvergence] = useState([])
  const [loading, setLoading] = useState(true)
  const [drillTarget, setDrillTarget] = useState(null) // { barrierId, site }
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.getBarrierMatrix(),
      api.getConvergenceZones(),
    ]).then(([matrix, conv]) => {
      setData(matrix)
      setConvergence(conv)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.82rem' }}>
        Computing barrier health across all sites…
      </p>
    </div>
  )
  if (!data) return null

  const barriers = data.barriers
  const sites = data.sites

  return (
    <div className="bh-page fade-in">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="bh-header">
        <div className="bh-title-row">
          <ShieldAlert size={24} color="var(--amber)" />
          <div>
            <h1 className="bh-title">PREVORA — Safety Defence Monitor</h1>
            <p className="bh-sub">
              Continuously updated map of how critical safety barriers are performing across all OIL sites
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="bh-stats">
        <div className="card bh-stat">
          <div className="bh-stat-val">{data.total_reports}</div>
          <div className="bh-stat-lbl">Reports Analyzed</div>
          <CheckCircle2 size={18} color="#22c55e" style={{ marginTop: 4 }} />
        </div>
        <div className="card bh-stat">
          <div className="bh-stat-val amber">{data.sif_reports}</div>
          <div className="bh-stat-lbl">SIF Candidates</div>
          <span style={{ fontSize: '1.2rem', marginTop: 4 }}>⚠️</span>
        </div>
        <div className="card bh-stat">
          <div className="bh-stat-val red">{data.degrading_barriers}</div>
          <div className="bh-stat-lbl">Degrading Barriers</div>
          <TrendingDown size={18} color="#ef4444" style={{ marginTop: 4 }} />
        </div>
        <div className="card bh-stat">
          <div className="bh-stat-val" style={{ color: convergence.length > 0 ? '#ef4444' : '#22c55e' }}>
            {convergence.length}
          </div>
          <div className="bh-stat-lbl">Convergence Zones</div>
          <span style={{ fontSize: '1.2rem', marginTop: 4 }}>
            {convergence.length > 0 ? '🚨' : '✅'}
          </span>
        </div>
      </div>

      <div className="bh-main">
        {/* ── Left: Barrier Health Map ─────────────────────────────── */}
        <div className="bh-left">
          {/* Organisation-level bars */}
          <div className="card bh-org-card">
            <h2 className="section-label" style={{ marginBottom: 6 }}>
              Organisation-Wide Barrier Health
            </h2>
            <div className="bh-legend-row">
              Score = 0–100 barrier health index (hover score for detail) · Trend = 90-day point change
            </div>
            <div className="org-bars">
              {barriers.map(b => (
                <OrgBarrierBar key={b.id} barrier={data.org_health[b.id]} />
              ))}
            </div>
          </div>

          {/* Site × Barrier matrix */}
          <div className="card bh-matrix-card">
            <h2 className="section-label" style={{ marginBottom: 14 }}>
              Site × Barrier Health Map
            </h2>
            <p className="matrix-hint">Click any cell to drill down · Score 0–100 · Lower = more failures detected</p>
            <div className="bh-matrix">
              {/* Header row */}
              <div className="hm-row hm-header-row">
                <div className="hm-site-label">Site</div>
                {barriers.map(b => (
                  <div key={b.id} className="hm-col-header" title={b.name}>
                    {b.short}
                  </div>
                ))}
                <div className="hm-col-header">Reports</div>
              </div>

              {/* Data rows */}
              {sites.map(site => (
                <div
                  key={site.site}
                  className={`hm-row ${site.degrading_count >= 3 ? 'hm-row-convergence' : ''}`}
                >
                  <div className="hm-site-label">
                    {site.degrading_count >= 3 && <span className="convergence-dot" title="Convergence zone" />}
                    <span className="site-name">{site.site.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {site.high_sif > 0 && (
                      <span className="site-high-badge">{site.high_sif} HIGH</span>
                    )}
                  </div>
                  {barriers.map(b => {
                    const cell = site.barriers[b.id]
                    const isActive = drillTarget?.barrierId === b.id && drillTarget?.site === site.site
                    return (
                      <HealthCell
                        key={b.id}
                        {...cell}
                        active={isActive}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDrillTarget(
                            isActive ? null : { barrierId: b.id, site: site.site }
                          )
                        }}
                      />
                    )
                  })}
                  <div className="hm-total-cell">
                    <span className="hm-total">{site.total_reports}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="matrix-legend">
              <span>Health Score:</span>
              {Object.entries(COLOR_LABEL).map(([c, l]) => (
                <span key={c} className="legend-item">
                  {COLOR_ICON[c]} {l}
                  {c === 'green' ? ' (≥80)' : c === 'yellow' ? ' (60–79)' : c === 'orange' ? ' (40–59)' : ' (<40)'}
                </span>
              ))}
              <span className="legend-item">
                <span className="convergence-dot" /> = Convergence Zone
              </span>
            </div>
          </div>

          {/* Drill-down panel — appears below matrix when a cell is active */}
          {drillTarget && (
            <BarrierDrillPanel
              barrierId={drillTarget.barrierId}
              site={drillTarget.site}
              onClose={() => setDrillTarget(null)}
              navigate={navigate}
            />
          )}
        </div>

        {/* ── Right: Convergence Zones ─────────────────────────────── */}
        <div className="bh-right">
          <h2 className="section-label" style={{ marginBottom: 12 }}>
            ⚠️ Barrier Convergence Zones
          </h2>
          <p className="conv-explain">
            Sites where <strong>3 or more independent protective barriers</strong> are simultaneously showing
            degraded evidence. These represent the <strong>strongest observed convergence of degraded protective
            barriers in the current dataset</strong> — not an absolute organizational risk ranking, but the
            clearest signal of concurrent defence-layer deterioration.
          </p>
          {convergence.length === 0 ? (
            <div className="card conv-empty">
              <CheckCircle2 size={28} color="#22c55e" />
              <p>No convergence zones detected. All sites have fewer than 3 simultaneously degrading barriers.</p>
            </div>
          ) : (
            <div className="convergence-list">
              {convergence.map(zone => (
                <ConvergenceCard key={zone.site} zone={zone} navigate={navigate} />
              ))}
            </div>
          )}

          {/* Evidence Ledger */}
          <div className="card conv-info evidence-ledger">
            <h3 className="section-label">
              <BookOpen size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              PREVORA Evidence Ledger
            </h3>
            {(() => {
              const allObs = data.sites.reduce((acc, s) =>
                acc + Object.values(s.barriers).reduce((a, b) => a + b.intact + b.failed + b.unstated, 0), 0)
              const failedObs = data.sites.reduce((acc, s) =>
                acc + Object.values(s.barriers).reduce((a, b) => a + b.failed, 0), 0)
              const unstatedObs = data.sites.reduce((acc, s) =>
                acc + Object.values(s.barriers).reduce((a, b) => a + b.unstated, 0), 0)
              return (
                <div className="ledger-rows">
                  <div className="ledger-row"><span>{data.total_reports}</span> reports analyzed</div>
                  <div className="ledger-row"><span>{allObs}</span> barrier state observations extracted</div>
                  <div className="ledger-row red-ledger"><span>{failedObs}</span> evidence-backed failure states</div>
                  <div className="ledger-row muted-ledger"><span>{unstatedObs}</span> unstated (silent risk) states</div>
                  <div className="ledger-row"><span>{convergence.length}</span> convergence zones detected</div>
                </div>
              )
            })()}
            <p className="ledger-note">
              Every AI conclusion is linked to source evidence — any decision can be traced back to the original safety report.
            </p>
          </div>

          {/* About Convergence */}
          <div className="card conv-info">
            <h3 className="section-label">📐 About Barrier Convergence</h3>
            <p>
              Based on James Reason's Swiss Cheese model — a fatality occurs when holes in
              multiple independent barriers align. PREVORA detects when those holes are forming
              simultaneously, before alignment occurs.
            </p>
            <p style={{ marginTop: 8, color: 'var(--amber)', fontWeight: 600, fontSize: '0.8rem' }}>
              "We are not claiming a fatality will happen. We are detecting that multiple
              independent protective barriers are simultaneously showing degraded evidence."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
