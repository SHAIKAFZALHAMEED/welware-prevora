import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Landing.css'

/* ── Animated number counter ───────────────────────────────────── */
function Counter({ target, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      let start = 0
      const step = target / (duration / 16)
      const tick = () => {
        start = Math.min(start + step, target)
        setVal(Math.floor(start))
        if (start < target) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

/* ── Live classification demo ──────────────────────────────────── */
const DEMO_REPORT = `Operator entered H2S-rated zone without gas detector. Area H2S concentration was 18 ppm. No standby man assigned. MSDS not reviewed. Isolation valve left partially open.`

const DEMO_STEPS = [
  { delay: 0,    text: 'Ingesting report text…' },
  { delay: 800,  text: 'Scanning 7 IOGP Life-Saving Rules…' },
  { delay: 1600, text: 'Energy Isolation pattern detected.' },
  { delay: 2200, text: 'Confined Space entry marker detected.' },
  { delay: 2800, text: 'Barrier failures: 3 of 4 absent.' },
  { delay: 3400, text: 'Counterfactual Delta: 1 — CRITICAL proximity.' },
  { delay: 4000, text: 'Classification complete.' },
]

function LiveDemo() {
  const [lines, setLines] = useState([])
  const [done, setDone] = useState(false)
  const [running, setRunning] = useState(false)

  const run = () => {
    if (running) return
    setRunning(true)
    setLines([])
    setDone(false)
    DEMO_STEPS.forEach((s, i) => {
      setTimeout(() => {
        setLines(prev => [...prev, s.text])
        if (i === DEMO_STEPS.length - 1) {
          setTimeout(() => setDone(true), 400)
          setTimeout(() => setRunning(false), 1000)
        }
      }, s.delay)
    })
  }

  return (
    <div className="demo-box">
      <div className="demo-top">
        <span className="demo-label">LIVE CLASSIFIER</span>
        <button className="demo-run-btn" onClick={run} disabled={running}>
          {running ? '⟳ Classifying…' : '▶ Run Demo'}
        </button>
      </div>
      <div className="demo-report-text">{DEMO_REPORT}</div>
      <div className="demo-terminal">
        {lines.map((l, i) => (
          <div key={i} className="demo-line">
            <span className="demo-prompt">›</span> {l}
          </div>
        ))}
        {done && (
          <div className="demo-result">
            <span className="result-badge-high">● HIGH SIF POTENTIAL</span>
            <span className="result-conf">Confidence 80.4%</span>
            <span className="result-delta">Δ = 1 barrier from fatality</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Before / After comparison ─────────────────────────────────── */
function BeforeAfter() {
  const [pos, setPos] = useState(50)
  const ref = useRef(null)

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    setPos(Math.max(5, Math.min(95, (x / rect.width) * 100)))
  }

  return (
    <div className="ba-wrapper" ref={ref} onMouseMove={onMove} onTouchMove={onMove}>
      <div className="ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <div className="ba-label ba-label-before">BEFORE PREVORA</div>
        <div className="ba-content">
          <div className="ba-step bad">📋 Report submitted by field worker</div>
          <div className="ba-step bad">📥 Enters shared inbox (unread)</div>
          <div className="ba-step bad">⏳ Monthly review cycle begins</div>
          <div className="ba-step bad">👤 HSE officer manually reads 200+ reports</div>
          <div className="ba-step bad">📆 45 days pass. Pattern identified.</div>
          <div className="ba-step fatal">💀 Incident occurs at Well-W-31 on day 12.</div>
        </div>
      </div>
      <div className="ba-after">
        <div className="ba-label ba-label-after">WITH PREVORA</div>
        <div className="ba-content">
          <div className="ba-step good">📋 Report submitted by field worker</div>
          <div className="ba-step good">⚡ Classified in &lt; 1 second — HIGH SIF</div>
          <div className="ba-step good">🚨 HSE manager alerted immediately</div>
          <div className="ba-step good">🔁 Recurring pattern detected at Well-W-31</div>
          <div className="ba-step good">✅ Intervention deployed on day 1</div>
          <div className="ba-step saved">🛡️ Worker goes home safe.</div>
        </div>
      </div>
      <div className="ba-divider" style={{ left: `${pos}%` }}>
        <div className="ba-handle">⟷</div>
      </div>
    </div>
  )
}

/* ── Feature cards ──────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '🧠',
    title: 'Tiered NLP Classifier',
    desc: 'Rule-based engine runs in <1ms. DistilBERT transformer upgrade activates with a single env variable. Zero retraining needed.',
    tag: 'AI/NLP',
  },
  {
    icon: '⚡',
    title: 'Counterfactual Delta',
    desc: '"How many barriers stand between this incident and a fatality?" A unique 1–4 proximity score no other tool computes.',
    tag: 'Unique',
  },
  {
    icon: '🔁',
    title: 'Active Learning Loop',
    desc: 'Every human Confirm/Reject trains the AI. Keywords extracted from confirmed SIFs boost future detections automatically.',
    tag: 'Self-Improving',
  },
  {
    icon: '📍',
    title: 'Site × Rule Heatmap',
    desc: 'Instantly see which IOGP Life-Saving Rule is most violated at which site. Click any cell — filter the queue instantly.',
    tag: 'Dashboard',
  },
  {
    icon: '🔍',
    title: 'Latent SIF Detection',
    desc: 'A minor finger cut + live wellhead at 280 bar BHP = HIGH SIF. PREVORA catches what severity-only systems miss.',
    tag: 'Key Differentiator',
  },
  {
    icon: '📎',
    title: 'Duplicate Pattern Alert',
    desc: 'Same site, same failure, different shift. PREVORA flags recurring systemic precursors before they escalate.',
    tag: 'Intelligence',
  },
]

/* ── Main landing ───────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">

      {/* NAV */}
      <nav className={`land-nav ${scrolled ? 'land-nav-scrolled' : ''}`}>
        <div className="land-nav-brand">
          <span className="brand-dot" />
          PREVORA
        </div>
        <div className="land-nav-links">
          <a href="#features">Features</a>
          <a href="#demo">Live Demo</a>
          <a href="#impact">Impact</a>
          <button className="btn-nav-cta" onClick={() => navigate('/login')}>
            Open Dashboard →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-bg-grid" />
        <div className="hero-glow" />

        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          SIH 2026 · Oil India Limited · Problem ID 26165
        </div>

        <h1 className="hero-title">
          Every warning sign<br />
          <span className="hero-title-amber">matters.</span>
        </h1>

        <p className="hero-sub">
          Every fatality is preventable.
        </p>

        <p className="hero-desc">
          PREVORA is an AI/NLP safety intelligence platform that reads OIL's
          UA/UC and near-miss reports and flags <strong>Serious Injury &amp; Fatality
          precursors in under 1 second</strong> — replacing 45-day manual review cycles
          with real-time intervention intelligence.
        </p>

        <div className="hero-ctas">
          <button className="btn-hero-primary" onClick={() => navigate('/login')}>
            Access Live Dashboard
          </button>
          <a href="#demo" className="btn-hero-ghost">
            Watch Live Demo ↓
          </a>
        </div>

        <div className="hero-stats">
          <div className="h-stat">
            <div className="h-stat-val amber"><Counter target={64} /></div>
            <div className="h-stat-lbl">Reports Analysed</div>
          </div>
          <div className="h-stat-div" />
          <div className="h-stat">
            <div className="h-stat-val red"><Counter target={14} /></div>
            <div className="h-stat-lbl">HIGH SIF Flagged</div>
          </div>
          <div className="h-stat-div" />
          <div className="h-stat">
            <div className="h-stat-val green"><Counter target={1} suffix="ms" /></div>
            <div className="h-stat-lbl">Classification Time</div>
          </div>
          <div className="h-stat-div" />
          <div className="h-stat">
            <div className="h-stat-val blue">45d→5s</div>
            <div className="h-stat-lbl">vs Manual Review</div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="problem-section">
        <div className="problem-inner">
          <div className="section-eyebrow">The Problem</div>
          <h2 className="section-title">OIL collects thousands of safety reports.<br />Most fatalities are hidden inside them.</h2>
          <div className="problem-cards">
            <div className="problem-card">
              <div className="problem-icon">📉</div>
              <div className="problem-stat">51%</div>
              <div className="problem-lbl">Non-fatal accidents reduced globally in 15 years</div>
            </div>
            <div className="problem-card problem-card-alert">
              <div className="problem-icon">💀</div>
              <div className="problem-stat">25.5%</div>
              <div className="problem-lbl">Fatalities reduced in the same period</div>
              <div className="problem-note">Non-fatal incidents do NOT share the same causes as fatalities</div>
            </div>
            <div className="problem-card">
              <div className="problem-icon">🔎</div>
              <div className="problem-stat">20–25%</div>
              <div className="problem-lbl">Of all reports carry genuine fatal potential — but look routine</div>
            </div>
          </div>
          <p className="problem-source">
            Source: DEKRA Martin &amp; Black (2015) · EEI SIF Precursor Model · VelocityEHS PSIF Classifier (2024)
          </p>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="ba-section" id="impact">
        <div className="section-eyebrow">The Transformation</div>
        <h2 className="section-title">Drag to see the difference PREVORA makes</h2>
        <BeforeAfter />
      </section>

      {/* LIVE DEMO */}
      <section className="demo-section" id="demo">
        <div className="demo-inner">
          <div className="section-eyebrow">Live Classifier</div>
          <h2 className="section-title">Watch AI classify a real safety report</h2>
          <p className="section-sub">
            Press Run Demo — the same engine running on OIL's reports, right now.
          </p>
          <LiveDemo />
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="section-eyebrow">What Makes PREVORA Different</div>
        <h2 className="section-title">Built for the 20% of reports that matter most</h2>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feat-card">
              <div className="feat-icon">{f.icon}</div>
              <span className="feat-tag">{f.tag}</span>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* IOGP RULES */}
      <section className="rules-section">
        <div className="section-eyebrow">IOGP Life-Saving Rules Coverage</div>
        <h2 className="section-title">Auto-tagged to all 7 critical rule categories</h2>
        <div className="rules-grid">
          {['Energy Isolation (LOTO)', 'Confined Space Entry', 'Hot Work', 'Line of Fire', 'Working at Height', 'Bypass of Safety Controls', 'General Safety'].map((r, i) => (
            <div key={r} className="rule-chip">
              <span className="rule-num">0{i + 1}</span>
              {r}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-glow" />
        <h2 className="cta-title">See PREVORA in action.</h2>
        <p className="cta-sub">
          64 OIL-style reports. 14 HIGH SIF precursors. Live AI classification.<br />
          No setup. No installation. Just open the dashboard.
        </p>
        <button className="btn-cta-big" onClick={() => navigate('/login')}>
          Open Dashboard →
        </button>
        <p className="cta-creds">Login: hse@oil.in · prevora2026</p>
      </section>

      {/* FOOTER */}
      <footer className="land-footer">
        <div className="footer-brand">
          <span className="brand-dot" />
          PREVORA
        </div>
        <p className="footer-tag">AI/NLP SIF Precursor Intelligence Platform for Oil India Limited</p>
        <p className="footer-team">Team WELWARE · SIH 2026 · Problem ID 26165 · Theme: Smart Automation</p>
      </footer>
    </div>
  )
}
