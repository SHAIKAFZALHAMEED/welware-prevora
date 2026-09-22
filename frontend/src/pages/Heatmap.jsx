import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Flame, Filter } from 'lucide-react'
import './Heatmap.css'

const RULES_SHORT = [
  'Energy Iso.', 'Confined Space', 'Hot Work',
  'Line of Fire', 'At Height', 'Bypass Controls', 'General'
]

function HeatCell({ count, maxVal, site, rule, onClick }) {
  const intensity = maxVal > 0 ? count / maxVal : 0
  const getColor = () => {
    if (count === 0) return 'hm-cell-zero'
    if (intensity > 0.7) return 'hm-cell-critical'
    if (intensity > 0.4) return 'hm-cell-high'
    if (intensity > 0.1) return 'hm-cell-med'
    return 'hm-cell-low'
  }
  return (
    <div
      className={`hm-cell ${getColor()}`}
      style={{ '--intensity': intensity }}
      onClick={() => count > 0 && onClick(site, rule)}
      title={count > 0 ? `${site} × ${rule}: ${count} HIGH/MEDIUM SIF reports` : 'No SIF reports'}
    >
      {count > 0 ? count : ''}
    </div>
  )
}

export default function Heatmap() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getHeatmap().then(setData).finally(() => setLoading(false))
  }, [])

  const maxVal = data
    ? Math.max(...data.matrix.flatMap(row => row.cells.map(c => c.count)), 1)
    : 1

  const handleCellClick = (site, rule) => {
    setSelected({ site, rule })
    // Navigate to queue filtered by site
    navigate(`/queue?site=${encodeURIComponent(site)}`)
  }

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  )
  if (!data) return null

  return (
    <div className="heatmap-page fade-in">
      {/* Header */}
      <div className="hm-header">
        <div>
          <h1 className="hm-title">
            <Flame size={22} color="var(--amber)" />
            SIF Risk Heatmap
          </h1>
          <p className="hm-sub">
            Site × IOGP Life-Saving Rule — HIGH &amp; MEDIUM SIF precursor density
          </p>
        </div>
        <div className="hm-legend">
          <span className="legend-label">LOW</span>
          <div className="legend-bar" />
          <span className="legend-label">CRITICAL</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="hm-stats-strip">
        <div className="hm-stat">
          <span className="hm-stat-val amber">{data.total_high_medium}</span>
          <span className="hm-stat-lbl">HIGH/MEDIUM SIF Reports</span>
        </div>
        <div className="hm-stat">
          <span className="hm-stat-val">{data.sites.length}</span>
          <span className="hm-stat-lbl">Sites Mapped</span>
        </div>
        <div className="hm-stat">
          <span className="hm-stat-val">{data.rules.length}</span>
          <span className="hm-stat-lbl">IOGP Rules Tracked</span>
        </div>
        <div className="hm-stat">
          <span className="hm-stat-val red">{maxVal}</span>
          <span className="hm-stat-lbl">Peak Cell Density</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="hm-container card">
        <div className="hm-hint">
          <Filter size={13} /> Click any cell to filter the Priority Queue
        </div>
        <div className="hm-grid-wrapper">
          {/* Column headers */}
          <div className="hm-grid" style={{ gridTemplateColumns: `180px repeat(${data.rules.length}, 1fr)` }}>
            <div className="hm-corner">Site / Rule</div>
            {RULES_SHORT.map((r, i) => (
              <div key={i} className="hm-col-header" title={data.rules[i]}>{r}</div>
            ))}

            {/* Rows */}
            {data.matrix.map((row) => (
              <>
                <div key={row.site} className="hm-row-header">
                  <span className="hm-site-name">{row.site}</span>
                  <span className="hm-site-total">{row.total} SIF</span>
                </div>
                {row.cells.map((cell, ci) => (
                  <HeatCell
                    key={ci}
                    count={cell.count}
                    maxVal={maxVal}
                    site={row.site}
                    rule={cell.rule}
                    onClick={handleCellClick}
                  />
                ))}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Insight panel */}
      <div className="hm-insights card">
        <h3 className="section-label">🔍 What This Means</h3>
        <div className="insight-grid">
          <div className="insight-card insight-red">
            <div className="insight-icon">🔴</div>
            <div>
              <div className="insight-title">Critical Cells</div>
              <div className="insight-text">
                Darkest red = highest SIF density at that site for that rule.
                These are your <strong>immediate intervention priorities.</strong>
              </div>
            </div>
          </div>
          <div className="insight-card insight-amber">
            <div className="insight-icon">⚡</div>
            <div>
              <div className="insight-title">Click to Investigate</div>
              <div className="insight-text">
                Click any coloured cell to jump directly to the Priority Queue
                filtered to that site — <strong>one click from pattern to action.</strong>
              </div>
            </div>
          </div>
          <div className="insight-card insight-blue">
            <div className="insight-icon">📍</div>
            <div>
              <div className="insight-title">Systemic vs. Isolated</div>
              <div className="insight-text">
                A site with multiple coloured columns = systemic safety culture issue.
                A single column hit = <strong>targeted rule violation.</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
