const BASE = (import.meta.env.VITE_API_URL || '') + '/api/v1'

async function request(path, options = {}) {
  const token = localStorage.getItem('prevora_token')
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Reports
  getReports: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString()
    return request(`/reports/?${qs}`)
  },
  getReport: (id) => request(`/reports/${id}`),
  reviewReport: (id, review_status, reviewer_notes = '') =>
    request(`/reports/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ review_status, reviewer_notes }),
    }),
  getSites: () => request('/reports/meta/sites'),
  getRules: () => request('/reports/meta/rules'),
  getHeroReports: () => request('/reports/hero'),
  bulkReview: (report_ids, review_status, reviewer_notes = '') =>
    request('/reports/bulk-review', {
      method: 'POST',
      body: JSON.stringify({ report_ids, review_status, reviewer_notes }),
    }),
  getReport: (id) => request(`/reports/${id}`),
  getSimilarSIF: (id) => request(`/reports/${id}/similar`),

  // Classify (ad-hoc, no persist)
  classify: (report_text, site = 'Unknown', activity = 'Unknown') =>
    request('/classify/', {
      method: 'POST',
      body: JSON.stringify({ report_text, site, activity }),
    }),

  // Ingest (classify + persist)
  ingest: (report_text, site = 'Unknown', activity = 'Unknown') =>
    request('/ingest/', {
      method: 'POST',
      body: JSON.stringify({ report_text, site, activity }),
    }),

  // Dashboard
  getSummary: () => request('/dashboard/summary'),
  getSiteRanking: () => request('/dashboard/site-ranking'),
  getRuleDistribution: () => request('/dashboard/rule-distribution'),
  getPrecursorRadar: () => request('/dashboard/precursor-radar'),

  // Feedback / Active Learning
  getFeedbackStats: () => request('/feedback/stats'),
  refreshFeedback: () => request('/feedback/refresh', { method: 'POST' }),

  // Admin
  reclassifyAll: () => request('/admin/reclassify-all', { method: 'POST' }),

  // Demo / Phase 4
  getDemoWalkthrough: () => request('/demo/walkthrough'),
  getDemoEdgeCases: () => request('/demo/edge-cases'),
  getDemoStats: () => request('/demo/stats'),
  checkDuplicate: (report_id, report_text, threshold = 0.45) =>
    request(`/reports/${report_id}/check-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ report_text, threshold }),
    }),

  // Heatmap
  getHeatmap: () => request('/dashboard/heatmap'),

  // Barrier Health Intelligence
  getBarrierMatrix: () => request('/dashboard/barrier-health/matrix'),
  getConvergenceZones: () => request('/dashboard/barrier-health/convergence'),
  simulateIntervention: (site) => request(`/dashboard/barrier-health/simulate?site=${encodeURIComponent(site)}`),
  getBarrierDetail: (barrierId, site) =>
    request(`/dashboard/barrier-health/detail?barrier=${encodeURIComponent(barrierId)}${site ? `&site=${encodeURIComponent(site)}` : ''}`),

  // Field Map
  getMapSites: () => request('/dashboard/map-sites'),
  getRegionIntelligence: () => request('/dashboard/region-intelligence'),

  // Barrier Migration
  getBarrierMigration: () => request('/dashboard/barrier-migration'),

  // Site Intelligence (Pan-India Map drill-down)
  getSiteIntelligence: (site) => request(`/dashboard/site-intelligence?site=${encodeURIComponent(site)}`),
  getAllSitesSummary: () => request('/dashboard/all-sites-summary'),

  // Benchmark (Layer 3 — external OSHA/CSB/MSHA data — separate from OIL demo data)
  getBenchmarkSummary: () => request('/benchmark/summary'),
  getBenchmarkRecords: (sif) => request(`/benchmark/records${sif ? `?sif=${sif}` : ''}`),

  // Ingest (classify + save)
  ingestReport: (body) => request('/ingest/', { method: 'POST', body: JSON.stringify(body) }),

  // Similar SIF
  getSimilarSIF: (id) => request(`/reports/${id}/similar`),
}
