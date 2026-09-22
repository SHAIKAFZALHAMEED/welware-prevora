import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import {
  Search, Filter, ChevronRight, RefreshCw,
  CheckSquare, XSquare, Star, SquareCheck,
} from 'lucide-react'
import './Queue.css'

const TIERS = ['', 'HIGH', 'MEDIUM', 'LOW', 'UNCERTAIN']
const STATUSES = ['', 'PENDING', 'CONFIRMED_SIF', 'REJECTED', 'NEEDS_REVIEW']

function badgeClass(tier) {
  return `badge badge-${tier?.toLowerCase()}`
}
function reviewBadgeClass(status) {
  const map = {
    PENDING: 'badge-pending',
    CONFIRMED_SIF: 'badge-confirmed',
    REJECTED: 'badge-rejected',
    NEEDS_REVIEW: 'badge-uncertain',
  }
  return `badge ${map[status] || 'badge-pending'}`
}

export default function Queue() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [reports, setReports] = useState([])
  const [heroes, setHeroes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [site, setSite] = useState(searchParams.get('site') || '')
  const [tier, setTier] = useState(searchParams.get('tier') || '')
  const [rule, setRule] = useState(searchParams.get('rule') || '')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const [sites, setSites] = useState([])
  const [rules, setRules] = useState([])

  // Bulk triage state
  const [selected, setSelected] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    api.getSites().then(setSites)
    api.getRules().then(setRules)
    api.getHeroReports().then(setHeroes).catch(() => {})
  }, [])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const data = await api.getReports({
        page,
        page_size: 15,
        sif_potential: tier || undefined,
        site: site || undefined,
        rule_tag: rule || undefined,
        review_status: status || undefined,
      })
      setReports(data.results)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, tier, site, rule, status])

  useEffect(() => { fetchReports() }, [fetchReports])

  const filtered = search
    ? reports.filter(r =>
        r.report_text.toLowerCase().includes(search.toLowerCase()) ||
        r.site.toLowerCase().includes(search.toLowerCase())
      )
    : reports

  const totalPages = Math.ceil(total / 15)

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(r => r.id)))
    }
  }

  const handleBulkReview = async () => {
    if (!bulkStatus || selected.size === 0) return
    setBulkLoading(true)
    try {
      await api.bulkReview([...selected], bulkStatus)
      await fetchReports()
    } finally {
      setBulkLoading(false)
      setBulkStatus('')
    }
  }

  const clearFilters = () => {
    setSite(''); setTier(''); setRule(''); setStatus(''); setSearch('')
  }

  return (
    <div className="queue-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Priority Queue</h1>
          <p className="page-sub">
            {loading
              ? 'Loading priority queue…'
              : `${total} report${total !== 1 ? 's' : ''} — sorted by SIF potential · evidence quality`}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={fetchReports}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Hero Reports — pinned top-3 HIGH SIF for demo */}
      {heroes.length > 0 && !tier && !site && !rule && !status && !search && page === 1 && (
        <div className="hero-section">
          <div className="hero-label"><Star size={13} /> Demo Hero Reports</div>
          <div className="hero-row">
            {heroes.map(h => (
              <div
                key={h.id}
                className="hero-card card"
                onClick={() => navigate(`/report/${h.id}`)}
              >
                <div className="hero-top">
                  <span className={badgeClass(h.sif_potential)}>{h.sif_potential}</span>
                  <span className="hero-conf">{(h.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="hero-site">{h.site} · {h.activity}</p>
                <p className="hero-excerpt">{h.excerpt}</p>
                <div className="hero-rules">
                  {h.rule_tags.slice(0, 2).map(t => (
                    <span key={t} className="badge badge-rule">{t.split(' ')[0]}</span>
                  ))}
                  <span
                    className="hero-delta"
                    title="Protective barrier gap — number of additional protective barriers identified in the modelled pathway before no functional protection remains"
                  >
                    Gap: {h.counterfactual_delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar card">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search reports, sites…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <select value={tier} onChange={e => { setTier(e.target.value); setPage(1) }}>
          <option value="">All Tiers</option>
          {TIERS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={site} onChange={e => { setSite(e.target.value); setPage(1) }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={rule} onChange={e => { setRule(e.target.value); setPage(1) }}>
          <option value="">All Rules</option>
          {rules.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar — appears when items are selected */}
      {selected.size > 0 && (
        <div className="bulk-bar card">
          <span className="bulk-count">
            <SquareCheck size={15} /> {selected.size} selected
          </span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            className="bulk-select"
          >
            <option value="">Choose action…</option>
            <option value="CONFIRMED_SIF">Confirm SIF</option>
            <option value="REJECTED">Reject / Non-SIF</option>
            <option value="NEEDS_REVIEW">Flag for Review</option>
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleBulkReview}
            disabled={!bulkStatus || bulkLoading}
          >
            <CheckSquare size={14} />
            {bulkLoading ? 'Applying…' : `Apply to ${selected.size}`}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelected(new Set())}
          >
            <XSquare size={14} /> Clear
          </button>
        </div>
      )}

      {/* Queue Table */}
      {loading ? (
        <div className="queue-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton" style={{ width: 24, height: 24 }} />
              <div className="skeleton" style={{ width: 80, height: 22 }} />
              <div className="skeleton" style={{ flex: 1, height: 16 }} />
              <div className="skeleton" style={{ width: 120, height: 16 }} />
              <div className="skeleton" style={{ width: 80, height: 16 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <Filter size={32} color="var(--text-muted)" />
          <p>No SIF precursors match your current filters</p>
          <button className="btn btn-ghost" onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="queue-list">
          <div className="queue-header">
            <span>
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                title="Select all"
              />
            </span>
            <span>SIF Tier</span>
            <span>Report Excerpt</span>
            <span>Site / Activity</span>
            <span>Rule</span>
            <span>Confidence</span>
            <span>Status</span>
            <span></span>
          </div>

          {filtered.map(r => (
            <div
              key={r.id}
              className={`queue-row card ${selected.has(r.id) ? 'row-selected' : ''}`}
              onClick={() => navigate(`/report/${r.id}`)}
            >
              <span onClick={e => toggleSelect(r.id, e)} className="row-check">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => {}}
                />
              </span>
              <span><span className={badgeClass(r.sif_potential)}>{r.sif_potential}</span></span>
              <span className="report-excerpt">
                <span className="excerpt-text">{r.report_text.slice(0, 90)}…</span>
                {/* Why flagged — top evidence */}
                {r.evidence_spans?.length > 0 && (
                  <span className="q-why-line">
                    ⚠ &ldquo;{r.evidence_spans[0].slice(0, 70)}{r.evidence_spans[0].length > 70 ? '…' : ''}&rdquo;
                  </span>
                )}
                {/* Barrier state mini-summary */}
                {r.barrier_summary && (
                  <span className="q-barrier-mini">
                    {r.barrier_summary.map(b => (
                      <span
                        key={b.id}
                        className={`q-bs q-bs-${b.state.toLowerCase()}`}
                        title={`${b.short}: ${b.state}`}
                      >
                        {b.short.split(' ')[0]}: {b.state === 'FAILED' ? '✕' : b.state === 'INTACT' ? '✓' : b.state === 'ABSENT' ? '✕' : '?'}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className="site-cell">
                <span className="site-text">{r.site}</span>
                <span className="activity-text">{r.activity}</span>
              </span>
              <span>
                {r.rule_tags.slice(0, 1).map(tag => (
                  <span key={tag} className="badge badge-rule">{tag.split(' ')[0]}</span>
                ))}
              </span>
              <span>
                <div className="conf-bar-wrap">
                  <div className="conf-bar" style={{
                    width: `${r.confidence * 100}%`,
                    background: r.sif_potential === 'HIGH' ? '#ef4444'
                      : r.sif_potential === 'MEDIUM' ? '#f97316' : '#60a5fa',
                  }} />
                  <span className="conf-pct">{(r.confidence * 100).toFixed(0)}%</span>
                </div>
              </span>
              <span>
                <span className={reviewBadgeClass(r.review_status)}>
                  {r.review_status.replace(/_/g, ' ')}
                </span>
              </span>
              <span className="row-chevron"><ChevronRight size={16} /></span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
