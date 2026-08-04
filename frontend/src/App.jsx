import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import axios from 'axios'
import {
  FileText, Users, Mic, ScanFace, Upload, TrendingUp, Play,
  ShieldCheck, Lock, Zap, Sparkles
} from 'lucide-react'
import './App.css'

const API_BASE = 'http://127.0.0.1:8000'

// Purely presentational helper - animates a number counting up from 0 to target.
// Does not touch any app state/logic.
function AnimatedNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = null
    const from = 0
    const to = value

    function step(timestamp) {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }

    const raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{display}</>
}

// Purely presentational confetti burst shown for high scores/matches.
function Confetti() {
  const colors = ['#7c5cf5', '#3d7ef7', '#1f9d6e', '#e08a1e', '#d1495b']
  const pieces = Array.from({ length: 18 })
  return (
    <div className="confetti-wrap">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 97) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 6) * 0.08}s`
          }}
        />
      ))}
    </div>
  )
}

function App() {
  const [jdText, setJdText] = useState('')
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeResult, setResumeResult] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)

  const [role, setRole] = useState('python developer')
  const [questions, setQuestions] = useState([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [scoreResult, setScoreResult] = useState(null)
  const [interviewLoading, setInterviewLoading] = useState(false)

  const [audioFile, setAudioFile] = useState(null)
  const [audioFileName, setAudioFileName] = useState('')
  const [audioDuration, setAudioDuration] = useState('')
  const [speechResult, setSpeechResult] = useState(null)
  const [speechLoading, setSpeechLoading] = useState(false)

  const [imageFile, setImageFile] = useState(null)
  const [imageFileName, setImageFileName] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [emotionResult, setEmotionResult] = useState(null)
  const [emotionLoading, setEmotionLoading] = useState(false)

  // Measures the main content's top position so the left sidebar can align
  // its top edge exactly with the top of the File 01 card, on any screen.
  const mainRef = useRef(null)
  const [sidebarTop, setSidebarTop] = useState(280)

  useLayoutEffect(() => {
    function measure() {
      if (mainRef.current) {
        const rect = mainRef.current.getBoundingClientRect()
        setSidebarTop(rect.top + window.scrollY)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    const timeout = setTimeout(measure, 300) // re-measure after fonts load
    return () => {
      window.removeEventListener('resize', measure)
      clearTimeout(timeout)
    }
  }, [])

  // Tracks scroll position so the fixed sidebar visually scrolls away
  // with the page instead of staying pinned on top of lower cards.
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    function onScroll() { setScrollY(window.scrollY) }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Tracks window width via JS (more reliable than CSS media queries here)
  // so the sidebar hides itself whenever the browser window is narrow,
  // preventing it from overlapping the main cards.
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1600)
  useEffect(() => {
    function onResize() { setWindowWidth(window.innerWidth) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const showSidebar = windowWidth >= 1300

  const handleResumeAnalyze = async () => {
    if (!resumeFile || !jdText) {
      alert('Add a job description and choose a resume file first.')
      return
    }
    setResumeLoading(true)
    setResumeResult(null)
    const formData = new FormData()
    formData.append('jd_text', jdText)
    formData.append('resume_file', resumeFile)
    try {
      const response = await axios.post(`${API_BASE}/analyze-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResumeResult(response.data)
    } catch (error) {
      alert('Could not analyze resume: ' + error.message)
    } finally {
      setResumeLoading(false)
    }
  }

  const handleFetchQuestions = async () => {
    setInterviewLoading(true)
    setScoreResult(null)
    setUserAnswer('')
    try {
      const response = await axios.get(`${API_BASE}/questions`, {
        params: { role, category: 'technical', count: 5 }
      })
      if (response.data.questions.error) {
        alert(response.data.questions.error)
      } else {
        setQuestions(response.data.questions)
        setCurrentQIndex(0)
      }
    } catch (error) {
      alert('Could not load questions: ' + error.message)
    } finally {
      setInterviewLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert('Write an answer before submitting.')
      return
    }
    const currentQuestion = questions[currentQIndex]
    setInterviewLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/score-answer`, {
        user_answer: userAnswer,
        ideal_answer: currentQuestion.question,
        keywords: currentQuestion.keywords
      })
      setScoreResult(response.data)
    } catch (error) {
      alert('Could not score answer: ' + error.message)
    } finally {
      setInterviewLoading(false)
    }
  }

  const handleNextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1)
      setUserAnswer('')
      setScoreResult(null)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setResumeFile(file)
    setResumeFileName(file ? file.name : '')
  }

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0]
    setAudioFile(file)
    setAudioFileName(file ? file.name : '')
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files[0]
    setImageFile(file)
    setImageFileName(file ? file.name : '')
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleAnalyzeEmotion = async () => {
    if (!imageFile) {
      alert('Choose a photo first.')
      return
    }
    setEmotionLoading(true)
    setEmotionResult(null)
    const formData = new FormData()
    formData.append('image_file', imageFile)
    try {
      const response = await axios.post(`${API_BASE}/analyze-emotion`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setEmotionResult(response.data)
    } catch (error) {
      alert('Could not analyze expression: ' + error.message)
    } finally {
      setEmotionLoading(false)
    }
  }

  const handleAnalyzeSpeech = async () => {
    if (!audioFile || !audioDuration) {
      alert('Choose an audio file and enter its duration first.')
      return
    }
    setSpeechLoading(true)
    setSpeechResult(null)
    const formData = new FormData()
    formData.append('duration_seconds', audioDuration)
    formData.append('audio_file', audioFile)
    try {
      const response = await axios.post(`${API_BASE}/analyze-speech`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSpeechResult(response.data)
    } catch (error) {
      alert('Could not analyze speech: ' + error.message)
    } finally {
      setSpeechLoading(false)
    }
  }

  const scoreVal = scoreResult ? Math.round(scoreResult.final_score) : 0
  const matchVal = resumeResult ? Math.round(resumeResult.skill_gap_analysis?.match_percentage || 0) : 0

  return (
    <div className="dossier">

      {/* Decorative animated background blobs */}
      <div className="blob blob-purple" />
      <div className="blob blob-blue" />
      <div className="blob blob-orange" />
      <div className="blob blob-green" />
      <div className="blob blob-edge-left" />
      <div className="blob blob-edge-right" />

      {/* Decorative side rings (fill empty edges on wide screens) */}
      <div className="side-ring side-ring-left" />
      <div className="side-ring side-ring-right" />
      <div className="side-dots side-dots-right" />

      <header className="dossier-header fade-in">
        <div className="header-top">
          <div>
            <div className="eyebrow">CANDIDATE ASSESSMENT SYSTEM</div>
            <h1>Interview Dossier</h1>
            <p className="subhead">Upload a resume, measure your fit, practice interviews and improve confidence.</p>
          </div>

          <div className="welcome-card glass">
            <div className="welcome-card-glow" />
            <div className="welcome-icon"><Sparkles size={20} /></div>
            <div>
              <p className="welcome-title">Welcome back!</p>
              <p className="welcome-sub">Ready to ace your next interview?</p>
            </div>
          </div>
        </div>
      </header>

      {showSidebar && (
      <aside className="feature-strip glass slide-up" style={{ animationDelay: '0.32s', top: Math.max(sidebarTop - scrollY, 14) }}>
        <div className="feature-item">
          <span className="feature-icon icon-teal"><ShieldCheck size={18} /></span>
          <div>
            <p className="feature-title">AI-Powered Insights</p>
            <p className="feature-sub">Smart analysis &amp; feedback</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon icon-purple"><Lock size={18} /></span>
          <div>
            <p className="feature-title">Secure &amp; Private</p>
            <p className="feature-sub">Your data stays on your machine</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon icon-amber"><TrendingUp size={18} /></span>
          <div>
            <p className="feature-title">Track Progress</p>
            <p className="feature-sub">Monitor your improvement</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon icon-blue"><Zap size={18} /></span>
          <div>
            <p className="feature-title">Boost Confidence</p>
            <p className="feature-sub">Practice makes perfect</p>
          </div>
        </div>
      </aside>
      )}

      <main className="folder-grid" ref={mainRef}>

        {/* ---------- CARD 01 — RESUME ---------- */}
        <section className="glass-card slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="card-top-border accent-teal-border" />
          <div className="card-head">
            <span className="card-icon icon-teal"><FileText size={20} /></span>
            <div>
              <span className="card-eyebrow">FILE 01</span>
              <h2 className="card-title">Resume &amp; Role Fit</h2>
            </div>
          </div>

          <div className="card-body">
            <div className="field">
              <label>Job description</label>
              <textarea
                rows="4"
                placeholder="Paste the role's requirements here..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Resume (PDF)</label>
              <div className="file-picker">
                <label className="file-btn">
                  <Upload size={14} /> Choose file
                  <input type="file" accept=".pdf" onChange={handleFileChange} hidden />
                </label>
                <span className="file-name">{resumeFileName || 'No file selected'}</span>
              </div>
            </div>

            <button className="action-btn accent-teal" onClick={handleResumeAnalyze} disabled={resumeLoading}>
              {resumeLoading && <span className="spinner" />}
              {!resumeLoading && <TrendingUp size={14} />}
              {resumeLoading ? 'Reading resume…' : 'Run fit analysis'}
            </button>

            {resumeLoading && (
              <div className="loading-panel">
                <p className="loading-text">PARSING RESUME</p>
                <div className="loading-row short" />
                <div className="loading-row full" />
                <div className="loading-row medium" />
              </div>
            )}

            {resumeResult && (
              <div className="readout fade-in">
                <div className="readout-top">
                  <div className="gauge">
                    <svg viewBox="0 0 120 66" className="gauge-svg">
                      <path d="M10 60 A50 50 0 0 1 110 60" className="gauge-track" />
                      <path
                        d="M10 60 A50 50 0 0 1 110 60"
                        className="gauge-fill"
                        style={{ strokeDasharray: `${(matchVal / 100) * 157} 157` }}
                      />
                    </svg>
                    <div className="gauge-value"><AnimatedNumber value={matchVal} />%</div>
                    <div className="gauge-caption">role match</div>
                    {matchVal >= 80 && <Confetti />}
                  </div>

                  <div className="contact-strip">
                    <div><span>email</span>{resumeResult.resume_info?.email}</div>
                    <div><span>phone</span>{resumeResult.resume_info?.phone}</div>
                  </div>
                </div>

                <div className="chip-row">
                  <div className="chip-group">
                    <div className="chip-heading">matched</div>
                    <div className="chips">
                      {resumeResult.skill_gap_analysis?.matched_skills?.map((s) => (
                        <span key={s} className="chip chip-match">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="chip-group">
                    <div className="chip-heading">gap</div>
                    <div className="chips">
                      {resumeResult.skill_gap_analysis?.missing_skills?.map((s) => (
                        <span key={s} className="chip chip-gap">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------- CARD 02 — INTERVIEW ---------- */}
        <section className="glass-card slide-up" style={{ animationDelay: '0.12s' }}>
          <div className="card-top-border accent-purple-border" />
          <div className="card-head">
            <span className="card-icon icon-purple"><Users size={20} /></span>
            <div>
              <span className="card-eyebrow">FILE 02</span>
              <h2 className="card-title">Rehearsal Room</h2>
            </div>
          </div>

          <div className="card-body">
            <div className="field">
              <label>Track</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="python developer">Python Developer</option>
                <option value="data scientist">Data Scientist</option>
                <option value="web developer">Web Developer</option>
              </select>
            </div>

            <button className="action-btn accent-purple" onClick={handleFetchQuestions} disabled={interviewLoading}>
              {interviewLoading && <span className="spinner" />}
              {!interviewLoading && <Play size={14} />}
              {interviewLoading ? 'Preparing…' : 'Begin rehearsal'}
            </button>

            {questions.length > 0 && (
              <div className="interview fade-in">
                <div className="q-meta">
                  <span className="q-count">{String(currentQIndex + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}</span>
                  <span className={`diff-tag diff-${questions[currentQIndex].difficulty}`}>
                    {questions[currentQIndex].difficulty}
                  </span>
                </div>

                <p className="question-text">{questions[currentQIndex].question}</p>

                <textarea
                  rows="5"
                  className="answer-box"
                  placeholder="Speak it in your head first, then type your answer…"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />

                <div className="button-row">
                  <button className="action-btn accent-purple" onClick={handleSubmitAnswer} disabled={interviewLoading}>
                    {interviewLoading && <span className="spinner" />}
                    Submit answer
                  </button>
                  <button
                    className="ghost-btn"
                    onClick={handleNextQuestion}
                    disabled={currentQIndex >= questions.length - 1}
                  >
                    Next question →
                  </button>
                </div>

                {interviewLoading && questions.length > 0 && (
                  <div className="loading-panel">
                    <p className="loading-text">SCORING ANSWER</p>
                    <div className="loading-row short" />
                    <div className="loading-row full" />
                  </div>
                )}

                {scoreResult && (
                  <div className="score-readout fade-in">
                    <div className="score-number-wrap">
                      <div className="score-number"><AnimatedNumber value={scoreVal} /><span>/100</span></div>
                      {scoreVal >= 80 && <Confetti />}
                    </div>
                    <div className="score-detail">
                      <p className="feedback-line">{scoreResult.feedback}</p>
                      {scoreResult.missing_keywords?.length > 0 && (
                        <div className="chips">
                          {scoreResult.missing_keywords.map((k) => (
                            <span key={k} className="chip chip-gap">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- CARD 03 — VOICE ---------- */}
        <section className="glass-card slide-up" style={{ animationDelay: '0.19s' }}>
          <div className="card-top-border accent-amber-border" />
          <div className="card-head">
            <span className="card-icon icon-amber"><Mic size={20} /></span>
            <div>
              <span className="card-eyebrow">FILE 03</span>
              <h2 className="card-title">Voice Assessment</h2>
            </div>
          </div>

          <div className="card-body">
            <div className="field">
              <label>Recorded answer (audio file)</label>
              <div className="file-picker">
                <label className="file-btn">
                  <Upload size={14} /> Choose file
                  <input type="file" accept="audio/*" onChange={handleAudioFileChange} hidden />
                </label>
                <span className="file-name">{audioFileName || 'No file selected'}</span>
              </div>
            </div>

            <div className="field">
              <label>Duration (seconds)</label>
              <input
                type="number"
                className="duration-input"
                placeholder="e.g. 25"
                value={audioDuration}
                onChange={(e) => setAudioDuration(e.target.value)}
              />
            </div>

            <button className="action-btn accent-amber" onClick={handleAnalyzeSpeech} disabled={speechLoading}>
              {speechLoading && <span className="spinner" />}
              {speechLoading ? 'Listening…' : 'Analyze delivery'}
            </button>

            {speechLoading && (
              <div className="loading-panel">
                <p className="loading-text">TRANSCRIBING AUDIO</p>
                <div className="loading-row short" />
                <div className="loading-row full" />
              </div>
            )}

            {speechResult && !speechResult.error && (
              <div className="readout fade-in">
                <div className="voice-stats">
                  <div className="voice-stat">
                    <div className="voice-stat-value">{speechResult.speaking_pace?.wpm}</div>
                    <div className="voice-stat-label">words / min</div>
                  </div>
                  <div className="voice-stat">
                    <div className="voice-stat-value">{speechResult.filler_analysis?.total_filler_count}</div>
                    <div className="voice-stat-label">filler words</div>
                  </div>
                  <div className="voice-stat">
                    <div className="voice-stat-value">{speechResult.filler_analysis?.filler_ratio_percent}%</div>
                    <div className="voice-stat-label">filler ratio</div>
                  </div>
                </div>

                <p className="feedback-line">{speechResult.speaking_pace?.pace_category}</p>

                <div className="transcript-box">
                  <div className="chip-heading">transcript</div>
                  <p className="transcript-text">{speechResult.transcribed_text}</p>
                </div>
              </div>
            )}

            {speechResult && speechResult.error && (
              <p className="feedback-line">Error: {speechResult.error}</p>
            )}
          </div>
        </section>

        {/* ---------- CARD 04 — COMPOSURE ---------- */}
        <section className="glass-card slide-up" style={{ animationDelay: '0.26s' }}>
          <div className="card-top-border accent-blue-border" />
          <div className="card-head">
            <span className="card-icon icon-blue"><ScanFace size={20} /></span>
            <div>
              <span className="card-eyebrow">FILE 04</span>
              <h2 className="card-title">Composure Check</h2>
            </div>
          </div>

          <div className="card-body">
            <div className="field">
              <label>Photo (during rehearsal)</label>
              <div className="file-picker">
                <label className="file-btn">
                  <Upload size={14} /> Choose file
                  <input type="file" accept="image/*" onChange={handleImageFileChange} hidden />
                </label>
                <span className="file-name">{imageFileName || 'No file selected'}</span>
              </div>
            </div>

            {imagePreview && (
              <img src={imagePreview} alt="preview" className="image-preview" />
            )}

            <button className="action-btn accent-blue" onClick={handleAnalyzeEmotion} disabled={emotionLoading}>
              {emotionLoading && <span className="spinner" />}
              {emotionLoading ? 'Reading expression…' : 'Check composure'}
            </button>

            {emotionLoading && (
              <div className="loading-panel">
                <p className="loading-text">SCANNING EXPRESSION</p>
                <div className="loading-row short" />
                <div className="loading-row medium" />
                <div className="loading-row full" />
              </div>
            )}

            {emotionResult && !emotionResult.error && (
              <div className="readout fade-in">
                <div className="emotion-top">
                  <span className={`emotion-tag emotion-${emotionResult.dominant_emotion}`}>
                    {emotionResult.dominant_emotion}
                  </span>
                </div>

                <p className="feedback-line">{emotionResult.composure_feedback}</p>

                <div className="emotion-bars">
                  {Object.entries(emotionResult.emotion_breakdown || {}).map(([emotion, value]) => (
                    <div key={emotion} className="emotion-bar-row">
                      <span className="emotion-bar-label">{emotion}</span>
                      <div className="emotion-bar-track">
                        <div className="emotion-bar-fill" style={{ width: `${value}%` }} />
                      </div>
                      <span className="emotion-bar-value">{Number(value).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emotionResult && emotionResult.error && (
              <p className="feedback-line">Error: {emotionResult.error}</p>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

export default App