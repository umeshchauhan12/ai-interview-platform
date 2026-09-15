import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import axios from 'axios'
import {
  FileText, Users, Mic, ScanFace, Upload, TrendingUp, Play,
  ShieldCheck, Lock, Zap, Sparkles, Code, Volume2, Timer as TimerIcon,
  Camera, Square, Circle, Download
} from 'lucide-react'
import jsPDF from 'jspdf'
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
  const [answerScoreHistory, setAnswerScoreHistory] = useState([])

  // Per-question countdown timer (mock interview style)
  const QUESTION_TIME_LIMIT = 90 // seconds
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT)
  const [timerActive, setTimerActive] = useState(false)

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

  const [codingRound, setCodingRound] = useState(null)
  const [roundLoading, setRoundLoading] = useState(false)
  const [roundLanguage, setRoundLanguage] = useState('python')
  const [roundCode, setRoundCode] = useState({ easy: '', medium: '', hard: '' })
  const [roundResults, setRoundResults] = useState({ easy: null, medium: null, hard: null })
  const [roundSubmitting, setRoundSubmitting] = useState({ easy: false, medium: false, hard: false })
  const [finalRoundScore, setFinalRoundScore] = useState(null)
  const [finalRoundLoading, setFinalRoundLoading] = useState(false)

  const [readinessResult, setReadinessResult] = useState(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [roadmapResult, setRoadmapResult] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)

  // Progress history - stored in the browser (localStorage) so past
  // sessions' readiness scores can be tracked over time, no backend needed.
  const [progressHistory, setProgressHistory] = useState([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('interview_progress_history')
      if (saved) setProgressHistory(JSON.parse(saved))
    } catch (e) {
      // ignore corrupted storage
    }
  }, [])

  const saveProgressEntry = (finalScore, verdict) => {
    const entry = {
      date: new Date().toISOString(),
      score: finalScore,
      verdict
    }
    setProgressHistory((prev) => {
      const updated = [...prev, entry].slice(-10) // keep last 10 sessions
      try {
        localStorage.setItem('interview_progress_history', JSON.stringify(updated))
      } catch (e) {
        // storage full or unavailable - ignore
      }
      return updated
    })
  }

  const handleClearProgressHistory = () => {
    localStorage.removeItem('interview_progress_history')
    setProgressHistory([])
  }

  // Measures the main content's top position so the left sidebar can align
  // its top edge exactly with the top of the File 01 card, on any screen.
  // Countdown timer for the current interview question - ticks down
  // every second while active, and stops (without penalty) at zero.
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [timerActive, timeLeft])

  const handleSpeakQuestion = (text) => {
    if (!window.speechSynthesis) {
      alert('Text-to-speech is not supported in this browser.')
      return
    }
    window.speechSynthesis.cancel() // stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  const mainRef = useRef(null)
  const resumeSectionRef = useRef(null)
  const rehearsalSectionRef = useRef(null)
  const voiceSectionRef = useRef(null)
  const composureSectionRef = useRef(null)
  const sessionSummaryRef = useRef(null)
  const progressHistoryRef = useRef(null)

  // ---------- GUIDED MOCK INTERVIEW WIZARD ----------
  const WIZARD_STEPS = [
    { ref: 'resumeSectionRef', label: 'Resume & Role Fit' },
    { ref: 'rehearsalSectionRef', label: 'Rehearsal Room' },
    { ref: 'voiceSectionRef', label: 'Voice Assessment' },
    { ref: 'composureSectionRef', label: 'Composure Check' },
    { ref: 'sessionSummaryRef', label: 'Session Summary & Report' },
  ]
  const wizardRefs = { resumeSectionRef, rehearsalSectionRef, voiceSectionRef, composureSectionRef, sessionSummaryRef }
  const [wizardActive, setWizardActive] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)

  const handleStartWizard = () => {
    setWizardActive(true)
    setWizardStep(0)
    scrollToSection(wizardRefs[WIZARD_STEPS[0].ref])
  }

  const handleWizardNext = () => {
    const nextStep = wizardStep + 1
    if (nextStep >= WIZARD_STEPS.length) {
      handleGenerateReadinessReport()
      setWizardActive(false)
      return
    }
    setWizardStep(nextStep)
    scrollToSection(wizardRefs[WIZARD_STEPS[nextStep].ref])
  }

  const handleWizardExit = () => {
    setWizardActive(false)
  }

  const scrollToSection = (ref) => {
    if (!ref.current) return
    const targetY = ref.current.getBoundingClientRect().top + window.scrollY - 24
    window.scrollTo({ top: targetY, behavior: 'smooth' })

    // Visual confirmation: flash a highlight glow on the target card so
    // it's obvious the click actually did something.
    const el = ref.current
    el.classList.add('section-highlight')
    setTimeout(() => {
      el.classList.remove('section-highlight')
    }, 1600)
  }

  const handleTrackProgressClick = () => {
    if (progressHistoryRef.current) {
      scrollToSection(progressHistoryRef)
    } else {
      scrollToSection(sessionSummaryRef)
      alert('No progress history yet — click "Generate readiness report" below to start tracking your sessions.')
    }
  }

  const handleSecurePrivacyClick = () => {
    alert(
      'Privacy note: all analysis (resume parsing, speech, emotion, code execution) ' +
      'runs on your own machine via the local backend. Nothing is uploaded to an ' +
      'external server, and your progress history is stored only in this browser.'
    )
  }
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
    setAnswerScoreHistory([])
    try {
      const response = await axios.get(`${API_BASE}/questions`, {
        params: { role, category: 'technical', count: 5 }
      })
      if (response.data.questions.error) {
        alert(response.data.questions.error)
      } else {
        setQuestions(response.data.questions)
        setCurrentQIndex(0)
        setTimeLeft(QUESTION_TIME_LIMIT)
        setTimerActive(true)
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
    setTimerActive(false)
    try {
      const response = await axios.post(`${API_BASE}/score-answer`, {
        user_answer: userAnswer,
        ideal_answer: currentQuestion.question,
        keywords: currentQuestion.keywords
      })
      setScoreResult(response.data)
      setAnswerScoreHistory((prev) => [...prev, response.data.final_score])
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
      setTimeLeft(QUESTION_TIME_LIMIT)
      setTimerActive(true)
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

  // ---------- LIVE AUDIO RECORDING ----------
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingStartRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [recordingElapsed, setRecordingElapsed] = useState(0)

  const handleStartAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' })
        const durationSeconds = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000))
        setAudioFile(file)
        setAudioFileName(`Recorded answer (${durationSeconds}s)`)
        setAudioDuration(String(durationSeconds))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = recorder
      recordingStartRef.current = Date.now()
      recorder.start()
      setIsRecordingAudio(true)
      setRecordingElapsed(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingElapsed(Math.round((Date.now() - recordingStartRef.current) / 1000))
      }, 500)
    } catch (error) {
      alert('Could not access microphone: ' + error.message)
    }
  }

  const handleStopAudioRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecordingAudio(false)
    clearInterval(recordingTimerRef.current)
  }

  // ---------- LIVE WEBCAM CAPTURE ----------
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      cameraStreamRef.current = stream
      setCameraActive(true)
    } catch (error) {
      alert('Could not access camera: ' + error.message)
    }
  }

  // Attaches the camera stream to the <video> element only after it has
  // actually mounted (cameraActive becoming true triggers this render),
  // which is more reliable than trying to do it immediately on click.
  useEffect(() => {
    if (cameraActive && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [cameraActive])

  const handleStopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    setCameraActive(false)
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      const file = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' })
      setImageFile(file)
      setImageFileName('Captured from webcam')
      setImagePreview(URL.createObjectURL(blob))
      handleStopCamera()
    }, 'image/jpeg')
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

  const handleStartCodingRound = async () => {
    setRoundLoading(true)
    setCodingRound(null)
    setRoundCode({ easy: '', medium: '', hard: '' })
    setRoundResults({ easy: null, medium: null, hard: null })
    setFinalRoundScore(null)
    try {
      // Pull skills from the resume/JD analysis (if the candidate has run
      // it) so the coding round can be themed around relevant topics.
      const matched = resumeResult?.skill_gap_analysis?.matched_skills || []
      const missing = resumeResult?.skill_gap_analysis?.missing_skills || []
      const jdSkills = [...matched, ...missing]
      const skillsParam = jdSkills.length > 0 ? jdSkills.join(',') : undefined

      const response = await axios.get(`${API_BASE}/coding-round`, {
        params: { role: 'python developer', skills: skillsParam }
      })
      setCodingRound(response.data)
      const prefill = {}
      for (const level of ['easy', 'medium', 'hard']) {
        if (response.data[level]) {
          prefill[level] = response.data[level].starter_code || ''
        }
      }
      setRoundCode((prev) => ({ ...prev, ...prefill }))
    } catch (error) {
      alert('Could not load coding round: ' + error.message)
    } finally {
      setRoundLoading(false)
    }
  }

  const handleRoundLanguageChange = async (newLanguage) => {
    setRoundLanguage(newLanguage)
    if (!codingRound) return
    for (const level of ['easy', 'medium', 'hard']) {
      const question = codingRound[level]
      if (!question) continue
      try {
        const response = await axios.get(`${API_BASE}/starter-code`, {
          params: { question_id: question.id, language: newLanguage }
        })
        if (response.data.starter_code) {
          setRoundCode((prev) => ({ ...prev, [level]: response.data.starter_code }))
        }
      } catch (error) {
        // silently ignore - candidate can still write from scratch
      }
    }
  }

  const handleSubmitRoundCode = async (level) => {
    const question = codingRound?.[level]
    const code = roundCode[level]
    if (!question || !code.trim()) {
      alert('Write some code for this question first.')
      return
    }
    setRoundSubmitting((prev) => ({ ...prev, [level]: true }))
    try {
      const response = await axios.post(`${API_BASE}/submit-code`, {
        user_code: code,
        question_id: question.id,
        language: roundLanguage,
        role: 'python developer'
      })
      setRoundResults((prev) => ({ ...prev, [level]: response.data }))
    } catch (error) {
      alert('Could not submit code: ' + error.message)
    } finally {
      setRoundSubmitting((prev) => ({ ...prev, [level]: false }))
    }
  }

  const handleCalculateFinalScore = async () => {
    const submissions = ['easy', 'medium', 'hard']
      .filter((level) => roundResults[level] && !roundResults[level].error)
      .map((level) => ({
        difficulty: level,
        passed: roundResults[level].passed,
        total: roundResults[level].total
      }))

    if (submissions.length === 0) {
      alert('Submit at least one question before calculating the final score.')
      return
    }

    setFinalRoundLoading(true)
    try {
      const response = await axios.post(`${API_BASE}/score-coding-round`, { submissions })
      setFinalRoundScore(response.data)
    } catch (error) {
      alert('Could not calculate final score: ' + error.message)
    } finally {
      setFinalRoundLoading(false)
    }
  }

  const handleGenerateReadinessReport = async () => {
    setReadinessLoading(true)
    setRoadmapLoading(true)
    setReadinessResult(null)
    setRoadmapResult(null)

    const skillMatch = resumeResult?.skill_gap_analysis?.match_percentage ?? null
    const missingSkills = resumeResult?.skill_gap_analysis?.missing_skills ?? null
    const speechWpm = speechResult?.speaking_pace?.wpm ?? null
    const fillerRatio = speechResult?.filler_analysis?.filler_ratio_percent ?? null
    const dominantEmotion = emotionResult?.dominant_emotion ?? null

    try {
      const readinessResponse = await axios.post(`${API_BASE}/predict-readiness`, {
        skill_match_percent: skillMatch,
        answer_scores: answerScoreHistory.length > 0 ? answerScoreHistory : null,
        speech_wpm: speechWpm,
        filler_ratio: fillerRatio,
        dominant_emotion: dominantEmotion
      })
      setReadinessResult(readinessResponse.data)

      if (!readinessResponse.data.error) {
        saveProgressEntry(readinessResponse.data.final_score, readinessResponse.data.verdict)
      }

      if (!readinessResponse.data.error) {
        const roadmapResponse = await axios.post(`${API_BASE}/generate-roadmap`, {
          missing_skills: missingSkills,
          weakest_area: readinessResponse.data.weakest_area,
          component_scores: readinessResponse.data.component_scores,
          filler_ratio: fillerRatio,
          speech_wpm: speechWpm
        })
        setRoadmapResult(roadmapResponse.data)
      }
    } catch (error) {
      alert('Could not generate report: ' + error.message)
    } finally {
      setReadinessLoading(false)
      setRoadmapLoading(false)
    }
  }

  const handleDownloadPdfReport = () => {
    if (!readinessResult || readinessResult.error) {
      alert('Generate a readiness report first.')
      return
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 48
    const maxWidth = pageWidth - margin * 2
    let y = margin

    const addLine = (text, size = 11, bold = false, color = [40, 44, 60]) => {
      if (y > 760) {
        doc.addPage()
        y = margin
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, margin, y)
      y += lines.length * (size + 4)
    }

    const addGap = (h = 10) => { y += h }

    // ---- Header ----
    addLine('Interview Readiness Report', 22, true, [27, 31, 46])
    addLine(`Generated on ${new Date().toLocaleString()}`, 10, false, [120, 126, 145])
    addGap(14)

    // ---- Overall Verdict ----
    addLine('Overall Assessment', 14, true, [124, 92, 245])
    addLine(`Final Score: ${readinessResult.final_score} / 100`, 12, true)
    addLine(`Verdict: ${readinessResult.verdict}`, 12, true)
    addLine(readinessResult.summary, 11)
    addGap(14)

    // ---- Component Breakdown ----
    addLine('Component Breakdown', 14, true, [124, 92, 245])
    Object.entries(readinessResult.component_scores || {})
      .sort((a, b) => a[1] - b[1])
      .forEach(([key, value]) => {
        const label = key.replace(/_/g, ' ')
        const severity = value >= 75 ? 'Strong' : value >= 55 ? 'Needs Work' : 'Weakest'
        addLine(`${label}: ${value} (${severity})`, 11)
      })
    addGap(14)

    // ---- Resume Skill Gap ----
    if (resumeResult?.skill_gap_analysis) {
      addLine('Resume & Role Fit', 14, true, [124, 92, 245])
      addLine(`Role match: ${resumeResult.skill_gap_analysis.match_percentage}%`, 11)
      const matched = resumeResult.skill_gap_analysis.matched_skills || []
      const missing = resumeResult.skill_gap_analysis.missing_skills || []
      if (matched.length) addLine(`Matched skills: ${matched.join(', ')}`, 11)
      if (missing.length) addLine(`Skill gaps: ${missing.join(', ')}`, 11)
      addGap(14)
    }

    // ---- Voice ----
    if (speechResult && !speechResult.error) {
      addLine('Voice Assessment', 14, true, [124, 92, 245])
      addLine(`Speaking pace: ${speechResult.speaking_pace?.wpm} WPM`, 11)
      addLine(`Filler words: ${speechResult.filler_analysis?.total_filler_count} (${speechResult.filler_analysis?.filler_ratio_percent}%)`, 11)
      addLine(speechResult.speaking_pace?.pace_category || '', 11)
      addGap(14)
    }

    // ---- Composure ----
    if (emotionResult && !emotionResult.error) {
      addLine('Composure Check', 14, true, [124, 92, 245])
      addLine(`Dominant expression: ${emotionResult.dominant_emotion}`, 11)
      addLine(emotionResult.composure_feedback || '', 11)
      addGap(14)
    }

    // ---- Coding Round ----
    if (finalRoundScore && !finalRoundScore.error) {
      addLine('Coding Round', 14, true, [124, 92, 245])
      addLine(`Score: ${finalRoundScore.final_score}% (${finalRoundScore.verdict})`, 11)
      finalRoundScore.breakdown?.forEach((b) => {
        addLine(`${b.difficulty}: ${b.passed}/${b.total} tests passed (${b.score_percent}%)`, 11)
      })
      addGap(14)
    }

    // ---- Roadmap ----
    if (roadmapResult) {
      addLine('Personalized Roadmap', 14, true, [124, 92, 245])
      addLine(`Priority: ${roadmapResult.priority_focus}`, 11, true)
      addGap(6)

      if (roadmapResult.skill_gaps?.length) {
        addLine('Skills to close:', 11, true)
        roadmapResult.skill_gaps.forEach((item) => {
          addLine(`- ${item.skill}: ${item.action}`, 10)
        })
        addGap(6)
      }

      if (roadmapResult.interview_technique?.length) {
        addLine('Interview technique:', 11, true)
        roadmapResult.interview_technique.forEach((tip) => addLine(`- ${tip}`, 10))
        addGap(6)
      }

      if (roadmapResult.communication?.length) {
        addLine('Communication:', 11, true)
        roadmapResult.communication.forEach((tip) => addLine(`- ${tip}`, 10))
      }
    }

    doc.save(`interview-readiness-report-${new Date().toISOString().slice(0, 10)}.pdf`)
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

      <div className="wizard-banner slide-up" style={{ animationDelay: '0.02s' }}>
        <div>
          <p className="wizard-banner-title">Guided Mock Interview</p>
          <p className="wizard-banner-sub">One continuous flow: resume fit → questions → voice → composure → report.</p>
        </div>
        <button className="action-btn accent-purple" onClick={handleStartWizard}>
          <Play size={14} /> Start full mock interview
        </button>
      </div>

      {showSidebar && (
      <aside className="feature-strip glass slide-up" style={{ animationDelay: '0.32s', top: Math.max(sidebarTop - scrollY, 14) }}>
        <div className="feature-item" onClick={() => scrollToSection(sessionSummaryRef)}>
          <span className="feature-icon icon-teal"><ShieldCheck size={18} /></span>
          <div>
            <p className="feature-title">AI-Powered Insights</p>
            <p className="feature-sub">Smart analysis &amp; feedback</p>
          </div>
        </div>
        <div className="feature-item" onClick={handleSecurePrivacyClick}>
          <span className="feature-icon icon-purple"><Lock size={18} /></span>
          <div>
            <p className="feature-title">Secure &amp; Private</p>
            <p className="feature-sub">Your data stays on your machine</p>
          </div>
        </div>
        <div className="feature-item" onClick={handleTrackProgressClick}>
          <span className="feature-icon icon-amber"><TrendingUp size={18} /></span>
          <div>
            <p className="feature-title">Track Progress</p>
            <p className="feature-sub">Monitor your improvement</p>
          </div>
        </div>
        <div className="feature-item" onClick={() => scrollToSection(rehearsalSectionRef)}>
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
        <section className="glass-card slide-up" ref={resumeSectionRef} style={{ animationDelay: '0.05s' }}>
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
        <section className="glass-card slide-up" ref={rehearsalSectionRef} style={{ animationDelay: '0.12s' }}>
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
                  <span className={`timer-tag ${timeLeft <= 15 ? 'timer-urgent' : ''}`}>
                    <TimerIcon size={13} /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </span>
                  <span className={`diff-tag diff-${questions[currentQIndex].difficulty}`}>
                    {questions[currentQIndex].difficulty}
                  </span>
                </div>

                <div className="question-row">
                  <p className="question-text">{questions[currentQIndex].question}</p>
                  <button
                    type="button"
                    className="speak-btn"
                    onClick={() => handleSpeakQuestion(questions[currentQIndex].question)}
                    title="Read question aloud"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>

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
        <section className="glass-card slide-up" ref={voiceSectionRef} style={{ animationDelay: '0.19s' }}>
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
              <label>Record your answer</label>
              <div className="record-controls">
                {!isRecordingAudio ? (
                  <button type="button" className="record-btn" onClick={handleStartAudioRecording}>
                    <Circle size={14} className="record-dot" /> Record
                  </button>
                ) : (
                  <button type="button" className="record-btn recording" onClick={handleStopAudioRecording}>
                    <Square size={14} /> Stop ({recordingElapsed}s)
                  </button>
                )}
                <span className="record-or">or</span>
                <label className="file-btn">
                  <Upload size={14} /> Choose file
                  <input type="file" accept="audio/*" onChange={handleAudioFileChange} hidden />
                </label>
              </div>
              <span className="file-name">{audioFileName || 'No recording yet'}</span>
            </div>

            <div className="field">
              <label>Duration (seconds) {audioFileName?.startsWith('Recorded') && '— auto-detected'}</label>
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
        <section className="glass-card slide-up" ref={composureSectionRef} style={{ animationDelay: '0.26s' }}>
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
              <div className="record-controls">
                {!cameraActive ? (
                  <button type="button" className="record-btn" onClick={handleStartCamera}>
                    <Camera size={14} /> Open camera
                  </button>
                ) : (
                  <button type="button" className="record-btn recording" onClick={handleCapturePhoto}>
                    <Circle size={14} className="record-dot" /> Capture
                  </button>
                )}
                <span className="record-or">or</span>
                <label className="file-btn">
                  <Upload size={14} /> Choose file
                  <input type="file" accept="image/*" onChange={handleImageFileChange} hidden />
                </label>
              </div>
              <span className="file-name">{imageFileName || 'No photo yet'}</span>
            </div>

            {cameraActive && (
              <div className="webcam-preview-wrap">
                <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
                <button type="button" className="camera-cancel-btn" onClick={handleStopCamera}>Cancel</button>
              </div>
            )}

            {imagePreview && !cameraActive && (
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

        {/* ---------- CARD 05 — CODING ROUND ---------- */}
        <section className="glass-card coding-round-card slide-up" style={{ animationDelay: '0.30s' }}>
          <div className="card-top-border accent-teal-border" />
          <div className="card-head">
            <span className="card-icon icon-teal"><Code size={20} /></span>
            <div>
              <span className="card-eyebrow">FILE 05</span>
              <h2 className="card-title">Coding Round</h2>
            </div>
          </div>

          <div className="card-body">
            <button className="action-btn accent-teal" onClick={handleStartCodingRound} disabled={roundLoading}>
              {roundLoading && <span className="spinner" />}
              {!roundLoading && <Play size={14} />}
              {roundLoading ? 'Preparing round…' : 'Start coding round'}
            </button>

            {roundLoading && (
              <div className="loading-panel">
                <p className="loading-text">PICKING QUESTIONS</p>
                <div className="loading-row short" />
                <div className="loading-row full" />
              </div>
            )}

            {codingRound && (
              <div className="interview fade-in">
                <div className="field">
                  <label>Language (used for all three)</label>
                  <select value={roundLanguage} onChange={(e) => handleRoundLanguageChange(e.target.value)}>
                    <option value="python">Python</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>

                {['easy', 'medium', 'hard'].map((level) => {
                  const question = codingRound[level]
                  if (!question) return null
                  const result = roundResults[level]
                  const submitting = roundSubmitting[level]

                  return (
                    <div key={level} className="round-question-block">
                      <div className="round-question-head">
                        <span className={`diff-tag diff-${level}`}>{level}</span>
                        <h3 className="round-question-title">{question.title}</h3>
                        {question.matched_to_skills && (
                          <span className="matched-skill-badge">🎯 matched to your skills</span>
                        )}
                      </div>
                      <p className="round-question-desc">{question.description}</p>

                      <div className="code-box-header">
                        <label>Your solution</label>
                      </div>

                      <textarea
                        rows="6"
                        className="code-box"
                        placeholder="Write your solution here — read input from stdin, print the answer to stdout..."
                        value={roundCode[level]}
                        onChange={(e) => setRoundCode((prev) => ({ ...prev, [level]: e.target.value }))}
                      />

                      <button
                        className="action-btn accent-teal round-submit-btn"
                        onClick={() => handleSubmitRoundCode(level)}
                        disabled={submitting}
                      >
                        {submitting && <span className="spinner" />}
                        {submitting ? 'Running…' : 'Submit'}
                      </button>

                      {submitting && (
                        <div className="loading-panel">
                          <p className="loading-text">COMPILING &amp; RUNNING</p>
                          <div className="loading-row full" />
                        </div>
                      )}

                      {result && !result.error && (
                        <div className="round-result">
                          <div className="code-verdict-row">
                            <span className={`verdict-tag verdict-${result.verdict?.toLowerCase().replace(/\s+/g, '-')}`}>
                              {result.verdict}
                            </span>
                            <span className="code-pass-count">{result.passed} / {result.total} tests passed</span>
                          </div>

                          <div className="test-results">
                            {result.test_results?.map((tr) => (
                              <div key={tr.test_number} className={`test-row ${tr.passed ? 'test-pass' : 'test-fail'}`}>
                                <span className="test-num">Test {tr.test_number}</span>
                                <span className="test-status">{tr.passed ? 'Passed' : 'Failed'}</span>
                                {!tr.passed && !tr.error && (
                                  <p className="test-error">Expected: {String(tr.expected)} | Got: {String(tr.actual)}</p>
                                )}
                                {!tr.passed && tr.error && (
                                  <p className="test-error">{tr.error}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result && result.error && (
                        <p className="feedback-line">Error: {result.error}</p>
                      )}
                    </div>
                  )
                })}

                <button className="action-btn accent-purple" onClick={handleCalculateFinalScore} disabled={finalRoundLoading}>
                  {finalRoundLoading && <span className="spinner" />}
                  {finalRoundLoading ? 'Calculating…' : 'Calculate final score'}
                </button>

                {finalRoundScore && !finalRoundScore.error && (
                  <div className="readout fade-in">
                    <div className="code-verdict-row">
                      <span className={`verdict-tag verdict-${finalRoundScore.verdict === 'Strong' ? 'accepted' : finalRoundScore.verdict === 'Moderate' ? 'wrong-answer' : 'failed'}`}>
                        {finalRoundScore.verdict}
                      </span>
                      <span className="code-pass-count">Final score: {finalRoundScore.final_score}%</span>
                    </div>

                    <div className="test-results">
                      {finalRoundScore.breakdown?.map((b) => (
                        <div key={b.difficulty} className="test-row test-pass">
                          <span className="test-num">{b.difficulty}</span>
                          <span className="test-status">{b.passed}/{b.total} ({b.score_percent}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- CARD 06 — SESSION SUMMARY ---------- */}
        <section className="glass-card coding-round-card slide-up" ref={sessionSummaryRef} style={{ animationDelay: '0.35s' }}>
          <div className="card-top-border accent-purple-border" />
          <div className="card-head">
            <span className="card-icon icon-purple"><Sparkles size={20} /></span>
            <div>
              <span className="card-eyebrow">FILE 06</span>
              <h2 className="card-title">Session Summary &amp; Roadmap</h2>
            </div>
          </div>

          <div className="card-body">
            <p className="feedback-line" style={{ marginBottom: 16 }}>
              Combines whatever you've completed so far (resume match, interview answers,
              voice delivery, composure) into one overall readiness verdict and a
              personalized study plan.
            </p>

            <div className="button-row">
              <button className="action-btn accent-purple" onClick={handleGenerateReadinessReport} disabled={readinessLoading}>
                {readinessLoading && <span className="spinner" />}
                {!readinessLoading && <Sparkles size={14} />}
                {readinessLoading ? 'Analyzing session…' : 'Generate readiness report'}
              </button>

              {readinessResult && !readinessResult.error && (
                <button className="ghost-btn download-pdf-btn" onClick={handleDownloadPdfReport}>
                  <Download size={14} /> Download PDF
                </button>
              )}
            </div>

            {readinessLoading && (
              <div className="loading-panel">
                <p className="loading-text">COMBINING SIGNALS</p>
                <div className="loading-row short" />
                <div className="loading-row medium" />
                <div className="loading-row full" />
              </div>
            )}

            {readinessResult && readinessResult.error && (
              <p className="feedback-line">{readinessResult.error} Complete at least one module above (resume, interview, voice, or composure) first.</p>
            )}

            {readinessResult && !readinessResult.error && (
              <div className="readout fade-in">
                <div className="score-readout">
                  <div className="score-number-wrap">
                    <div className="score-number"><AnimatedNumber value={readinessResult.final_score} /><span>/100</span></div>
                    {readinessResult.final_score >= 80 && <Confetti />}
                  </div>
                  <div className="score-detail">
                    <span className={`verdict-tag verdict-${readinessResult.verdict === 'Ready' ? 'accepted' : readinessResult.verdict === 'Needs Practice' ? 'wrong-answer' : 'failed'}`}>
                      {readinessResult.verdict}
                    </span>
                    <p className="feedback-line" style={{ marginTop: 8 }}>{readinessResult.summary}</p>
                  </div>
                </div>

                <div className="component-scores-grid">
                  {Object.entries(readinessResult.component_scores || {})
                    .sort((a, b) => a[1] - b[1])
                    .map(([key, value]) => {
                      const severity = value >= 75 ? 'strong' : value >= 55 ? 'moderate' : 'weak'
                      return (
                        <div key={key} className={`component-score-card severity-${severity}`}>
                          <div className="component-score-label">{key.replace(/_/g, ' ')}</div>
                          <div className="component-score-value">{value}</div>
                          <div className={`component-score-tag tag-${severity}`}>
                            {severity === 'strong' ? 'Strong' : severity === 'moderate' ? 'Needs Work' : 'Weakest'}
                          </div>
                        </div>
                      )
                    })}
                </div>

                {roadmapLoading && (
                  <div className="loading-panel">
                    <p className="loading-text">BUILDING ROADMAP</p>
                    <div className="loading-row full" />
                  </div>
                )}

                {roadmapResult && (
                  <div className="roadmap-section">
                    <p className="roadmap-priority">🎯 Priority: {roadmapResult.priority_focus}</p>

                    {roadmapResult.skill_gaps?.length > 0 && (
                      <div className="roadmap-block">
                        <div className="chip-heading">skills to close</div>
                        {roadmapResult.skill_gaps.map((item) => (
                          <div key={item.skill} className="roadmap-item">
                            <span className="chip chip-gap">{item.skill}</span>
                            <span className="roadmap-item-text">{item.action}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {roadmapResult.interview_technique?.length > 0 && (
                      <div className="roadmap-block">
                        <div className="chip-heading">interview technique</div>
                        {roadmapResult.interview_technique.map((tip, i) => (
                          <p key={i} className="roadmap-tip">• {tip}</p>
                        ))}
                      </div>
                    )}

                    {roadmapResult.communication?.length > 0 && (
                      <div className="roadmap-block">
                        <div className="chip-heading">communication</div>
                        {roadmapResult.communication.map((tip, i) => (
                          <p key={i} className="roadmap-tip">• {tip}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {progressHistory.length > 0 && (
              <div className="progress-history-section" ref={progressHistoryRef}>
                <div className="progress-history-head">
                  <div className="chip-heading">progress history (last {progressHistory.length} sessions)</div>
                  <button type="button" className="clear-history-btn" onClick={handleClearProgressHistory}>
                    Clear
                  </button>
                </div>

                <div className="progress-bars">
                  {progressHistory.map((entry, i) => (
                    <div key={i} className="progress-bar-row">
                      <span className="progress-bar-label">
                        {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-fill progress-${entry.score >= 75 ? 'strong' : entry.score >= 55 ? 'moderate' : 'weak'}`}
                          style={{ width: `${entry.score}%` }}
                        />
                      </div>
                      <span className="progress-bar-value">{entry.score}</span>
                    </div>
                  ))}
                </div>

                {progressHistory.length >= 2 && (
                  <p className="feedback-line" style={{ marginTop: 10 }}>
                    {progressHistory[progressHistory.length - 1].score > progressHistory[0].score
                      ? `📈 Improved by ${(progressHistory[progressHistory.length - 1].score - progressHistory[0].score).toFixed(1)} points since your first session.`
                      : progressHistory[progressHistory.length - 1].score < progressHistory[0].score
                        ? `📉 Down ${(progressHistory[0].score - progressHistory[progressHistory.length - 1].score).toFixed(1)} points since your first session - keep practicing.`
                        : `Your score has stayed steady across sessions.`}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

      </main>

      {wizardActive && (
        <div className="wizard-bar">
          <span className="wizard-bar-step">
            Step {wizardStep + 1} / {WIZARD_STEPS.length}: {WIZARD_STEPS[wizardStep].label}
          </span>
          <div className="wizard-bar-actions">
            <button className="ghost-btn wizard-exit-btn" onClick={handleWizardExit}>Exit</button>
            <button className="action-btn accent-purple" onClick={handleWizardNext}>
              {wizardStep === WIZARD_STEPS.length - 1 ? 'Finish & generate report' : 'Next step →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App