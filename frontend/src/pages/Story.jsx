import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, AlertTriangle, Shield, Eye, Heart, GitBranch } from 'lucide-react'
import './Story.css'

const STORY_STEPS = [
  {
    chapter: 'Chapter 1',
    type: 'scene',
    icon: '🌙',
    title: 'Night Shift. Well-W-31. 2:40 AM.',
    text: `The oil field is quiet. A roustabout — 26 years old, three years on the job — walks toward Wellhead W-31. His task is routine: check the master valve position.`,
    detail: `The well is flowing at 280 bar bottom-hole pressure. That's 4,061 PSI — enough force to launch a steel component 50 metres.`,
    highlight: null,
    verdict: null,
  },
  {
    chapter: 'Chapter 2',
    type: 'incident',
    icon: '🩹',
    title: 'A Minor Cut. Nothing Serious.',
    text: `He reaches for the handwheel. The valve is rough-edged from years of use. His grip slips. A small laceration on his left index finger — barely 2cm. He wraps it with a cloth and keeps working.`,
    detail: `First Aid Case. That's how it was recorded. A minor first-aid case. The well was live and pressurised at the time of contact.`,
    highlight: 'This is what a conventional safety system sees: a minor first-aid case. No alert. No escalation.',
    verdict: null,
  },
  {
    chapter: 'Chapter 3',
    type: 'conventional',
    icon: '😴',
    title: 'What Conventional Systems Do.',
    text: `The report enters the shared inbox. It joins 200+ other reports for the monthly review cycle. An HSE officer will look at it in 28 days.`,
    detail: `The injury is minor. The report is categorised: First Aid. No SIF flag. No pattern detected. No intervention. Life goes on at Well-W-31.`,
    highlight: '⚠️ 48 hours later: another worker, same well, same valve, same bypass of isolation. The system doesn\'t know.',
    verdict: '❌ Without AI: 45-day review lag. Systemic failure invisible. Same incident happens again.',
  },
  {
    chapter: 'Chapter 4',
    type: 'prevora',
    icon: '🤖',
    title: 'What PREVORA Sees.',
    text: `PREVORA ingests the report in under 1 second. It reads beyond the surface injury. It sees what matters.`,
    detail: null,
    bullets: [
      { icon: '⚡', label: 'Energy Signal', text: 'Wellhead master valve · 280 bar BHP · live pressure at time of contact' },
      { icon: '🚧', label: 'Barrier Failure', text: 'Isolation procedure bypassed · worker assumed valve was in closed position' },
      { icon: '📐', label: 'Counterfactual Δ = 1', text: 'ONE barrier from fatality — if grip had slipped further, pressurised release' },
      { icon: '🔁', label: 'Recurring Pattern', text: 'Second report from Well-W-31 in 48 hours · same root cause · night crew' },
    ],
    highlight: null,
    verdict: null,
  },
  {
    chapter: 'Chapter 5',
    type: 'result',
    icon: '🛡️',
    title: 'The Classification.',
    text: `PREVORA flags the report as HIGH SIF POTENTIAL with 85.5% confidence. The counterfactual delta is 1 — critical proximity to a fatality.`,
    detail: `The report is pinned at the top of the Priority Queue. The HSE manager is notified. A duplicate pattern banner appears: "Recurring same-site failure — 2 reports in 48 hours."`,
    highlight: '✅ WITH PREVORA: Intervention deployed within hours. Night crew briefed on isolation procedure. No further incidents.',
    verdict: '🛡️ The worker goes home. Both times. That\'s the point.',
    final: true,
  },
]

const TYPE_COLORS = {
  scene: '#60a5fa',
  incident: '#f59e0b',
  conventional: '#ef4444',
  prevora: '#f59e0b',
  result: '#22c55e',
}

/* ─── Safety Chain Replay component ─────────────────────────────────────── */
const CHAIN_EVENTS = [
  { time: '22:05', label: 'Permit issued',           barrier: 'Permit to Work',        state: 'INTACT',   note: 'PTW-2847 raised by shift supervisor' },
  { time: '22:18', label: 'Energy isolation',         barrier: 'Energy Isolation',      state: 'UNSTATED', note: 'Isolation not recorded in logbook — verification unclear' },
  { time: '22:31', label: 'Verification check',       barrier: 'Isolation Verification',state: 'FAILED',   note: '"Equipment was assumed to be isolated" — report text' },
  { time: '22:37', label: 'Work commences',            barrier: 'Work Execution',        state: 'EXPOSURE', note: 'Task began without confirmed zero-energy state' },
  { time: '22:40', label: 'Near-miss event',           barrier: 'Outcome',               state: 'SIF',      note: 'Stored energy released — no injury, high consequence potential' },
]

const STATE_CFG = {
  INTACT:   { color: '#22c55e', icon: '✓', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)' },
  UNSTATED: { color: '#eab308', icon: '?', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.25)' },
  FAILED:   { color: '#ef4444', icon: '✕', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)' },
  EXPOSURE: { color: '#f59e0b', icon: '⚠', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
  SIF:      { color: '#ef4444', icon: '🚨', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)' },
}

function ChainReplay({ navigate }) {
  const [revealed, setRevealed] = useState(0)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const t = setInterval(() => {
      setRevealed(r => (r < CHAIN_EVENTS.length ? r + 1 : r))
    }, 600)
    return () => clearInterval(t)
  }, [])

  const transitions = ['INTACT', 'UNSTATED', 'FAILED', 'EXPOSURE'].join(' → ')

  return (
    <div className="chain-page fade-in">
      <div className="chain-header">
        <GitBranch size={20} color="var(--amber)" />
        <div>
          <div className="chain-title">SAFETY CHAIN REPLAY</div>
          <div className="chain-sub">Well-W-31 · 22 September · Near-Miss Event</div>
        </div>
      </div>

      <div className="chain-transitions">
        {['INTACT','UNSTATED','FAILED','EXPOSURE'].map((s, i, arr) => (
          <span key={s}>
            <span style={{ color: STATE_CFG[s].color, fontWeight: 800, fontSize: '0.7rem' }}>{s}</span>
            {i < arr.length - 1 && <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>}
          </span>
        ))}
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 8 }}>barrier transition sequence</span>
      </div>

      <div className="chain-timeline">
        {CHAIN_EVENTS.map((event, i) => {
          const cfg = STATE_CFG[event.state]
          const isVisible = i < revealed
          const isSel = selected === i
          return (
            <div key={i} className={`chain-event ${isVisible ? 'chain-visible' : ''}`} style={{ '--delay': `${i * 0.08}s` }}>
              {/* Connector line */}
              {i < CHAIN_EVENTS.length - 1 && (
                <div className="chain-connector" style={{ borderColor: isVisible ? cfg.color : 'var(--border)', opacity: isVisible ? 0.5 : 0.15 }} />
              )}

              <div
                className={`chain-node ${isSel ? 'chain-node-active' : ''}`}
                style={{ background: cfg.bg, borderColor: cfg.border }}
                onClick={() => setSelected(isSel ? null : i)}
              >
                <div className="chain-time">{event.time}</div>
                <div className="chain-event-label">{event.label}</div>
                <div className="chain-barrier">{event.barrier}</div>
                <div className="chain-state-badge" style={{ color: cfg.color, background: `${cfg.color}15`, borderColor: `${cfg.color}35` }}>
                  {cfg.icon} {event.state}
                </div>
                {isSel && (
                  <div className="chain-evidence">{event.note}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="chain-insight card">
        <div className="chain-insight-title">PREVORA IDENTIFIED: 4 barrier transitions</div>
        <div className="chain-insight-seq">{transitions}</div>
        <p className="chain-insight-text">
          PREVORA reconstructed this sequence from unstructured report text — no manual coding required.
          The UNSTATED state at 22:18 is critical: it is not the same as INTACT.
          Silence is not safety.
        </p>
        <div className="chain-insight-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/queue')}>View Priority Reports →</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/barrier-health')}>Defence Monitor</button>
        </div>
      </div>
    </div>
  )
}

export default function Story() {
  const [tab, setTab] = useState('story')
  const [step, setStep] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const navigate = useNavigate()

  const current = STORY_STEPS[step]
  const isLast = step === STORY_STEPS.length - 1

  // Auto-reveal after 400ms delay per step
  useEffect(() => {
    setRevealed(false)
    const t = setTimeout(() => setRevealed(true), 300)
    return () => clearTimeout(t)
  }, [step])

  const next = () => { if (!isLast) setStep(s => s + 1) }
  const prev = () => { if (step > 0) setStep(s => s - 1) }

  const accentColor = TYPE_COLORS[current.type]

  return (
    <div className="story-page fade-in">
      {/* Tab switcher */}
      <div className="story-tabs">
        <button className={`story-tab ${tab === 'story' ? 'active' : ''}`} onClick={() => setTab('story')}>
          📖 Incident Story
        </button>
        <button className={`story-tab ${tab === 'chain' ? 'active' : ''}`} onClick={() => setTab('chain')}>
          🧬 Safety Chain Replay
        </button>
      </div>

      {tab === 'chain' && <ChainReplay navigate={navigate} />}

      {tab === 'story' && <>
      {/* Progress bar */}
      <div className="story-progress-bar">
        <div
          className="story-progress-fill"
          style={{ width: `${((step + 1) / STORY_STEPS.length) * 100}%`, background: accentColor }}
        />
      </div>

      {/* Chapter dots */}
      <div className="story-dots">
        {STORY_STEPS.map((s, i) => (
          <button
            key={i}
            className={`story-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            style={i === step ? { background: accentColor, boxShadow: `0 0 12px ${accentColor}` } : {}}
            onClick={() => setStep(i)}
            title={s.title}
          />
        ))}
      </div>

      {/* Main card */}
      <div className={`story-card ${revealed ? 'revealed' : ''}`} style={{ '--accent': accentColor }}>
        <div className="story-chapter-badge" style={{ background: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}40` }}>
          {current.chapter}
        </div>

        <div className="story-icon">{current.icon}</div>
        <h2 className="story-title" style={{ color: current.type === 'result' ? '#22c55e' : undefined }}>
          {current.title}
        </h2>

        <p className="story-text">{current.text}</p>

        {current.detail && (
          <div className="story-detail-box" style={{ borderColor: `${accentColor}30`, background: `${accentColor}08` }}>
            {current.detail}
          </div>
        )}

        {/* PREVORA bullets */}
        {current.bullets && (
          <div className="story-bullets">
            {current.bullets.map((b, i) => (
              <div
                key={i}
                className="story-bullet"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <span className="bullet-icon">{b.icon}</span>
                <div>
                  <div className="bullet-label" style={{ color: accentColor }}>{b.label}</div>
                  <div className="bullet-text">{b.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Highlight box */}
        {current.highlight && (
          <div className={`story-highlight ${current.type === 'conventional' ? 'highlight-red' : 'highlight-green'}`}>
            {current.highlight}
          </div>
        )}

        {/* Verdict */}
        {current.verdict && (
          <div className={`story-verdict ${current.type === 'conventional' ? 'verdict-red' : 'verdict-green'}`}>
            {current.verdict}
          </div>
        )}

        {/* Final CTA */}
        {current.final && (
          <div className="story-final-cta">
            <p className="final-tagline">
              Every warning sign matters. Every fatality is preventable.
            </p>
            <div className="final-buttons">
              <button className="btn btn-primary" onClick={() => navigate('/queue')}>
                <Eye size={16} /> Open Priority Queue
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                View Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="story-nav">
        <button className="story-nav-btn" onClick={prev} disabled={step === 0}>
          <ChevronLeft size={20} /> Previous
        </button>

        <span className="story-counter">
          {step + 1} / {STORY_STEPS.length}
        </span>

        {!isLast ? (
          <button className="story-nav-btn story-nav-next" onClick={next} style={{ borderColor: accentColor, color: accentColor }}>
            Next Chapter <ChevronRight size={20} />
          </button>
        ) : (
          <button className="story-nav-btn story-nav-next" onClick={() => setStep(0)} style={{ borderColor: '#22c55e', color: '#22c55e' }}>
            Read Again <Heart size={16} />
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="story-keyboard-hint">Use ← → arrow keys to navigate</p>
      </>}
    </div>
  )
}
