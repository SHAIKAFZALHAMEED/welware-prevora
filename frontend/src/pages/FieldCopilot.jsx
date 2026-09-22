import { useState, useRef } from 'react'
import { api } from '../api'
import { Mic, MicOff, CheckCircle2, AlertTriangle, Send, RotateCcw, ArrowRight, Info } from 'lucide-react'
import './FieldCopilot.css'

/* ── Barrier taxonomy — decision-critical barriers for SIF assessment ─────── */
const BARRIERS = [
  {
    id: 'isolation',
    name: 'Energy Isolation (LOTO)',
    iogp: 'Control of Hazardous Energy',
    why: 'Uncontrolled energy release is the leading cause of serious injury in maintenance activities.',
    question: 'Was the energy source mechanically isolated before work began?',
    detectFail: t => /no isolation|not isolated|loto not done|no loto|live|pressurised|bypass|pressure still|still pressurized/.test(t),
    detectIntact: t => /isolated|lockout|loto|de-energised|zero energy|energy released/.test(t),
  },
  {
    id: 'verification',
    name: 'Independent Verification',
    iogp: 'Control of Hazardous Energy',
    why: 'Isolation must be independently verified — self-certification is a known failure pathway.',
    question: 'Was the isolation independently verified by a second person before work started?',
    detectFail: t => /not verified|no verification|no independent|self-certified|assumed safe/.test(t),
    detectIntact: t => /independently verified|second person verified|cross-checked|verification done/.test(t),
  },
  {
    id: 'gas_test',
    name: 'Gas / Atmospheric Testing',
    iogp: 'Work in Hazardous and Confined Areas',
    why: 'Undetected flammable or toxic atmosphere accounts for a significant proportion of confined space fatalities.',
    question: 'Was an atmospheric or gas test conducted before work?',
    detectFail: t => /no gas test|without test|no detector|not tested|gas not checked|no atmospheric/.test(t),
    detectIntact: t => /gas test|atmospheric test|lel check|gas reading|h2s monitor|clear reading/.test(t),
  },
  {
    id: 'permit',
    name: 'Permit to Work (PTW)',
    iogp: 'Work Authorisation',
    why: 'PTW failures are present in the majority of serious energy-release incidents.',
    question: 'Was a valid work permit raised and authorised before work began?',
    detectFail: t => /no permit|without permit|bypass permit|skipped permit|no ptw|permit not raised/.test(t),
    detectIntact: t => /permit|ptw|work permit|hot work permit|permit issued/.test(t),
  },
  {
    id: 'supervision',
    name: 'Supervision / Standby',
    iogp: 'Safe Mechanical Lifting — Supervision',
    why: 'Absence of supervision removes the last human barrier before exposure.',
    question: 'Was a supervisor or standby person present during the work?',
    detectFail: t => /no standby|no supervisor|alone|unsupervised|no attendant|nobody present/.test(t),
    detectIntact: t => /supervisor|standby|attendant|safety watch|observer present/.test(t),
  },
  {
    id: 'ppe',
    name: 'Personal Protective Equipment',
    iogp: 'Personal Protective Equipment',
    why: 'PPE is the last line of defence — its absence does not create the hazard but removes final protection.',
    question: 'Was the required PPE worn throughout the task?',
    detectFail: t => /no ppe|without helmet|no harness|missing ppe|ppe not worn|no mask/.test(t),
    detectIntact: t => /ppe|helmet|harness|gloves|respirator|scba|full kit/.test(t),
  },
  {
    id: 'sop',
    name: 'Safe Work Procedure (SOP)',
    iogp: 'Management of Change',
    why: 'Deviation from approved procedures removes procedural safeguards built from prior incident learning.',
    question: 'Was the approved safe work procedure followed?',
    detectFail: t => /no procedure|not followed|deviated|skipped steps|no jsa|no risk assessment|improvised/.test(t),
    detectIntact: t => /procedure|sop|jsa|risk assessment|method statement|followed steps/.test(t),
  },
]

const HAZARD_KW = {
  'Hydrocarbon / Gas': /gas|hydrocarbon|flammable|h2s|methane|vapour|vapor/,
  'Pressure Energy': /pressure|pressurised|pressurized|high pressure|residual pressure/,
  'Electrical Energy': /electric|live wire|arc|voltage|energized/,
  'Fall / Height': /height|fall|scaffold|ladder|elevated|roof|edge/,
  'Chemical Exposure': /chemical|acid|caustic|toxic|corrosive|solvent/,
  'Mechanical Energy': /rotating|moving parts|pinch|crush|equipment in motion/,
}
const ACTIVITY_KW = {
  'Line Opening / Breaking Containment': /line open|valve open|breaking containment|flange|break containment/,
  'Confined Space Entry': /confined space|entry|cse|tank entry|vessel entry/,
  'Hot Work': /welding|cutting|hot work|grinding|spark/,
  'Maintenance / Repair': /maintenance|repair|service|overhaul|inspection/,
  'Lifting Operations': /lift|crane|rigging|sling|hoist/,
  'Well / Drilling Operations': /well|drill|wellhead|christmas tree|bop/,
}
const ENERGY_KW = {
  'Pressure': /pressure|pressurised|pressurized/,
  'Electrical': /electric|live|voltage|energized/,
  'Gravitational': /fall|height|dropped|overhead/,
  'Mechanical': /rotating|moving|trapped|pinch/,
  'Chemical': /chemical|toxic|corrosive/,
  'Thermal': /heat|hot|burn|fire|flame/,
}
const EQUIPMENT_KW = {
  'Compressor': /compressor/,
  'Valve / Pipeline': /valve|pipeline|line|pipe/,
  'Pump': /pump/,
  'Tank / Vessel': /tank|vessel|drum/,
  'Crane / Lifting Equipment': /crane|hoist|rigging|sling/,
  'Electrical Panel': /panel|switchgear|breaker|electrical board/,
  'Scaffold': /scaffold|platform/,
}

function extractContext(text) {
  const t = text.toLowerCase()
  const hazard   = Object.entries(HAZARD_KW).find(([, r]) => r.test(t))?.[0] || null
  const activity = Object.entries(ACTIVITY_KW).find(([, r]) => r.test(t))?.[0] || null
  const energy   = Object.entries(ENERGY_KW).find(([, r]) => r.test(t))?.[0] || null
  const equipment = Object.entries(EQUIPMENT_KW).find(([, r]) => r.test(t))?.[0] || null

  const barriers = BARRIERS.map(b => {
    if (b.detectFail(t)) return { ...b, state: 'FAILED', source: 'report' }
    if (b.detectIntact(t)) return { ...b, state: 'INTACT', source: 'report' }
    return { ...b, state: 'UNSTATED', source: 'report' }
  })

  // Decision-critical barriers are those UNSTATED and whose failure would change SIF tier
  const failedCount = barriers.filter(b => b.state === 'FAILED').length
  const criticalBarriers = barriers.filter(b => b.state === 'UNSTATED')

  const sifPotential = computeSIF(barriers)
  return { hazard, activity, energy, equipment, barriers, criticalBarriers, sifPotential }
}

function computeSIF(barriers) {
  // FAILED isolation/verification/gas_test are the highest-weight indicators
  const highWeightFailed = barriers.filter(b =>
    ['isolation','verification','gas_test'].includes(b.id) && b.state === 'FAILED'
  ).length
  const anyFailed = barriers.filter(b => b.state === 'FAILED').length

  if (highWeightFailed >= 2 || anyFailed >= 3) return 'HIGH'
  if (anyFailed >= 1 || highWeightFailed >= 1) return 'MEDIUM'
  return 'LOW'
}

function sifExplanation(barriers) {
  const failed = barriers.filter(b => b.state === 'FAILED')
  if (!failed.length) return 'No barrier failures detected in the report text.'
  return failed.map(b => `${b.name} — FAILED`).join(' · ')
}

/* ── State chip ───────────────────────────────────────────────────────────── */
function StateChip({ state }) {
  const cfg = {
    FAILED:   ['✕', '#ef4444'],
    INTACT:   ['✓', '#22c55e'],
    UNSTATED: ['?', '#9ca3af'],
    ABSENT:   ['✕', '#ef4444'],
  }
  const [icon, color] = cfg[state] || ['?', '#6b7280']
  const title = state === 'UNSTATED'
    ? 'UNSTATED — report does not mention this barrier. This does NOT mean it failed.'
    : undefined
  return (
    <span className="state-chip" style={{ color, borderColor: `${color}40`, background: `${color}12` }} title={title}>
      {icon} {state}
    </span>
  )
}

/* ── SIF badge ────────────────────────────────────────────────────────────── */
function SIFBadge({ tier, label }) {
  const colors = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' }
  const c = colors[tier] || '#6b7280'
  return (
    <div className="fc-sif-badge" style={{ borderColor: c + '40', background: c + '10' }}>
      <div className="fc-sif-tier" style={{ color: c }}>{tier}</div>
      {label && <div className="fc-sif-badge-label">{label}</div>}
    </div>
  )
}

/* ── Answer button ────────────────────────────────────────────────────────── */
function AnswerBtn({ label, icon, variant, onClick }) {
  return (
    <button className={`fc-answer-btn fc-answer-${variant}`} onClick={onClick}>
      <span className="fc-answer-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

/* ── Interview Trace (collapsible Q→A→State audit) ───────────────────────── */
function InterviewTrace({ answers, questions, finalBarriers }) {
  const [open, setOpen] = useState(false)

  const ANSWER_LABEL = {
    YES: { text: 'Yes — confirmed', icon: '✓', color: '#22c55e' },
    NO:  { text: 'No — not done',  icon: '✕', color: '#ef4444' },
    IDK: { text: "I don't know",   icon: '?', color: '#9ca3af' },
    NA:  { text: 'Not applicable', icon: '—', color: '#6b7280' },
  }

  const rows = questions
    .filter(q => answers[q.id])
    .map(q => {
      const ans = answers[q.id]
      const barrier = finalBarriers.find(b => b.id === q.id)
      const state = barrier?.state || 'UNSTATED'
      const isKeyChange = (state === 'FAILED' || state === 'INTACT') && barrier?.source === 'interview'
      return { q, ans, state, isKeyChange }
    })

  if (rows.length === 0) return null

  return (
    <div className="fc-trace-wrap">
      <button className="fc-trace-toggle" onClick={() => setOpen(v => !v)}>
        <span className="fc-trace-icon">{open ? '▾' : '▸'}</span>
        <span>Interview Evidence ({rows.length} question{rows.length !== 1 ? 's' : ''})</span>
        <span className="fc-trace-sub">Q → Answer → Barrier State → Effect</span>
      </button>

      {open && (
        <div className="fc-trace-body">
          <div className="fc-trace-legend">
            <span style={{ color: '#22c55e' }}>✓ YES → INTACT</span>
            <span style={{ color: '#ef4444' }}>✕ NO → FAILED</span>
            <span style={{ color: '#9ca3af' }}>? IDK → UNSTATED</span>
            <span style={{ color: '#6b7280' }}>— NA → not assessed</span>
          </div>

          {rows.map(({ q, ans, state, isKeyChange }, i) => {
            const a = ANSWER_LABEL[ans] || ANSWER_LABEL.IDK
            const stateColor = state === 'FAILED' ? '#ef4444' : state === 'INTACT' ? '#22c55e' : '#9ca3af'
            return (
              <div key={q.id} className={`fc-trace-row ${isKeyChange ? 'fc-trace-row-key' : ''}`}>
                <div className="fc-trace-num">Q{i + 1}</div>
                <div className="fc-trace-content">
                  <div className="fc-trace-q">{q.question}</div>
                  <div className="fc-trace-q-why">
                    <span className="fc-trace-barrier">{q.name}</span>
                    <span className="fc-trace-iogp">IOGP: {q.iogp}</span>
                  </div>
                  <div className="fc-trace-answer-row">
                    <span className="fc-trace-ans" style={{ color: a.color }}>
                      {a.icon} {a.text}
                    </span>
                    <span className="fc-trace-arrow">→</span>
                    <span className="fc-trace-state" style={{ color: stateColor, fontWeight: 800 }}>
                      {state}
                    </span>
                    {isKeyChange && (
                      <span className="fc-trace-effect">
                        ★ drove assessment change
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <div className="fc-trace-footer">
            PREVORA — Question → Answer → Evidence → Barrier State → Assessment · Auditable chain
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function FieldCopilot() {
  const [step, setStep] = useState('input')   // input → analysing → interview → complete → submitted
  const [inputText, setInputText] = useState('')
  const [context, setContext] = useState(null)
  const [answers, setAnswers] = useState({})  // barrierId → 'YES'|'NO'|'IDK'|'NA'
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  /* ── Voice input ──────────────────────────────────────────────────────── */
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported. Use Chrome.'); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-IN'
    rec.onresult = e => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setInputText(transcript)
    }
    rec.onend = () => setIsListening(false)
    rec.start()
    recognitionRef.current = rec
    setIsListening(true)
  }
  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false) }

  /* ── Analyse ──────────────────────────────────────────────────────────── */
  const handleAnalyse = () => {
    if (!inputText.trim()) return
    setStep('analysing')
    setTimeout(() => {
      const ctx = extractContext(inputText)
      setContext(ctx)
      setAnswers({})
      setStep(ctx.criticalBarriers.length > 0 ? 'interview' : 'complete')
    }, 900)
  }

  /* ── Build barriers with answers applied ──────────────────────────────── */
  const getResolvedBarriers = (ans = answers) => {
    if (!context) return []
    return context.barriers.map(b => {
      if (b.state !== 'UNSTATED') return b
      const a = ans[b.id]
      if (!a) return b
      const state = a === 'YES' ? 'INTACT' : a === 'NO' ? 'FAILED' : 'UNSTATED'
      return { ...b, state, source: 'interview' }
    })
  }

  /* ── Adaptive branching: which barrier to ask next ────────────────────── */
  const getNextQuestion = (ans = answers) => {
    if (!context) return null
    // Re-evaluate SIF with current answers
    const resolved = getResolvedBarriers(ans)
    const currentSIF = computeSIF(resolved)

    // If SIF is already HIGH and we have enough evidence, stop asking
    const failedCount = resolved.filter(b => b.state === 'FAILED').length
    const highWeightFailed = resolved.filter(b =>
      ['isolation','verification','gas_test'].includes(b.id) && b.state === 'FAILED'
    ).length
    if (highWeightFailed >= 2 || failedCount >= 3) return null  // deterministically HIGH

    // Find next unanswered critical barrier
    return context.criticalBarriers.find(b => !ans[b.id]) || null
  }

  /* ── Answer handler ───────────────────────────────────────────────────── */
  const handleAnswer = (barrierId, answer) => {
    const newAnswers = { ...answers, [barrierId]: answer }
    setAnswers(newAnswers)
    const next = getNextQuestion(newAnswers)
    if (!next) setStep('complete')
  }

  /* ── Final state ──────────────────────────────────────────────────────── */
  const finalBarriers = getResolvedBarriers()
  const finalSIF = computeSIF(finalBarriers)
  const initialSIF = context?.sifPotential
  const sifChanged = initialSIF && finalSIF !== initialSIF

  const currentQuestion = step === 'interview' ? getNextQuestion() : null
  const answeredCount = Object.keys(answers).length
  const totalToAsk = context?.criticalBarriers.length || 0

  /* ── Submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    const evidenceSpans = finalBarriers
      .filter(b => b.state === 'FAILED')
      .map(b => `${b.name}: FAILED (source: ${b.source})`)
    const interviewLog = Object.entries(answers)
      .map(([id, ans]) => `${id}: ${ans}`)
      .join('; ')
    try {
      await api.ingestReport({
        report_text: inputText + (interviewLog ? `\n\nAdaptive Interview:\n${interviewLog}` : ''),
        site: context?.equipment || 'Field Submission',
        activity: context?.activity || 'Unspecified',
      })
    } catch { /* non-blocking */ }
    setStep('submitted')
  }

  /* ── Reset ────────────────────────────────────────────────────────────── */
  const handleReset = () => {
    setStep('input')
    setInputText('')
    setContext(null)
    setAnswers({})
  }

  const sifColors = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' }

  return (
    <div className="fc-page fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="fc-header">
        <div className="fc-title-row">
          <Mic size={22} color="var(--amber)" />
          <div>
            <h1 className="fc-title">Adaptive Safety Interview</h1>
            <p className="fc-sub">
              Decision-Critical Evidence Acquisition — speak or type your observation.
              PREVORA extracts barrier states and asks <em>only the missing safety questions</em> that
              could change the SIF assessment.
            </p>
          </div>
        </div>
        <div className="fc-header-note">
          <Info size={11} /> UNSTATED barrier ≠ failed barrier. If a report doesn't mention a control,
          PREVORA marks it UNSTATED and asks you. It never assumes failure.
        </div>
      </div>

      {/* ── Step 1: Input ───────────────────────────────────────────────── */}
      {step === 'input' && (
        <div className="fc-input-card card">
          <div className="fc-input-label">🎙 Describe what happened</div>
          <p className="fc-input-hint">
            Speak freely — describe the activity, equipment, and any controls you noticed or
            that were missing. PREVORA will extract the safety structure.
          </p>
          <textarea
            className="fc-textarea"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={'e.g. "During night shift at Well-W-31, we were doing maintenance on the compressor. Some pressure was still in the system. The gas test wasn\'t done before we opened the valve. No standby person was present..."'}
            rows={5}
          />
          <div className="fc-input-actions">
            <button
              className={`fc-mic-btn ${isListening ? 'fc-mic-active' : ''}`}
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {isListening ? 'Stop Recording' : 'Hold to Speak'}
            </button>
            <button className="btn btn-primary" onClick={handleAnalyse} disabled={!inputText.trim()}>
              <Send size={16} /> Analyse Observation
            </button>
          </div>
          {isListening && (
            <div className="fc-listening-indicator">
              <span className="listening-dot" /> Listening — speak your safety observation
            </div>
          )}
        </div>
      )}

      {/* ── Analysing ───────────────────────────────────────────────────── */}
      {step === 'analysing' && (
        <div className="card fc-analysing">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p>PREVORA is extracting barrier evidence from your observation…</p>
        </div>
      )}

      {/* ── Structured extraction (shown after analysis) ─────────────────── */}
      {context && step !== 'input' && step !== 'analysing' && (
        <div className="fc-extracted card">
          <div className="fc-ext-label">PREVORA UNDERSTOOD</div>
          <div className="fc-structured-record">
            {[
              ['Activity',   context.activity],
              ['Equipment',  context.equipment],
              ['Hazard',     context.hazard],
              ['Energy',     context.energy],
            ].map(([k, v]) => v ? (
              <div key={k} className="fc-sr-row">
                <span className="fc-sr-key">{k}</span>
                <span className="fc-sr-val">{v}</span>
              </div>
            ) : null)}
          </div>

          {/* Before SIF (initial from text only) */}
          <div className="fc-before-after">
            <div className="fc-ba-col">
              <div className="fc-ba-label">INITIAL ASSESSMENT</div>
              <div className="fc-ba-sub">From report text alone</div>
              <SIFBadge tier={initialSIF} />
            </div>
            {step === 'complete' || step === 'submitted' ? (
              <>
                <div className="fc-ba-arrow"><ArrowRight size={20} color="var(--amber)" /></div>
                <div className="fc-ba-col">
                  <div className="fc-ba-label">UPDATED ASSESSMENT</div>
                  <div className="fc-ba-sub">After {answeredCount} interview question{answeredCount !== 1 ? 's' : ''}</div>
                  <SIFBadge tier={finalSIF} label={sifChanged ? (() => { const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 }; return (rank[finalSIF] || 0) > (rank[initialSIF] || 0) ? '↑ Escalated' : '↓ Reduced' })() : '→ Unchanged'} />
                </div>
              </>
            ) : (
              <>
                <div className="fc-ba-arrow">
                  <div className="fc-ba-pending">Interview in progress…</div>
                </div>
                <div className="fc-ba-col fc-ba-col-pending">
                  <div className="fc-ba-label">UPDATED ASSESSMENT</div>
                  <div className="fc-ba-sub">Will update as you answer</div>
                  <SIFBadge tier={computeSIF(getResolvedBarriers())} />
                </div>
              </>
            )}
          </div>

          {/* Barrier states from text */}
          <div className="fc-barrier-matrix">
            <div className="fc-bm-label">BARRIER STATES FROM REPORT TEXT</div>
            <div className="fc-bm-note">
              Barriers marked <span style={{ color: '#9ca3af', fontWeight: 700 }}>? UNSTATED</span> are
              the ones PREVORA will ask about. UNSTATED ≠ FAILED.
            </div>
            {context.barriers.map(b => (
              <div key={b.id} className="fc-barrier-row">
                <span className="fc-barrier-name">{b.name}</span>
                <StateChip state={b.state} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Interview ────────────────────────────────────────────── */}
      {step === 'interview' && currentQuestion && (
        <div className="fc-interview card">
          <div className="fc-interview-header">
            <div className="fc-q-progress">
              <span>Question {answeredCount + 1}</span>
              {totalToAsk > answeredCount + 1 && (
                <span className="fc-q-remain"> · up to {totalToAsk - answeredCount} remaining (may stop earlier)</span>
              )}
              <div className="fc-progress-track">
                <div className="fc-progress-fill" style={{ width: `${(answeredCount / Math.max(totalToAsk, 1)) * 100}%` }} />
              </div>
            </div>
            <div className="fc-missing-label">
              PREVORA is asking only about missing barrier information that could change the SIF assessment
            </div>
          </div>

          <div className="fc-question">
            <div className="fc-q-barrier">{currentQuestion.name}</div>
            <div className="fc-q-iogp">IOGP: {currentQuestion.iogp}</div>
            <div className="fc-q-text">{currentQuestion.question}</div>
            <div className="fc-q-why">
              <Info size={11} /> <span>{currentQuestion.why}</span>
            </div>
          </div>

          <div className="fc-answer-grid">
            <AnswerBtn label="Yes — confirmed" icon="✓" variant="yes"
              onClick={() => handleAnswer(currentQuestion.id, 'YES')} />
            <AnswerBtn label="No — not done" icon="✕" variant="no"
              onClick={() => handleAnswer(currentQuestion.id, 'NO')} />
            <AnswerBtn label="I don't know" icon="?" variant="idk"
              onClick={() => handleAnswer(currentQuestion.id, 'IDK')} />
            <AnswerBtn label="Not applicable" icon="—" variant="na"
              onClick={() => handleAnswer(currentQuestion.id, 'NA')} />
          </div>

          <div className="fc-idk-note">
            "I don't know" stores this barrier as <strong>UNSTATED</strong> — not as failed.
            PREVORA never infers safety.
          </div>
        </div>
      )}

      {/* ── Step 3: Complete ─────────────────────────────────────────────── */}
      {(step === 'complete' || step === 'submitted') && (
        <div className="fc-complete card">
          <div className="fc-complete-header">
            <CheckCircle2 size={24} color="#22c55e" />
            <div>
              <div className="fc-complete-title">
                {step === 'submitted' ? 'Report Submitted to Priority Queue' : 'Evidence Collection Complete'}
              </div>
              <div className="fc-complete-sub">
                {answeredCount > 0
                  ? `PREVORA asked ${answeredCount} question${answeredCount !== 1 ? 's' : ''} and updated the safety record`
                  : 'Report text contained sufficient evidence — no additional questions needed'}
              </div>
            </div>
          </div>

          {/* SIF delta explanation — precise, named reason */}
          {sifChanged && (() => {
            const failedViaInterview = finalBarriers
              .filter(b => b.state === 'FAILED' && b.source === 'interview')
              .map(b => b.name)
            const intactViaInterview = finalBarriers
              .filter(b => b.state === 'INTACT' && b.source === 'interview')
              .map(b => b.name)
            const direction = finalSIF === 'HIGH' || finalSIF === 'MEDIUM' && initialSIF === 'LOW'
              ? 'up' : 'dn'
            let reason = ''
            if (failedViaInterview.length > 0) {
              reason = `by confirming ${failedViaInterview.join(' and ')} as FAILED`
            } else if (intactViaInterview.length > 0) {
              reason = `by confirming ${intactViaInterview.join(' and ')} as INTACT`
            }
            return (
              <div className={`fc-sif-delta fc-delta-${direction}`}>
                <AlertTriangle size={14} />
                <span>
                  Additional evidence changed the assessment from{' '}
                  <strong>{initialSIF}</strong> → <strong>{finalSIF}</strong>
                  {reason ? <> {reason}.</> : '.'}
                </span>
              </div>
            )
          })()}

          {/* Final barrier vector */}
          <div className="fc-final-barriers">
            <div className="fc-ext-label" style={{ marginBottom: 10 }}>FINAL BARRIER VECTOR</div>
            {finalBarriers.map(b => (
              <div key={b.id} className="fc-barrier-row">
                <span className="fc-barrier-name">{b.name}</span>
                <StateChip state={b.state} />
                {b.source === 'interview' && (
                  <span className="fc-barrier-source">via interview</span>
                )}
              </div>
            ))}
          </div>

          {/* Collapsible Q&A Interview Trace */}
          {answeredCount > 0 && (
            <InterviewTrace answers={answers} questions={context?.criticalBarriers || []} finalBarriers={finalBarriers} />
          )}

          {/* Final SIF */}
          <div className="fc-sif-result" style={{ borderColor: sifColors[finalSIF] }}>
            <div className="fc-sif-label">SIF POTENTIAL</div>
            <div className="fc-sif-val" style={{ color: sifColors[finalSIF] }}>{finalSIF}</div>
            <div className="fc-sif-meta">
              {finalBarriers.filter(b => b.state === 'FAILED').length} barrier{finalBarriers.filter(b => b.state === 'FAILED').length !== 1 ? 's' : ''} failed
              · {finalBarriers.filter(b => b.state === 'UNSTATED').length} unstated
              · Evidence grounded
            </div>
          </div>

          {finalSIF !== 'LOW' && step !== 'submitted' && (
            <div className="fc-sif-warning">
              <AlertTriangle size={14} color="#f59e0b" />
              <span>
                This observation has <strong>{finalSIF} SIF potential</strong>.
                Submit to add it to the Priority Queue for HSE review and action.
              </span>
            </div>
          )}

          {step === 'submitted' ? (
            <div className="fc-submitted-note">
              ✓ Submitted. HSE team will review this record in the Priority Queue.
              The assessment can be confirmed, overridden, or escalated by an authorised HSE officer.
            </div>
          ) : (
            <div className="fc-complete-actions">
              <button className="btn btn-primary" onClick={handleSubmit}>
                Submit to Priority Queue →
              </button>
              <button className="btn btn-ghost" onClick={handleReset}>
                <RotateCcw size={14} /> New Observation
              </button>
            </div>
          )}

          {step === 'submitted' && (
            <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={handleReset}>
              <RotateCcw size={14} /> Start New Observation
            </button>
          )}
        </div>
      )}
    </div>
  )
}
