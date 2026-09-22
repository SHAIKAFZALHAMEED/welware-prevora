import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { GitMerge, TrendingDown, ArrowRight, AlertTriangle, Info } from 'lucide-react'
import './BarrierMigration.css'

function SimilarityBar({ value }) {
  const color = value >= 75 ? '#ef4444' : value >= 55 ? '#f59e0b' : '#eab308'
  return (
    <div className="sim-bar-wrap">
      <div className="sim-bar-track-full">
        <div className="sim-bar-fill-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="sim-bar-pct" style={{ color }}>{value}%</span>
    </div>
  )
}

function MigrationCard({ migration }) {
  const navigate = useNavigate()
  const severity = migration.similarity >= 70 ? 'HIGH' : migration.similarity >= 50 ? 'MEDIUM' : 'LOW'
  const severityColor = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#eab308' }[severity]

  return (
    <div className={`migration-card mc-${severity.toLowerCase()}`}>
      {/* Header */}
      <div className="mc-header">
        <div className="mc-severity" style={{ background: `${severityColor}18`, color: severityColor, borderColor: `${severityColor}40` }}>
          {severity} SIMILARITY
        </div>
        <div className="mc-overlap" title="Number of barriers showing degradation in both sites">
          Overlap: <strong>{migration.overlap_barriers?.length ?? '—'}</strong>
          {migration.origin_barriers?.length ? ` / ${migration.origin_barriers.length}` : ''} barriers
        </div>
      </div>

      {/* Transfer diagram */}
      <div className="mc-diagram">
        {/* Origin */}
        <div className="mc-region mc-origin">
          <div className="mc-region-label">ORIGIN</div>
          <div className="mc-region-name">{migration.origin_region}</div>
          <div className="mc-region-meta">{migration.origin_reports} reports</div>
          <div className="mc-barriers">
            {migration.origin_barriers.map(b => (
              <span key={b} className="mc-chip mc-chip-red">
                <TrendingDown size={9} /> {b}
              </span>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="mc-arrow">
          <ArrowRight size={20} color="var(--amber)" />
          <div className="mc-overlap">
            {migration.overlap_barriers.map(b => (
              <span key={b} className="mc-overlap-chip">{b}</span>
            ))}
          </div>
        </div>

        {/* Emerging */}
        <div className="mc-region mc-emerging">
          <div className="mc-region-label" style={{ color: '#f59e0b' }}>EMERGING</div>
          <div className="mc-region-name">{migration.emerging_region}</div>
          <div className="mc-region-meta">{migration.emerging_reports} reports</div>
          <div className="mc-barriers">
            {migration.emerging_barriers.map(b => (
              <span key={b} className="mc-chip mc-chip-orange">
                <TrendingDown size={9} /> {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Similarity bar */}
      <div className="mc-similarity">
        <span>Pattern Similarity</span>
        <SimilarityBar value={migration.similarity} />
      </div>

      {/* Disclaimer */}
      <div className="mc-note">
        <Info size={11} />
        <span>{migration.note}</span>
      </div>

      {/* Actions */}
      <div className="mc-actions">
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/queue')}>
          Review Priority Reports →
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/barrier-health')}>
          View Barrier Networks
        </button>
      </div>
    </div>
  )
}

export default function BarrierMigration() {
  const [migrations, setMigrations] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getBarrierMigration().then(setMigrations).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.82rem' }}>
        Analysing cross-region barrier patterns…
      </p>
    </div>
  )

  return (
    <div className="bm-page fade-in">
      {/* Header */}
      <div className="bm-header">
        <div className="bm-title-row">
          <GitMerge size={22} color="var(--amber)" />
          <div>
            <h1 className="bm-title">Barrier Migration Detection</h1>
            <p className="bm-sub">
              Cross-region precursor pattern analysis — detecting where degrading barrier signatures
              from established sites are emerging in other operational regions
            </p>
          </div>
        </div>
      </div>

      {/* Technical disclaimer */}
      <div className="bm-disclaimer card">
        <AlertTriangle size={16} color="#eab308" />
        <div>
          <strong>Technical Note:</strong> Barrier Migration identifies structural similarity in barrier
          degradation patterns across regions. It detects overlapping sets of degrading barriers —
          not causal chains or accident predictions. Every match is evidence-backed and traceable
          to source reports.
        </div>
      </div>

      {/* How it works */}
      <div className="bm-how card">
        <h3 className="section-label">How PREVORA Detects Barrier Migration</h3>
        <div className="bm-steps">
          <div className="bm-step"><span>1</span> Compute per-region barrier degradation vectors from SIF reports</div>
          <div className="bm-step"><span>2</span> Identify "origin" regions with established degradation (higher report volume)</div>
          <div className="bm-step"><span>3</span> Find "emerging" regions with overlapping barrier failure signatures</div>
          <div className="bm-step"><span>4</span> Score similarity = overlapping degrading barriers ÷ union of all degrading barriers</div>
          <div className="bm-step"><span>5</span> Flag pairs with ≥35% structural similarity for HSE review</div>
        </div>
      </div>

      {/* Migration cards */}
      {migrations.length === 0 ? (
        <div className="card bm-empty">
          <GitMerge size={28} color="#22c55e" />
          <p>No cross-region barrier migration patterns detected at this time.</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            This indicates regional barrier degradation signatures are not yet structurally similar.
          </p>
        </div>
      ) : (
        <div className="bm-grid">
          {migrations.map((m, i) => (
            <MigrationCard key={i} migration={m} />
          ))}
        </div>
      )}
    </div>
  )
}
