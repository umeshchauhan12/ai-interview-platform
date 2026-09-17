# Interview Dossier — AI-Powered Interview Preparation Platform

A full-stack, multi-modal AI platform that simulates and evaluates technical interviews end-to-end — combining NLP, computer vision, speech processing, and sandboxed code execution in a single system.

**Live repo:** [github.com/umeshchauhan12/ai-interview-platform](https://github.com/umeshchauhan12/ai-interview-platform)

---

## Overview

Interview Dossier helps candidates prepare for technical interviews by analyzing every dimension of their performance — resume fit, verbal answers, speech delivery, facial composure, and live coding ability — and turning it into a single, actionable readiness report with a personalized study roadmap.

Unlike a simple LLM wrapper, this project integrates **7 independent ML/AI modules**, a **multi-language sandboxed code judge**, and a **fully custom-designed React frontend**, all orchestrated through a FastAPI backend.

---

## Features

### Core AI/ML Modules
- **Resume & Skill-Gap Analysis** — parses PDF resumes and compares extracted skills against a job description using NLP-based entity extraction
- **Semantic Answer Scoring** — evaluates interview answers using Sentence-BERT embeddings and cosine similarity (meaning-based, not keyword matching)
- **Speech Analysis** — transcribes spoken answers with OpenAI Whisper, and measures speaking pace (WPM) and filler-word usage
- **Emotion & Composure Detection** — detects facial emotion from a candidate's photo using DeepFace with a RetinaFace detector backend
- **Multi-Language Coding Round** — a sandboxed, stdin/stdout-based code judge supporting **Python, C, C++, Java, and JavaScript**, with auto-generated starter templates and JD-based question matching
- **Readiness Prediction Model** — a weighted aggregation model that combines all available signals into a single "Ready / Needs Practice / Not Ready" verdict
- **Personalized Learning Roadmap** — a rule-based recommendation engine that turns weak areas into concrete next steps

### Platform Features
- Live in-browser voice recording and webcam capture (no file uploads required)
- Text-to-speech interviewer that reads questions aloud
- Timer-based mock interview questions
- A guided, step-by-step "Full Mock Interview" wizard tying every module into one flow
- Session progress history tracked across visits (stored locally in the browser)
- One-click PDF export of the full readiness report
- A custom-designed glassmorphism UI with animated backgrounds and 3D interaction effects

---

## Tech Stack

**Backend**
- Python, FastAPI
- Sentence-Transformers (Sentence-BERT)
- OpenAI Whisper
- DeepFace + TensorFlow (facial emotion detection)
- pdfplumber (resume parsing)
- Sandboxed `subprocess`-based multi-language code execution

**Frontend**
- React (Vite)
- Axios
- jsPDF
- Custom CSS design system (glassmorphism, Fraunces / IBM Plex typography)

**Tooling**
- Git / GitHub
- Dual Python environment setup (Python 3.14 for the core backend, Python 3.11 for TensorFlow/DeepFace compatibility)

---

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────┐
│   React Frontend      │◄──────►│    FastAPI Backend         │
│  (Vite, Axios, jsPDF)  │  REST  │  13 endpoints               │
└─────────────────────┘        └──────────────┬───────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
          ┌─────────▼─────────┐        ┌─────────▼─────────┐        ┌─────────▼─────────┐
          │  NLP Engine          │        │  Speech Engine       │        │  Vision Engine        │
          │  - Resume parser      │        │  - Whisper STT        │        │  - DeepFace            │
          │  - Sentence-BERT      │        │  - Pace/filler         │        │  - RetinaFace           │
          │    answer scoring     │        │    detection            │        │    emotion detection    │
          └────────────────────┘        └───────────────────┘        └───────────────────┘
                    │
          ┌─────────▼─────────────────┐
          │  Code Judge Engine            │
          │  - Multi-language sandbox       │
          │  - stdin/stdout test cases      │
          │  - Skill-tag question matching  │
          └────────────────────────────┘
                    │
          ┌─────────▼─────────────────┐
          │  Aggregation Engine             │
          │  - Readiness prediction          │
          │  - Personalized roadmap          │
          └────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Python 3.11 (required for TensorFlow/DeepFace compatibility)
- Node.js 18+
- gcc / g++ (for C/C++ code judging)
- JDK (for Java code judging)
- FFmpeg (for Whisper audio processing)

### Backend Setup

```bash
# Clone the repo
git clone https://github.com/umeshchauhan12/ai-interview-platform.git
cd ai-interview-platform

# Create and activate a virtual environment
python -m venv venv311
venv311\Scripts\activate        # Windows
# source venv311/bin/activate   # macOS/Linux

# Install dependencies
pip install fastapi uvicorn python-multipart sentence-transformers pdfplumber openai-whisper
pip install opencv-python deepface tf-keras

# Run the backend
uvicorn backend.main:app --reload
```

Backend runs at `http://127.0.0.1:8000` — interactive API docs at `http://127.0.0.1:8000/docs`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/questions` | Fetch role-based interview questions |
| POST | `/score-answer` | Score an answer using Sentence-BERT |
| POST | `/analyze-resume` | Parse resume + compute skill gap |
| POST | `/analyze-speech` | Transcribe and analyze speech delivery |
| POST | `/analyze-emotion` | Detect facial emotion from a photo |
| GET | `/coding-round` | Get an auto-randomized Easy/Medium/Hard coding round |
| GET | `/starter-code` | Get a starter code template for a question + language |
| POST | `/submit-code` | Run submitted code against test cases |
| POST | `/score-coding-round` | Combine coding round results into a final score |
| POST | `/predict-readiness` | Combine all session signals into a readiness verdict |
| POST | `/generate-roadmap` | Generate a personalized study roadmap |

---

## Project Structure

```
ai-interview-platform/
├── backend/
│   ├── main.py                    # FastAPI app + all endpoints
│   └── modules/
│       ├── resume_parser.py
│       ├── answer_scoring.py
│       ├── speech_analysis.py
│       ├── emotion_analysis.py
│       ├── code_evaluator.py
│       ├── readiness_prediction.py
│       ├── roadmap_generator.py
│       └── question_generator.py
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── App.css
└── README.md
```

---

## Known Limitations & Future Work

- Dynamic LLM-based question generation was evaluated (Flan-T5) but produced inconsistent results for open-ended interview questions at the small-model scale tested; a template-based question bank was used instead, which is more reliable and remains a candidate for future improvement with a larger model.
- Coding questions are algorithmic (stdin/stdout judged) rather than framework-specific; skill-tag matching bridges this gap conceptually but does not execute real framework code.
- Progress history is stored per-browser (localStorage) rather than in a persistent backend database — a natural next step for multi-device tracking.

---

## Author

Built by [Umesh Chauhan](https://github.com/umeshchauhan12).
