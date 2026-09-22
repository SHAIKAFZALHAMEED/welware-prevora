import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import './Login.css'

/*
  Phase timeline:
  0.0s  'welware'   — WELWARE cinematic intro (scan + glow)
  3.2s  'prevora'   — PREVORA crossfade
  5.0s  'enter'     — Button reveals
  click 'processing' — Dramatic auth sequence before entering
*/

function Particles() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      a: Math.random() * 0.5 + 0.1,
    }))
    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = canvas.width
        if (d.x > canvas.width) d.x = 0
        if (d.y < 0) d.y = canvas.height
        if (d.y > canvas.height) d.y = 0
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245,158,11,${d.a})`
        ctx.fill()
      })
      // draw connecting lines
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = `rgba(245,158,11,${0.06 * (1 - dist/110)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="lp-particles" />
}

const PROCESSING_STEPS = [
  { ms: 0,    text: 'INITIALISING SECURE CHANNEL…' },
  { ms: 480,  text: 'AUTHENTICATING IDENTITY…' },
  { ms: 960,  text: 'LOADING SIF INTELLIGENCE ENGINE…' },
  { ms: 1440, text: 'DECRYPTING BARRIER HEALTH MATRIX…' },
  { ms: 1900, text: 'ESTABLISHING FIELD LINK…' },
  { ms: 2300, text: 'ACCESS GRANTED' },
]

function ProcessingScreen({ onDone }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [done, setDone]       = useState(false)

  useEffect(() => {
    PROCESSING_STEPS.forEach((s, i) => {
      setTimeout(() => {
        setStepIdx(i)
        if (i === PROCESSING_STEPS.length - 1) {
          setDone(true)
          setTimeout(onDone, 700)
        }
      }, s.ms + 200)
    })
  }, [])

  return (
    <div className={`lp-proc-root ${done ? 'lp-proc-done' : ''}`}>
      <Particles />
      <div className="lp-proc-centre">
        <div className="lp-proc-ring">
          <div className={`lp-proc-ring-inner ${done ? 'lp-proc-ring-done' : ''}`} />
        </div>
        <div className="lp-proc-steps">
          {PROCESSING_STEPS.slice(0, stepIdx + 1).map((s, i) => (
            <div
              key={i}
              className={`lp-proc-line ${i === stepIdx ? 'lp-proc-line-active' : 'lp-proc-line-done'} ${s.text === 'ACCESS GRANTED' ? 'lp-proc-granted' : ''}`}
            >
              <span className="lp-proc-bullet">{i === stepIdx && !done ? '▶' : '✓'}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
        {done && (
          <div className="lp-proc-welcome">
            WELCOME, SHAIK AFZAL HAMEED
          </div>
        )}
      </div>
    </div>
  )
}

export default function Login({ onLogin }) {
  const [phase, setPhase]     = useState('welware')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const tokenRef = useRef(null)
  const userRef  = useRef(null)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('prevora'), 3200)
    const t2 = setTimeout(() => setPhase('enter'),   5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleEnter = async () => {
    setLoading(true)
    try {
      const res = await api.login('hse@prevora.demo', 'prevora2026')
      tokenRef.current = res.token
      userRef.current  = { name: res.name, role: res.role, email: res.email }
    } catch {
      try {
        const res = await api.login('hse@oil.in', 'prevora2026')
        tokenRef.current = res.token
        userRef.current  = { name: res.name, role: res.role, email: res.email }
      } catch { setLoading(false); return }
    }
    localStorage.setItem('prevora_token', tokenRef.current)
    setProcessing(true)
  }

  const handleProcessingDone = () => {
    onLogin(userRef.current)
  }

  if (processing) {
    return <ProcessingScreen onDone={handleProcessingDone} />
  }

  return (
    <div className="lp-root">
      <Particles />
      <div className="lp-bg" />
      <div className="lp-grid" />

      {phase === 'welware' && <div className="lp-scanline" />}
      {phase === 'welware' && <div className="lp-scanline lp-scanline-2" />}

      <div className="lp-corner lp-corner-tl" />
      <div className="lp-corner lp-corner-tr" />
      <div className="lp-corner lp-corner-bl" />
      <div className="lp-corner lp-corner-br" />

      <div className="lp-centre">

        {/* ── WELWARE ───────────────────────────────────────────── */}
        <div className={`lp-welware-block ${phase !== 'welware' ? 'lp-phase-out' : 'lp-phase-in'}`}>
          <div className="lp-welware-eyebrow">WELWARE</div>
          <div className="lp-welware-tagline">AI · SAFETY · INTELLIGENCE</div>
          <div className="lp-welware-bar" />
          <div className="lp-welware-sub">OIL INDIA LIMITED · HSSE INTELLIGENCE DIVISION</div>
        </div>

        {/* ── PREVORA ───────────────────────────────────────────── */}
        <div className={`lp-prevora-block ${phase === 'welware' ? 'lp-phase-hidden' : 'lp-phase-in'}`}>
          <div className="lp-prevora-eyebrow">WELWARE PRESENTS</div>
          <div className="lp-prevora-wordmark">PREVORA</div>
          <div className="lp-prevora-sub">Safety Intelligence Platform</div>
          <div className="lp-divider" />

          <div className={`lp-access-block ${phase === 'enter' ? 'lp-access-visible' : 'lp-access-hidden'}`}>
            <div className="lp-access-label">SECURE ACCESS</div>
            <button
              className={`lp-enter-btn ${loading ? 'lp-enter-loading' : ''}`}
              onClick={handleEnter}
              disabled={loading}
            >
              {loading
                ? <><span className="lp-btn-dot" /><span className="lp-btn-dot" /><span className="lp-btn-dot" /></>
                : <>ENTER PREVORA <span className="lp-arrow">→</span></>
              }
            </button>
          </div>
        </div>
      </div>

      <div className={`lp-footer ${phase === 'enter' ? 'lp-footer-visible' : ''}`}>
        <span>PREVORA SIF Sentinel · SIH26165 · WELWARE</span>
        <span className="lp-footer-dot" />
        <span>Demo Environment · Synthetic Data · Not Live OIL Data</span>
      </div>
    </div>
  )
}
