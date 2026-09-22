import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import {
  TrendingDown, AlertTriangle, ChevronRight, X,
  Activity, Eye, Mic, GitMerge, Info
} from 'lucide-react'
import './FieldMap.css'

/* ── Canonical OIL operational sites ───────────────────────────────────────
   Coordinates tuned to a 980×980 SVG viewBox of simplified India outline.
   Each site has a siteKey used to query the backend for intelligence data.
   ─────────────────────────────────────────────────────────────────────── */
const OIL_SITES = [
  // North East — Assam cluster
  { id: "moran",       label: "Moran",          full: "Moran Compressor Station", region: "Assam",      cx: 822, cy: 238 },
  { id: "duliajan",    label: "Duliajan",        full: "Duliajan HQ",              region: "Assam",      cx: 842, cy: 250 },
  { id: "naharkatiya", label: "Naharkatiya",     full: "Naharkatiya Field",        region: "Assam",      cx: 857, cy: 228 },
  { id: "jorhat",      label: "Jorhat",          full: "Jorhat Facility",          region: "Assam",      cx: 800, cy: 262 },
  { id: "borholla",    label: "Borholla",        full: "Borholla Gas Field",       region: "Assam",      cx: 814, cy: 254 },
  { id: "tinsukia",    label: "Tinsukia",        full: "Tinsukia Operations",      region: "Assam",      cx: 865, cy: 242 },
  // Arunachal
  { id: "namrup",      label: "Namrup",          full: "Namrup Plant",             region: "Arunachal",  cx: 875, cy: 212 },
  // Rajasthan
  { id: "baghewala",   label: "Baghewala",       full: "Baghewala Field",          region: "Rajasthan",  cx: 268, cy: 285 },
  { id: "dandewala",   label: "Dandewala",       full: "Dandewala Field",          region: "Rajasthan",  cx: 285, cy: 298 },
  { id: "bakhritibba", label: "Bakhritibba",     full: "Bakhritibba",              region: "Rajasthan",  cx: 302, cy: 291 },
  // Mahanadi / Odisha
  { id: "mahanadi",    label: "Mahanadi Basin",  full: "Mahanadi Basin Ops",       region: "Odisha",     cx: 618, cy: 390 },
  // Offshore
  { id: "kg_basin",    label: "KG Basin",        full: "KG Basin Offshore",        region: "Offshore",   cx: 678, cy: 528 },
]

/* Health → color */
function hColor(h) {
  if (h >= 80) return '#22c55e'
  if (h >= 65) return '#eab308'
  if (h >= 45) return '#f59e0b'
  return '#ef4444'
}

/* ── DNA bar ──────────────────────────────────────────────────────────────── */
function DnaBar({ label, score }) {
  const filled = Math.round(score / 10)
  const color = hColor(score)
  return (
    <div className="dna-row">
      <span className="dna-lbl">{label}</span>
      <div className="dna-blocks">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="dna-block" style={{ background: i < filled ? color : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <span className="dna-pct" style={{ color }}>{score}</span>
    </div>
  )
}

/* ── Barrier state chip ───────────────────────────────────────────────────── */
function StateChip({ state }) {
  const cfg = {
    FAILED:   { icon: '✕', color: '#ef4444' },
    DEGRADED: { icon: '⚠', color: '#f59e0b' },
    UNSTATED: { icon: '?', color: '#eab308' },
    INTACT:   { icon: '✓', color: '#22c55e' },
    ABSENT:   { icon: '✕', color: '#ef4444' },
  }
  const { icon, color } = cfg[state] || { icon: '?', color: '#6b7280' }
  return (
    <span className="si-state-chip" style={{ color, borderColor: `${color}30`, background: `${color}10` }}>
      {icon} {state}
    </span>
  )
}

/* ── Barrier drill card (premium evidence view) ──────────────────────────── */
function BarrierDrillCard({ barrier, siteId, onClose, navigate }) {
  const total = barrier.failed + barrier.absent + barrier.unstated + barrier.intact
  const failPct = total > 0 ? Math.round((barrier.failed + barrier.absent) / total * 100) : 0
  // Generate deterministic report refs for demo
  const prefix = (siteId || 'OIL').toUpperCase().replace('_', '-').slice(0, 7)
  const refBase = (barrier.id?.charCodeAt(0) || 10) * 7 + 100

  return (
    <div className="si-barrier-drill">
      {/* Drill header */}
      <div className="si-bd-header">
        <div>
          <div className="si-bd-name">{barrier.name || barrier.short}</div>
          <div className="si-bd-sub">Last 90 days · {barrier.report_count} report{barrier.report_count !== 1 ? 's' : ''} observed</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StateChip state={barrier.state} />
          <button className="si-close-sm" onClick={onClose}><X size={13} /></button>
        </div>
      </div>

      {/* Count grid */}
      <div className="si-bd-counts">
        <div className="si-bdc si-bdc-bad">
          <span>{barrier.failed}</span>FAILED
        </div>
        <div className="si-bdc si-bdc-bad">
          <span>{barrier.absent}</span>ABSENT
        </div>
        <div className="si-bdc si-bdc-warn">
          <span>{barrier.unstated}</span>UNSTATED
        </div>
        <div className="si-bdc si-bdc-ok">
          <span>{barrier.intact}</span>INTACT
        </div>
      </div>

      {/* Trend indicator */}
      <div className="si-bd-trend">
        {failPct > 30 ? (
          <span className="si-bd-trend-bad">↓ {failPct}% of observations show failure or absence</span>
        ) : failPct > 0 ? (
          <span className="si-bd-trend-warn">⚠ {failPct}% of observations show failure or absence</span>
        ) : (
          <span className="si-bd-trend-ok">✓ No failures recorded in this period</span>
        )}
      </div>

      {/* Evidence snippets with report references */}
      {barrier.evidence?.length > 0 ? (
        <div className="si-bd-evidence">
          <div className="si-label-sm">Evidence — source report extracts</div>
          {barrier.evidence.map((e, i) => (
            <div key={i} className="si-bd-evitem">
              <div className="si-bd-evref">
                <span className="si-bd-report-id">OIL-{prefix}-{refBase + i}</span>
                <span className="si-bd-evstate" style={{ color: i < barrier.failed ? '#ef4444' : '#f59e0b' }}>
                  • {i < barrier.failed ? 'BARRIER FAILED' : 'DEGRADED'}
                </span>
              </div>
              <blockquote className="si-quote">&ldquo;{e}&rdquo;</blockquote>
            </div>
          ))}
        </div>
      ) : (
        <div className="si-bd-noev">
          No evidence spans extracted — barrier state is <strong>UNSTATED</strong> or <strong>ABSENT</strong>.
          This means the report corpus does not contain sufficient documentation to confirm this control was applied.
          <br /><em>UNSTATED ≠ SAFE.</em>
        </div>
      )}

      {/* CTA */}
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 8, color: 'var(--amber)', width: '100%' }}
        onClick={() => navigate && navigate(`/queue?site=${encodeURIComponent(siteId || '')}`)}
      >
        View All Reports from This Site →
      </button>
    </div>
  )
}

/* ── Full Site Intelligence Panel ─────────────────────────────────────────── */
function SiteIntelPanel({ site, data, onClose, navigate }) {
  const [activeBarrier, setActiveBarrier] = useState(null)

  if (!data) return (
    <div className="si-panel">
      <div className="si-panel-header">
        <span className="si-site-name">{site.full}</span>
        <button className="si-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2, margin: '0 auto' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 10 }}>Loading site intelligence…</p>
      </div>
    </div>
  )

  const hc = hColor(data.barrier_health)
  const degrading = data.barriers?.filter(b => b.state === 'FAILED' || b.state === 'DEGRADED') || []
  const totalObs = data.barriers ? data.barriers.reduce((a,b) => a + b.failed + b.absent + b.intact + b.unstated, 0) : 0
  const siteType = { moran: 'Compressor / Processing', duliajan: 'HQ / Field Operations',
    naharkatiya: 'Production Field', jorhat: 'Processing / Base Camp', borholla: 'Gas Field',
    tinsukia: 'Field Operations', namrup: 'Processing Plant', baghewala: 'Production Field',
    dandewala: 'Production Field', bakhritibba: 'Exploration / Development',
    mahanadi: 'Offshore / Exploration', kg_basin: 'Offshore / Exploration' }[site.id] || 'Operational Site'

  // Trend indicators derived from barrier states
  const trendLines = degrading.slice(0,3).map(b => `${b.short} degradation ↑`)
  if (data.total_reports > 0) trendLines.push(`Reporting volume ${
    data.data_coverage > 75 ? '→' : data.data_coverage > 50 ? '↑' : '↓'}`)

  return (
    <div className="si-panel">
      {/* ── Header ── */}
      <div className="si-panel-header" style={{ borderLeftColor: hc }}>
        <div>
          <div className="si-site-name">{site.full}</div>
          <div className="si-site-region">{site.region} · {siteType}</div>
          <div className="si-demo-note">{data.demo_note}</div>
        </div>
        <button className="si-close" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="si-scroll">

        {/* ── § 1. Site Overview ── */}
        <div className="si-section-title">① Site Overview</div>
        <div className="si-exec-stats">
          <div className="si-stat"><span>{data.total_reports}</span>Reports</div>
          <div className="si-stat"><span style={{ color: '#ef4444' }}>{data.high_sif}</span>HIGH SIF</div>
          <div className="si-stat"><span style={{ color: '#f59e0b' }}>{data.medium_sif}</span>MED SIF</div>
          <div className="si-stat"><span style={{ color: hc }}>{data.barrier_health}%</span>Barrier Health</div>
          <div className="si-stat"><span style={{ color: degrading.length >= 3 ? '#ef4444' : '#f59e0b' }}>{data.degrading_count}</span>Degrading</div>
          <div className="si-stat">
            <span style={{ color: data.data_coverage >= 70 ? '#22c55e' : '#f59e0b' }}>{data.data_coverage}%</span>
            Coverage
          </div>
        </div>
        <div className="si-obs-row">
          <span>Evidence corpus:</span>
          <strong>{totalObs} barrier observations across {data.total_reports} report{data.total_reports !== 1 ? 's' : ''}</strong>
        </div>

        {/* Evidence Strength badge — breadth AND depth qualifier */}
        {(() => {
          const es = data.evidence_strength || 'LIMITED'
          const esColor = es === 'SUFFICIENT' ? '#22c55e' : es === 'MODERATE' ? '#f59e0b' : '#9ca3af'
          const esIcon  = es === 'SUFFICIENT' ? '✓' : es === 'MODERATE' ? '~' : '!'
          return (
            <div className="si-evidence-strength-row">
              <div className="si-es-badge" style={{ color: esColor, borderColor: esColor + '40', background: esColor + '10' }}>
                <span className="si-es-icon">{esIcon}</span>
                <span>Evidence Strength: <strong>{es}</strong></span>
                <span className="si-es-detail">{data.total_reports} report{data.total_reports !== 1 ? 's' : ''} · {data.barrier_obs_count ?? totalObs} observations</span>
              </div>
              {es === 'LIMITED' && (
                <div className="si-es-caveat">
                  <AlertTriangle size={11} color="#9ca3af" />
                  <span>
                    <strong>Limited evidence</strong> — investigate before treating as a site-wide pattern.
                    The event signal below reflects this report; site-level pattern requires more data.
                  </span>
                </div>
              )}
              {es === 'MODERATE' && (
                <div className="si-es-caveat si-es-caveat-mod">
                  <span>Moderate evidence — pattern is emerging but not yet fully established across this site.</span>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── § 2. Why is this site flagged? ── */}
        {(data.reasons?.length > 0 || data.insight) && (
          <div className="si-section si-why">
            <div className="si-section-title">② Why Is This Site Flagged?</div>

            {/* Part A: barriers whose AGGREGATE STATE is degraded/failed */}
            {degrading.length > 0 && (
              <>
                <div className="si-why-sub">{degrading.length} barrier{degrading.length > 1 ? 's' : ''} currently degraded</div>
                {degrading.map(b => (
                  <div key={b.id} className="si-reason si-reason-bad">
                    <span className="si-reason-barrier">{b.short}</span>
                    <span className="si-reason-detail">— {b.failed} failed + {b.absent} absent observation{(b.failed + b.absent) !== 1 ? 's' : ''}</span>
                    <StateChip state={b.state} />
                  </div>
                ))}
              </>
            )}

            {/* Part B: barriers that are INTACT but had some individual failures */}
            {(() => {
              const intactWithFails = data.barriers?.filter(
                b => (b.state === 'INTACT' || b.state === 'UNSTATED') && b.failed > 0
              ) || []
              if (!intactWithFails.length) return null
              return (
                <>
                  <div className="si-why-sub si-why-sub-secondary">Additional failed observations (barrier aggregate: INTACT)</div>
                  <div className="si-why-note">
                    These barriers have individual report failures but the aggregate barrier state remains INTACT
                    because the overall fail-rate is below the degradation threshold.
                  </div>
                  {intactWithFails.map(b => (
                    <div key={b.id} className="si-reason si-reason-warn">
                      <span className="si-reason-barrier">{b.short}</span>
                      <span className="si-reason-detail">— {b.failed} failed observation{b.failed !== 1 ? 's' : ''} in {b.report_count} reports</span>
                      <StateChip state={b.state} />
                    </div>
                  ))}
                </>
              )
            })()}

            {/* Convergence note — language gated on distinct report count */}
            {data.convergence_count > 0 && (() => {
              const rc = data.total_reports
              const lbl = data.convergence_label
              if (lbl === 'multiple_reports') return (
                <div className="si-convergence-note">
                  <AlertTriangle size={12} color="#ef4444" />
                  <span>
                    <strong>Recurring barrier degradation</strong> — {data.degrading_count}/{data.barriers?.length} protective
                    barriers show repeated failures across <strong>{rc} distinct reports</strong>.
                    Multiple independent protection layers show concurrent degradation.
                  </span>
                </div>
              )
              if (lbl === 'two_reports') return (
                <div className="si-convergence-note si-conv-moderate">
                  <AlertTriangle size={12} color="#f59e0b" />
                  <span>
                    <strong>Similar barrier degradation</strong> observed across 2 reports.
                    Pattern is emerging — requires more data before site-wide conclusion.
                  </span>
                </div>
              )
              // single_report — event-level only
              return (
                <div className="si-convergence-note si-conv-limited">
                  <AlertTriangle size={12} color="#9ca3af" />
                  <span>
                    <strong>Multiple barrier failures observed in this report.</strong>{' '}
                    Site-wide pattern not yet established — single event, {data.degrading_count} barriers affected.
                  </span>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── § 3. Barrier Health ── */}
        <div className="si-section">
          <div className="si-section-title">③ Barrier Health</div>
          <div className="si-section-sub">Click any barrier row for evidence drill-down</div>
          <table className="si-barrier-table">
            <thead>
              <tr>
                <th>Barrier</th>
                <th>State</th>
                <th>Reports</th>
                <th>
                  <span className="si-fau-header">F / A / U / I</span>
                  <span className="si-fau-legend">Failed / Absent / Unstated / Intact</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.barriers?.map(b => (
                <>
                  <tr
                    key={b.id}
                    className={`si-btrow si-btrow-clickable ${activeBarrier?.id === b.id ? 'si-btrow-active' : ''}`}
                    onClick={() => setActiveBarrier(activeBarrier?.id === b.id ? null : b)}
                  >
                    <td className="si-bt-name">{b.short}</td>
                    <td><StateChip state={b.state} /></td>
                    <td className="si-bt-n">{b.report_count}</td>
                    <td className="si-bt-fau">
                      <span style={{ color: b.failed > 0 ? '#ef4444' : 'var(--text-muted)' }}>{b.failed}</span>&#8202;/&#8202;
                      <span style={{ color: b.absent > 0 ? '#ef4444' : 'var(--text-muted)' }}>{b.absent}</span>&#8202;/&#8202;
                      <span style={{ color: b.unstated > 0 ? '#eab308' : 'var(--text-muted)' }}>{b.unstated}</span>&#8202;/&#8202;
                      <span style={{ color: '#22c55e' }}>{b.intact}</span>
                    </td>
                  </tr>
                  {activeBarrier?.id === b.id && (
                    <tr key={b.id + '_drill'}>
                      <td colSpan={4} style={{ padding: 0 }}>
                        <BarrierDrillCard
                          barrier={b}
                          siteId={site.id}
                          onClose={() => setActiveBarrier(null)}
                          navigate={navigate}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── § 4. SIF Intelligence ── */}
        <div className="si-section">
          <div className="si-section-title">④ SIF Intelligence</div>
          <div className="si-sif-grid">
            {[['HIGH', data.high_sif, '#ef4444'], ['MEDIUM', data.medium_sif, '#f59e0b'], ['LOW', data.low_sif, '#22c55e']].map(([l, n, c]) => (
              <div key={l} className="si-sif-card" style={{ borderColor: c + '30' }}>
                <div className="si-sif-num" style={{ color: c }}>{n}</div>
                <div className="si-sif-lbl">{l}</div>
              </div>
            ))}
          </div>
          {/* Top evidence quotes from failed barriers */}
          {degrading.length > 0 && (
            <div className="si-evidence-quotes">
              <div className="si-section-sub">Top evidence from barrier failures</div>
              {degrading.slice(0, 2).flatMap(b => b.evidence?.slice(0,1) || []).map((e, i) => (
                <blockquote key={i} className="si-quote">&ldquo;{e}&rdquo;</blockquote>
              ))}
            </div>
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10, color: 'var(--amber)' }}
            onClick={() => navigate(`/queue?site=${encodeURIComponent(site.id)}`)}
          >
            View All Reports →
          </button>
        </div>

        {/* ── § 5. Safety DNA ── */}
        {data.barriers?.length > 0 && (
          <div className="si-section">
            <div className="si-section-title">⑤ Safety DNA</div>
            <div className="si-dna-note">
              Barrier resilience profile across {data.total_reports} reports — lower DNA = weaker historical compliance
            </div>
            {data.barriers.slice(0, 6).map(b => (
              <DnaBar key={b.id} label={b.short} score={b.dna} />
            ))}
            {data.similar_sites?.length > 0 && (
              <div className="si-dna-similar">
                <span>Similar barrier signature detected at</span>
                <strong style={{ color: 'var(--amber)' }}> {data.similar_sites.length} other OIL site{data.similar_sites.length > 1 ? 's' : ''}</strong>
                <span>: {data.similar_sites.map(s => s.site.split(' ')[0]).join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* ── § 6. Similar Sites + Trend ── */}
        {(data.similar_sites?.length > 0 || trendLines.length > 0) && (
          <div className="si-section si-two-col">
            {data.similar_sites?.length > 0 && (
              <div>
                <div className="si-section-title">⑥a Similar Sites</div>
                {data.similar_sites.map(s => (
                  <div key={s.site} className="si-similar-row">
                    <span className="si-similar-name">{s.site.split(' ')[0]}</span>
                    <div className="si-similar-bar">
                      <div style={{ width: `${s.similarity}%`, height: '4px', borderRadius: '2px', background: hColor(s.similarity) }} />
                    </div>
                    <span className="si-similar-pct" style={{ color: hColor(s.similarity) }}>{s.similarity}%</span>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm si-compare-btn" onClick={() => navigate('/migration')}>
                  Compare via Barrier Migration →
                </button>
              </div>
            )}
            {trendLines.length > 0 && (
              <div>
                <div className="si-section-title">⑥b Trend (30D → 90D)</div>
                {trendLines.map((t, i) => (
                  <div key={i} className="si-trend-line">
                    <span className={t.includes('↑') ? 'si-trend-up' : t.includes('↓') ? 'si-trend-dn' : 'si-trend-flat'}>
                      {t.includes('↑') ? '▲' : t.includes('↓') ? '▼' : '—'}
                    </span>
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Safety Intelligence Gaps ── */}
        {data.unstated_rate > 20 && (
          <div className="si-section si-blindspot">
            <div className="si-section-label">
              <AlertTriangle size={11} color="#eab308" style={{ marginRight: 4 }} />
              SAFETY INTELLIGENCE GAPS
            </div>
            <p className="si-blindspot-text">
              <strong>{data.unstated_rate}%</strong> of reports do not state barrier information for:{' '}
              {data.missing_barriers?.join(', ') || 'one or more barriers'}.
            </p>
            <p className="si-blindspot-note">
              UNSTATED ≠ SAFE. Absence of report evidence does not confirm a control was applied.
            </p>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--amber)', borderColor: 'var(--amber)', marginTop: 6 }}
              onClick={() => navigate('/copilot')}>
              <Mic size={12} /> Fill gaps via Field Copilot →
            </button>
          </div>
        )}

        {/* ── Reporting anomaly ── */}
        {data.reporting_anomaly && (
          <div className="si-section si-anomaly">
            <div className="si-section-label">⚠ REPORTING ANOMALY</div>
            <div className="si-anomaly-grid">
              <div><span className="si-anomaly-num">{data.reporting_anomaly.prev_period}</span>Previous period</div>
              <div><span className="si-anomaly-num" style={{ color: '#ef4444' }}>{data.reporting_anomaly.curr_period}</span>Current period</div>
              <div><span className="si-anomaly-num" style={{ color: '#ef4444' }}>−{data.reporting_anomaly.change_pct}%</span>Change</div>
            </div>
            <p className="si-anomaly-note">{data.reporting_anomaly.message}</p>
          </div>
        )}

        {/* ── § 7. Why it Matters — PREVORA Conclusion ── */}
        {data.insight && (
          <div className="si-section si-insight">
            <div className="si-section-title">⑦ Why It Matters</div>
            <p className="si-insight-text">{data.insight}</p>
            {data.data_coverage < 60 && (
              <p className="si-insight-caveat">
                ⚠ Data coverage is {data.data_coverage}% — conclusions are based on limited evidence.
                Use Field Copilot to capture additional barrier observations.
              </p>
            )}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="si-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/queue?site=${encodeURIComponent(site.id)}`)}>
            View Site Reports →
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/barrier-health')}>
            <Activity size={13} /> Defence Monitor
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/copilot')}>
            <Mic size={12} /> Field Copilot
          </button>
        </div>

      </div>{/* end si-scroll */}
    </div>
  )
}

/* ── Compact site popup (first click) ────────────────────────────────────── */
function SitePopup({ site, data, onExplore, onClose }) {
  const hc = hColor(data?.barrier_health ?? 70)
  return (
    <div className="site-popup">
      <div className="sp-header" style={{ borderLeftColor: hc }}>
        <div>
          <div className="sp-name">{site.full}</div>
          <div className="sp-region">{site.region} · OIL Operational Site</div>
        </div>
        <button className="si-close-sm" onClick={onClose}><X size={13} /></button>
      </div>
      {!data ? (
        <div style={{ padding: '12px', textAlign: 'center' }}>
          <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, margin: '0 auto' }} />
        </div>
      ) : (
        <>
          <div className="sp-stats">
            <div className="sp-stat"><b>{data.total_reports}</b>Reports</div>
            <div className="sp-stat"><b style={{ color: '#f59e0b' }}>{data.high_sif + data.medium_sif}</b>SIF</div>
            <div className="sp-stat"><b style={{ color: hc }}>{data.barrier_health}%</b>Health</div>
            <div className="sp-stat"><b style={{ color: data.data_coverage >= 70 ? '#22c55e' : '#f59e0b' }}>{data.data_coverage}%</b>Coverage</div>
          </div>
          {/* Barrier obs count */}
          <div className="sp-obs-row">
            <span>Evidence:</span>
            <strong>{data.barriers ? data.barriers.reduce((a,b) => a + b.failed + b.absent + b.intact + b.unstated, 0) : 0} barrier observations</strong>
          </div>
          <div className="sp-barriers">
            {data.barriers?.slice(0, 4).map(b => (
              <div key={b.id} className="sp-barrier-row">
                <span>{b.short}</span>
                <StateChip state={b.state} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm sp-explore" onClick={onExplore}>
            EXPLORE SITE →
          </button>
        </>
      )}
    </div>
  )
}

/* ── India SVG map with individual site markers ───────────────────────────── */
function IndiaMap({ siteData, selected, expanded, onSelect }) {
  return (
    <svg viewBox="0 0 980 980" className="india-svg" xmlns="http://www.w3.org/2000/svg">
      {/* India landmass */}
      <path
        d="M260,80 L310,70 L380,60 L460,55 L540,58 L620,68 L690,80 L750,100
           L800,130 L840,155 L870,175 L890,200 L900,230 L895,260 L875,280
           L855,295 L840,320 L845,350 L835,380 L810,400 L790,420
           L780,450 L785,480 L775,510 L750,540 L720,560 L695,590
           L670,620 L650,660 L630,700 L610,730 L590,760 L570,800
           L555,840 L545,880 L540,920
           L530,920 L510,880 L490,840 L470,790 L455,750 L440,710
           L420,670 L395,630 L370,590 L350,560 L330,530 L310,510
           L290,490 L270,470 L250,450 L230,430 L210,410 L195,390
           L185,365 L175,340 L170,310 L165,285 L162,260 L165,235
           L175,210 L190,188 L210,168 L230,150 L245,130 L255,110 L260,80Z"
        fill="rgba(25,30,48,0.7)" stroke="rgba(245,158,11,0.15)" strokeWidth="1.5"
      />
      {/* Region labels */}
      <text x="830" y="290" fontSize="8" fill="rgba(255,255,255,0.18)" fontWeight="700" textAnchor="middle">ASSAM / ARUNACHAL</text>
      <text x="285" y="330" fontSize="8" fill="rgba(255,255,255,0.18)" fontWeight="700" textAnchor="middle">RAJASTHAN</text>
      <text x="618" y="425" fontSize="8" fill="rgba(255,255,255,0.18)" fontWeight="700" textAnchor="middle">MAHANADI</text>
      <text x="678" y="558" fontSize="8" fill="rgba(255,255,255,0.18)" fontWeight="700" textAnchor="middle">OFFSHORE</text>

      {/* Grid */}
      {[250,400,550,700,850].map(x => (
        <line key={x} x1={x} y1="50" x2={x} y2="950" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
      ))}
      {[150,300,450,600,750,900].map(y => (
        <line key={y} x1="150" y1={y} x2="950" y2={y} stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
      ))}

      {/* Site markers */}
      {OIL_SITES.map(site => {
        const d = siteData[site.id]
        const health = d?.barrier_health ?? 70
        const color = hColor(health)
        const isSelected = selected === site.id
        const isExpanded = expanded === site.id
        const hasCritical = d && d.degrading_count >= 3
        const r = isSelected ? 11 : 8

        return (
          <g key={site.id} onClick={() => onSelect(site.id)} style={{ cursor: 'pointer' }}>
            {/* Pulse for critical */}
            {hasCritical && (
              <circle cx={site.cx} cy={site.cy} r={r + 10}
                fill="none" stroke={color} strokeWidth="1" opacity="0.25"
                className="node-pulse-ring"
              />
            )}
            {/* Selected ring */}
            {isSelected && (
              <circle cx={site.cx} cy={site.cy} r={r + 6}
                fill="none" stroke={color} strokeWidth="1.5" opacity="0.6"/>
            )}
            {/* Main dot */}
            <circle
              cx={site.cx} cy={site.cy} r={r}
              fill={`${color}22`} stroke={color}
              strokeWidth={isSelected ? 2 : 1.5}
            />
            {/* Inner dot */}
            <circle cx={site.cx} cy={site.cy} r={r * 0.45} fill={color} opacity="0.9"/>

            {/* Label — only show if not too close to another selected node */}
            <text
              x={site.cx} y={site.cy + r + 11}
              textAnchor="middle" fontSize="7.5"
              fill={isSelected ? color : "rgba(255,255,255,0.55)"}
              fontWeight={isSelected ? "800" : "600"}
            >
              {site.label}
            </text>

            {/* Convergence badge */}
            {hasCritical && (
              <circle cx={site.cx + r} cy={site.cy - r} r={5} fill="#ef4444"/>
            )}
          </g>
        )
      })}

      {/* PREVORA watermark */}
      <text x="490" y="965" textAnchor="middle" fontSize="9" fill="rgba(245,158,11,0.2)" fontWeight="800" letterSpacing="4">
        PREVORA · PAN-INDIA SAFETY INTELLIGENCE
      </text>
    </svg>
  )
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function FieldMap() {
  const [siteData, setSiteData] = useState({})
  const [selected, setSelected] = useState(null)   // compact popup open
  const [expanded, setExpanded] = useState(null)   // full panel open
  const [loading, setLoading] = useState({})
  const [dataView, setDataView] = useState('oil')  // 'oil' | 'benchmark' | 'pattern'
  const [benchmark, setBenchmark] = useState(null)
  const navigate = useNavigate()

  // Preload benchmark summary when switching to those views
  useEffect(() => {
    if ((dataView === 'benchmark' || dataView === 'pattern') && !benchmark) {
      api.getBenchmarkSummary().then(setBenchmark).catch(() => {})
    }
  }, [dataView])

  // Preload all site summaries on mount — colours markers immediately
  useEffect(() => {
    api.getAllSitesSummary().then(summaries => {
      const byId = {}
      summaries.forEach(s => { byId[s.site_id] = { ...s, _summary: true } })
      setSiteData(byId)
    })
  }, [])

  const loadSite = (siteId) => {
    const existing = siteData[siteId]
    if (!siteId || (existing && !existing._summary) || loading[siteId]) return
    setLoading(prev => ({ ...prev, [siteId]: true }))
    // Use site_id (e.g. "moran") — canonical endpoint accepts both id and name
    api.getSiteIntelligence(siteId).then(data => {
      setSiteData(prev => ({ ...prev, [siteId]: data }))
    }).finally(() => {
      setLoading(prev => ({ ...prev, [siteId]: false }))
    })
  }

  const handleSelect = (siteId) => {
    if (selected === siteId) {
      setSelected(null)
    } else {
      setSelected(siteId)
      setExpanded(null)
      loadSite(siteId)
    }
  }

  const handleExpand = (siteId) => {
    setExpanded(siteId)
    setSelected(null)
    loadSite(siteId)
  }

  const selectedSite = OIL_SITES.find(s => s.id === selected)
  const expandedSite  = OIL_SITES.find(s => s.id === expanded)

  // Summary stats
  const totalSites   = OIL_SITES.length
  const criticalSites = Object.values(siteData).filter(d => d.degrading_count >= 3).length
  const totalReports  = Object.values(siteData).reduce((a, d) => a + (d.total_reports || 0), 0)

  return (
    <div className="fm-page fade-in">
      {/* Header */}
      <div className="fm-header">
        <div className="fm-title-row">
          <div>
            <h1 className="fm-title">🇮🇳 OIL Pan-India Safety Intelligence Map</h1>
            <p className="fm-sub">
              {totalSites} operational sites · Assam · Arunachal · Rajasthan · Mahanadi · Offshore
              · Click any site marker for barrier intelligence
            </p>
          </div>
          {/* DATA VIEW selector */}
          <div className="fm-dataview-selector">
            <span className="fm-dataview-label">DATA VIEW</span>
            {[['oil','🏭 OIL Operations'],['benchmark','📊 External Benchmark'],['pattern','🔬 Pattern Library']].map(([v, label]) => (
              <button key={v} className={`fm-dataview-btn ${dataView === v ? 'active' : ''}`}
                onClick={() => { setDataView(v); setSelected(null); setExpanded(null); }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="fm-legend">
          <span className="fm-legend-item" style={{ color: '#22c55e' }}>● Healthy (≥80%)</span>
          <span className="fm-legend-item" style={{ color: '#eab308' }}>● Degrading (65–79%)</span>
          <span className="fm-legend-item" style={{ color: '#f59e0b' }}>● Poor (&lt;65%)</span>
          <span className="fm-legend-item" style={{ color: '#ef4444' }}>● Critical (&lt;45%)</span>
          <span className="fm-legend-item" style={{ color: '#ef4444' }}>🔴 Convergence detected</span>
          <span className="fm-legend-item" style={{ color: 'var(--text-muted)' }}>Barrier Health — not SIF risk score</span>
        </div>
      </div>

      <div className="fm-body">
        {/* ── OIL OPERATIONS VIEW ──────────────────────────────────────── */}
        {dataView === 'oil' && (<>
        {/* Map with popup overlay */}
        <div className="fm-map-container">
          <IndiaMap
            siteData={siteData}
            selected={selected}
            expanded={expanded}
            onSelect={handleSelect}
          />

          {/* Compact popup */}
          {selectedSite && !expanded && (
            <div className="site-popup-wrapper" style={{
              position: 'absolute',
              top: `${((selectedSite.cy - 60) / 980) * 100}%`,
              left: `${((selectedSite.cx + 20) / 980) * 100}%`,
            }}>
              <SitePopup
                site={selectedSite}
                data={siteData[selected]}
                onExplore={() => handleExpand(selected)}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>

        {/* Full Site Intelligence Panel */}
        {expandedSite && (
          <SiteIntelPanel
            site={expandedSite}
            data={siteData[expanded]}
            onClose={() => setExpanded(null)}
            navigate={navigate}
          />
        )}

        {/* Default right panel when nothing selected */}
        {!expandedSite && !selected && (
          <div className="fm-right-default">
            <div className="card fm-hint-card">
              <div className="fm-hint-title">🗺️ Click any site marker</div>
              <p className="fm-hint-text">
                Each marker shows a live OIL operational site. Click to open
                the Site Intelligence Panel with barrier health, SIF breakdown,
                safety DNA, and cross-site connections.
              </p>
              <div className="fm-hint-flow">
                <div className="fm-flow-step">Click Site</div>
                <ChevronRight size={12} color="var(--text-muted)" />
                <div className="fm-flow-step">Barrier Health</div>
                <ChevronRight size={12} color="var(--text-muted)" />
                <div className="fm-flow-step">Evidence</div>
                <ChevronRight size={12} color="var(--text-muted)" />
                <div className="fm-flow-step">Safety DNA</div>
              </div>
            </div>

            {/* Cross-region signal */}
            <div className="card fm-signal-card">
              <div className="fm-signal-label">
                <GitMerge size={12} /> CROSS-SITE PATTERN SIGNAL
              </div>
              <p className="fm-signal-text">
                Energy Isolation and Gas Testing degradation patterns detected across
                North East sites — similar signatures emerging in Rajasthan region.
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--amber)', borderColor: 'var(--amber)', marginTop: 8 }}
                onClick={() => navigate('/migration')}
              >
                View Barrier Migration →
              </button>
            </div>

            <div className="card fm-copilot-card">
              <div className="fm-signal-label">
                <Mic size={12} /> FIELD COPILOT
              </div>
              <p className="fm-signal-text">
                Site data gaps detected. Use Field Copilot to capture missing
                barrier evidence directly from field workers.
              </p>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => navigate('/copilot')}
              >
                Open Field Copilot →
              </button>
            </div>
          </div>
        )}
        </>)}

        {/* ── EXTERNAL BENCHMARK VIEW ──────────────────────────────────── */}
        {dataView === 'benchmark' && (
          <div className="fm-fullwidth fade-in">
            <div className="bm-header">
              <div>
                <div className="bm-title">EXTERNAL BENCHMARK CORPUS</div>
                <div className="bm-sub">Public incident narratives — OSHA · CSB · MSHA · NOPSEMA · UK HSE</div>
              </div>
              <div className="bm-disclaimer">NOT OIL INDIA LIMITED DATA</div>
            </div>

            {!benchmark ? (
              <div className="spinner" style={{ margin: '40px auto' }} />
            ) : (
              <div className="bm-grid">
                <div className="card bm-stat-card">
                  <div className="bm-stat-num">{benchmark.total}</div>
                  <div className="bm-stat-label">Benchmark Records</div>
                </div>
                <div className="card bm-stat-card">
                  <div className="bm-stat-num" style={{ color: '#ef4444' }}>{benchmark.sif_distribution?.HIGH || 0}</div>
                  <div className="bm-stat-label">HIGH SIF Incidents</div>
                </div>
                <div className="card bm-stat-card">
                  <div className="bm-stat-num" style={{ color: '#f59e0b' }}>{benchmark.sif_distribution?.MEDIUM || 0}</div>
                  <div className="bm-stat-label">MEDIUM SIF</div>
                </div>
                <div className="card bm-stat-card">
                  <div className="bm-stat-num" style={{ color: '#22c55e' }}>{benchmark.sif_distribution?.LOW || 0}</div>
                  <div className="bm-stat-label">LOW / Compliant</div>
                </div>

                <div className="card bm-barrier-card">
                  <div className="bm-section-label">BARRIER FAILURE FREQUENCY</div>
                  <div className="bm-note">Across {benchmark.total} benchmark records — how often each barrier FAILED</div>
                  {benchmark.barrier_failure_counts && Object.entries(benchmark.barrier_failure_counts)
                    .sort((a,b) => b[1] - a[1])
                    .map(([b_id, count]) => {
                      const pct = Math.round(count / benchmark.total * 100)
                      const labels = { loto: 'Energy Isolation (LOTO)', gas: 'Gas / Atmospheric Testing',
                        permit: 'Permit to Work', ppe: 'PPE', supervision: 'Supervision', sop: 'Safe Work Procedure' }
                      return (
                        <div key={b_id} className="bm-bar-row">
                          <span className="bm-bar-label">{labels[b_id] || b_id}</span>
                          <div className="bm-bar-track">
                            <div className="bm-bar-fill" style={{ width: `${pct * 4}%`, background: '#ef4444' }} />
                          </div>
                          <span className="bm-bar-pct">{count}/{benchmark.total}</span>
                        </div>
                      )
                    })
                  }
                </div>

                <div className="card bm-source-card">
                  <div className="bm-section-label">DATA SOURCES</div>
                  <div className="bm-source-list">
                    {['OSHA Severe Injury Reports','CSB Investigation Summaries','MSHA Fatality Reports',
                      'NOPSEMA Safety Alerts','UK HSE Offshore Bulletins','Public Industry Reports'
                    ].map(s => (
                      <div key={s} className="bm-source-item">✓ {s}</div>
                    ))}
                  </div>
                  <p className="bm-source-note">
                    All narratives paraphrased from public domain sources for research/validation use.
                    These incidents are NOT attributed to OIL India Limited.
                  </p>
                </div>

                <div className="card bm-insight-card">
                  <div className="bm-section-label">KEY FINDING</div>
                  <p className="bm-insight-text">
                    Across {benchmark.total} benchmark incidents from {benchmark.sources?.length} public sources,
                    energy isolation and gas testing are the most frequently failed barriers in HIGH-SIF oil & gas events.
                    This pattern is consistent with OIL PREVORA data, providing external validation for the barrier model.
                  </p>
                  <div className="bm-insight-stat">
                    <span>Most failed barrier in benchmark corpus:</span>
                    <strong style={{ color: '#ef4444', textTransform: 'uppercase' }}>
                      &nbsp;{benchmark.most_failed_barrier}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PATTERN LIBRARY VIEW ─────────────────────────────────────── */}
        {dataView === 'pattern' && (
          <div className="fm-fullwidth fade-in">
            <div className="bm-header">
              <div>
                <div className="bm-title">🔬 PREVORA PATTERN LIBRARY</div>
                <div className="bm-sub">Barrier signature matching — OIL demo sites vs external benchmark corpus</div>
              </div>
              <div className="bm-disclaimer">PREVORA INTELLIGENCE ENGINE</div>
            </div>

            <div className="pl-grid">
              {/* Signature source */}
              <div className="card pl-sig-card">
                <div className="bm-section-label">QUERY SIGNATURE — Moran Compressor Station</div>
                <div className="pl-sig-note">Current degraded barrier pattern</div>
                <div className="pl-barriers">
                  {[['LOTO','FAILED','#ef4444'],['Gas Test','FAILED','#ef4444'],
                    ['PTW','DEGRADED','#f59e0b'],['Supervision','FAILED','#ef4444'],
                    ['SOP','DEGRADED','#f59e0b'],['PPE','INTACT','#22c55e']
                  ].map(([name, state, color]) => (
                    <div key={name} className="pl-barrier-row">
                      <span className="pl-barrier-name">{name}</span>
                      <span className="pl-barrier-state" style={{ color, borderColor: color + '44', background: color + '12' }}>
                        {state === 'FAILED' ? '✕' : state === 'DEGRADED' ? '⚠' : '✓'} {state}
                      </span>
                      <div className="pl-barrier-bar">
                        <div style={{ width: state === 'FAILED' ? '20%' : state === 'DEGRADED' ? '55%' : '90%',
                          height: '4px', borderRadius: '2px', background: color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match results */}
              <div className="card pl-match-card">
                <div className="bm-section-label">PATTERN MATCH RESULTS</div>
                <div className="pl-match-row">
                  <div className="pl-match-source">External Benchmark<br/><span className="pl-match-sub">OSHA · CSB · MSHA corpus</span></div>
                  <div className="pl-match-bar-wrap">
                    <div className="pl-match-bar" style={{ width: '91%', background: 'linear-gradient(90deg, #ef4444, #f59e0b)' }} />
                    <span className="pl-match-pct">91%</span>
                  </div>
                  <div className="pl-match-detail">Energy isolation + gas testing failures appear in 91% of HIGH-SIF external benchmark records with similar multi-barrier patterns</div>
                </div>
                <div className="pl-match-row">
                  <div className="pl-match-source">OIL Demo Sites<br/><span className="pl-match-sub">Baghewala · Naharkatiya</span></div>
                  <div className="pl-match-bar-wrap">
                    <div className="pl-match-bar" style={{ width: '84%', background: 'linear-gradient(90deg, #f59e0b, #eab308)' }} />
                    <span className="pl-match-pct">84%</span>
                  </div>
                  <div className="pl-match-detail">Baghewala Field shares LOTO + Gas Test failure pattern — classified as emerging convergence</div>
                </div>
                <div className="pl-match-row">
                  <div className="pl-match-source">Healthy OIL Sites<br/><span className="pl-match-sub">Duliajan · Borholla</span></div>
                  <div className="pl-match-bar-wrap">
                    <div className="pl-match-bar" style={{ width: '8%', background: '#22c55e' }} />
                    <span className="pl-match-pct" style={{ color: '#22c55e' }}>8%</span>
                  </div>
                  <div className="pl-match-detail">Healthy sites show minimal pattern overlap — barrier profiles remain intact</div>
                </div>
              </div>

              {/* Evidence */}
              <div className="card pl-evidence-card">
                <div className="bm-section-label">MATCHED BENCHMARK EVIDENCE</div>
                {[
                  { source: 'OSHA SIR', text: '"Pump not de-energised before maintenance — crew assumed isolation completed by previous shift."', barrier: 'LOTO' },
                  { source: 'MSHA 2020', text: '"No atmospheric testing performed before opening tank — worker self-evacuated after inhaling vapour."', barrier: 'Gas Test' },
                  { source: 'CSB 2018', text: '"Permit issued but isolation requirements not specified — flange under pressure when opened."', barrier: 'PTW' },
                  { source: 'NOPSEMA', text: '"Standby person tasked with dual duties — entrant unsupervised in partially inerted space."', barrier: 'Supervision' },
                ].map((e, i) => (
                  <div key={i} className="pl-evidence-item">
                    <div className="pl-evidence-header">
                      <span className="pl-evidence-source">{e.source}</span>
                      <span className="pl-evidence-barrier" style={{ color: '#ef4444' }}>{e.barrier}</span>
                    </div>
                    <p className="pl-evidence-text">{e.text}</p>
                  </div>
                ))}
                <div className="pl-evidence-footer">
                  <span>27 matched records across benchmark corpus</span>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--amber)' }}
                    onClick={() => setDataView('benchmark')}>View Full Benchmark →</button>
                </div>
              </div>

              {/* PREVORA insight */}
              <div className="card pl-insight-card">
                <div className="bm-section-label">🧠 PREVORA CONCLUSION</div>
                <p className="pl-insight-text">
                  The barrier signature at Moran Compressor Station — simultaneous degradation of
                  energy isolation, gas testing, and supervision — matches the profile of 91% of
                  HIGH-consequence incidents in the external benchmark corpus.
                </p>
                <p className="pl-insight-text" style={{ marginTop: 8 }}>
                  This pattern has not historically resolved without intervention.
                  The same signature at Baghewala Field suggests cross-region transfer is active.
                </p>
                <div className="pl-insight-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/migration')}>View Barrier Migration →</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/barrier-health')}>Defence Monitor</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
