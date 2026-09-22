import { useState, useRef, useEffect } from 'react'
import { api } from '../api'
import { Mic, MicOff, Zap, Send, RotateCcw } from 'lucide-react'
import './VoiceReport.css'

const TIER_ICON = { HIGH: '🔴', MEDIUM: '🟠', LOW: '🟢', UNCERTAIN: '🟡' }

export default function VoiceReport() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [result, setResult] = useState(null)
  const [classifying, setClassifying] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSupported(false)
    }
  }, [])

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'  // Indian English accent

    recognition.onresult = (e) => {
      let final = ''
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setTranscript(final)
      setInterimText(interim)
    }

    recognition.onend = () => {
      setListening(false)
      setInterimText('')
    }

    recognition.start()
    setListening(true)
    setResult(null)
    setSubmitted(false)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setListening(false)
  }

  const classify = async (submit = false) => {
    if (!transcript.trim()) return
    setClassifying(true)
    try {
      if (submit) {
        const r = await api.ingestReport({ report_text: transcript, site: 'Voice Submission', activity: 'Field Report' })
        setResult(r)
        setSubmitted(true)
      } else {
        const r = await api.classifyReport(transcript)
        setResult(r)
      }
    } finally {
      setClassifying(false)
    }
  }

  const reset = () => {
    setTranscript('')
    setInterimText('')
    setResult(null)
    setSubmitted(false)
    setListening(false)
    if (recognitionRef.current) recognitionRef.current.stop()
  }

  const fullText = transcript + interimText

  return (
    <div className="voice-page fade-in">
      <div className="voice-header">
        <h1 className="voice-title">
          <Mic size={22} color="var(--amber)" />
          Voice Report Submission
        </h1>
        <p className="voice-sub">
          Field workers speak their safety observation — AI classifies it instantly.
          <br />No typing. No forms. Works on any device.
        </p>
      </div>

      {!supported && (
        <div className="voice-unsupported card">
          ⚠️ Voice input requires Chrome or Edge browser. Please switch browsers to use this feature.
        </div>
      )}

      {supported && (
        <>
          {/* Mic button */}
          <div className="voice-center">
            <div className={`mic-ring ${listening ? 'mic-ring-active' : ''}`}>
              <div className={`mic-ring-2 ${listening ? 'mic-ring-2-active' : ''}`}>
                <button
                  className={`mic-btn ${listening ? 'mic-btn-active' : ''}`}
                  onClick={listening ? stopListening : startListening}
                >
                  {listening
                    ? <MicOff size={36} color="#fff" />
                    : <Mic size={36} color={transcript ? '#f59e0b' : '#fff'} />
                  }
                </button>
              </div>
            </div>
            <p className="mic-status">
              {listening
                ? '🔴 Recording… speak clearly'
                : transcript
                ? '✅ Tap mic to re-record'
                : '⬆ Tap to start speaking'
              }
            </p>
          </div>

          {/* Transcript */}
          {(fullText || listening) && (
            <div className="card voice-transcript">
              <div className="transcript-label">TRANSCRIBED REPORT</div>
              <p className="transcript-text">
                {transcript}
                {interimText && <span className="interim-text">{interimText}</span>}
                {listening && !fullText && <span className="interim-text">Listening…</span>}
              </p>
            </div>
          )}

          {/* Actions */}
          {transcript && !listening && (
            <div className="voice-actions">
              <button className="btn btn-ghost" onClick={reset}>
                <RotateCcw size={15} /> Re-record
              </button>
              <button className="btn btn-secondary" onClick={() => classify(false)} disabled={classifying}>
                <Zap size={15} /> {classifying ? 'Classifying…' : 'Analyse Only'}
              </button>
              <button className="btn btn-primary" onClick={() => classify(true)} disabled={classifying || submitted}>
                <Send size={15} /> {submitted ? 'Submitted ✓' : 'Analyse & Submit'}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`card voice-result tier-${result.sif_potential?.toLowerCase()}`}>
              <div className="vr-header">
                <span className={`badge badge-${result.sif_potential?.toLowerCase()}`}>
                  {TIER_ICON[result.sif_potential]} {result.sif_potential} SIF POTENTIAL
                </span>
                <span className="vr-conf">{((result.confidence || 0) * 100).toFixed(1)}% confidence</span>
                {submitted && <span className="vr-saved">✅ Saved to Queue</span>}
              </div>
              {result.rule_tags && result.rule_tags.length > 0 && (
                <div className="vr-rules">
                  {result.rule_tags.map(r => (
                    <span key={r} className="tag-chip">{r}</span>
                  ))}
                </div>
              )}
              {result.counterfactual_delta > 0 && (
                <div className="vr-delta">
                  ⚡ Counterfactual Δ = {result.counterfactual_delta} barrier{result.counterfactual_delta > 1 ? 's' : ''} from fatality
                </div>
              )}
              {result.evidence_spans?.length > 0 && (
                <div className="vr-evidence">
                  <div className="vr-label">Key phrases detected:</div>
                  <div className="vr-spans">
                    {result.evidence_spans.slice(0, 4).map((s, i) => (
                      <mark key={i} className="evidence-mark">{s}</mark>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* How to use */}
          {!transcript && !listening && (
            <div className="card voice-tips">
              <h3 className="section-label">💡 Try saying this</h3>
              <div className="tip-list">
                {[
                  '"Worker entered the separator vessel without atmospheric testing. No standby man was assigned."',
                  '"Hot work was being performed near a gas line. The fire watch was absent. Gas alarm triggered."',
                  '"A minor cut on the hand occurred while operating the wellhead valve. Well was live at high pressure."',
                ].map((t, i) => (
                  <div key={i} className="tip-item" onClick={() => { setTranscript(t.replace(/"/g, '')); setResult(null) }}>
                    <span className="tip-num">0{i+1}</span>
                    <span className="tip-text">{t}</span>
                    <span className="tip-use">Use →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
