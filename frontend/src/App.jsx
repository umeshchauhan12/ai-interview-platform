import { useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = 'http://127.0.0.1:8000'

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

  const scoreVal = scoreResult ? Math.round(scoreResult.final_score) : 0
  const matchVal = resumeResult ? Math.round(resumeResult.skill_gap_analysis?.match_percentage || 0) : 0

  return (
    <div className="dossier">
      <header className="dossier-header">
        <div className="eyebrow">CANDIDATE ASSESSMENT SYSTEM</div>
        <h1>Interview Dossier</h1>
        <p className="subhead">Upload a resume, measure the fit, then rehearse the room.</p>
      </header>

      <main className="folder">

        {/* ---------- FILE 01 — RESUME ---------- */}
        <section className="tab-card">
          <div className="tab-label">
            <span className="tab-index">FILE 01</span>
            <span className="tab-title">Resume &amp; Role Fit</span>
          </div>

          <div className="tab-body">
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
                  Choose file
                  <input type="file" accept=".pdf" onChange={handleFileChange} hidden />
                </label>
                <span className="file-name">{resumeFileName || 'No file selected'}</span>
              </div>
            </div>

            <button className="action-btn" onClick={handleResumeAnalyze} disabled={resumeLoading}>
              {resumeLoading ? 'Reading resume…' : 'Run fit analysis'}
            </button>

            {resumeResult && (
              <div className="readout">
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
                    <div className="gauge-value">{matchVal}%</div>
                    <div className="gauge-caption">role match</div>
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

        {/* ---------- FILE 02 — INTERVIEW ---------- */}
        <section className="tab-card">
          <div className="tab-label">
            <span className="tab-index">FILE 02</span>
            <span className="tab-title">Rehearsal Room</span>
          </div>

          <div className="tab-body">
            <div className="field">
              <label>Track</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="python developer">Python Developer</option>
                <option value="data scientist">Data Scientist</option>
                <option value="web developer">Web Developer</option>
              </select>
            </div>

            <button className="action-btn" onClick={handleFetchQuestions} disabled={interviewLoading}>
              {interviewLoading ? 'Preparing…' : 'Begin rehearsal'}
            </button>

            {questions.length > 0 && (
              <div className="interview">
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
                  <button className="action-btn" onClick={handleSubmitAnswer} disabled={interviewLoading}>
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

                {scoreResult && (
                  <div className="score-readout">
                    <div className="score-number">{scoreVal}<span>/100</span></div>
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
      </main>
    </div>
  )
}

export default App