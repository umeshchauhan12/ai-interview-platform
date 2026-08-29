"""
Main FastAPI Application
--------------------------
Ye file poore backend ka entry point hai. Ye Question Generator aur
Answer Scoring modules ko web API endpoints ke through accessible banati hai.

Run karne ke liye: uvicorn backend.main:app --reload
"""

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sys
import os
import shutil

# modules folder ko path mein add karo
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "modules"))

from question_generator import get_questions
from answer_scoring import score_answer
from resume_parser import parse_resume, compute_skill_gap
from speech_analysis import analyze_speech
from emotion_analysis import analyze_emotion_from_image
from code_evaluator import (
    list_coding_questions, get_coding_question, run_submitted_code,
    get_coding_round, score_coding_round
)
from readiness_prediction import compute_readiness
from roadmap_generator import generate_roadmap


app = FastAPI(title="AI Interview Platform API", version="0.1.0")

# CORS setup - taaki React frontend (localhost:5173) is backend ko call kar sake
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request Body Schemas (Pydantic Models) ----------
# Ye define karte hain ki API ko kaisa data bhejna hai

class AnswerRequest(BaseModel):
    user_answer: str
    ideal_answer: str
    keywords: Optional[List[str]] = None


# ---------- Routes ----------

@app.get("/")
def home():
    """Basic health check - check karne ke liye ki server chal raha hai"""
    return {"message": "AI Interview Platform API is running!"}


@app.get("/questions")
def fetch_questions(role: str, category: str = "technical", count: int = 5, difficulty: Optional[str] = None):
    """
    Job role ke hisaab se interview questions deta hai.

    Example: /questions?role=python developer&category=technical&count=3
    """
    result = get_questions(role=role, category=category, difficulty=difficulty, count=count)
    return {"questions": result}


@app.post("/score-answer")
def evaluate_answer(request: AnswerRequest):
    """
    User ke answer ko ideal answer ke saath compare karke score deta hai.

    Request body mein bhejna hoga: user_answer, ideal_answer, keywords (optional)
    """
    result = score_answer(
        user_answer=request.user_answer,
        ideal_answer=request.ideal_answer,
        keywords=request.keywords
    )
    return result


@app.post("/analyze-resume")
def analyze_resume(jd_text: str = Form(...), resume_file: UploadFile = File(...)):
    """
    Resume PDF upload karo aur Job Description (JD) text bhejo.
    Ye resume se skills extract karega aur JD ke saath compare karke
    skill gap analysis dega.

    Form data mein bhejna hoga: jd_text (string), resume_file (PDF file)
    """
    # Temporary location pe uploaded file save karo
    temp_path = f"temp_{resume_file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(resume_file.file, buffer)

    # Resume parse karo
    parsed = parse_resume(temp_path)

    # Temp file delete karo (cleanup)
    os.remove(temp_path)

    if "error" in parsed:
        return parsed

    # Skill gap nikaalo
    gap_result = compute_skill_gap(parsed["skills_found"], jd_text)

    return {
        "resume_info": {
            "email": parsed["email"],
            "phone": parsed["phone"],
            "skills_found": parsed["skills_found"]
        },
        "skill_gap_analysis": gap_result
    }


@app.post("/analyze-speech")
def analyze_speech_endpoint(duration_seconds: float = Form(...), audio_file: UploadFile = File(...)):
    """
    Audio file upload karo (candidate ka bola hua answer) aur duration
    (seconds mein) bhejo. Ye transcription, speaking pace, aur filler
    words analysis dega.

    Form data mein bhejna hoga: duration_seconds (number), audio_file (audio file)
    """
    # Temporary location pe uploaded file save karo
    temp_path = f"temp_{audio_file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    # Speech analyze karo
    result = analyze_speech(temp_path, duration_seconds)

    # Temp file delete karo (cleanup)
    os.remove(temp_path)

    return result


@app.post("/analyze-emotion")
def analyze_emotion_endpoint(image_file: UploadFile = File(...)):
    """
    Candidate ki photo upload karo (interview ke dauran li gayi).
    Ye facial emotion detect karega aur composure feedback dega.

    Form data mein bhejna hoga: image_file (jpg/png image)
    """
    temp_path = f"temp_{image_file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(image_file.file, buffer)

    result = analyze_emotion_from_image(temp_path)

    os.remove(temp_path)

    return result


class CodeSubmission(BaseModel):
    user_code: str
    question_id: str
    language: Optional[str] = "python"
    role: Optional[str] = "python developer"


@app.get("/coding-questions")
def get_coding_questions_endpoint(role: str = "python developer"):
    """
    Role ke saare coding questions ki list deta hai (sirf titles/ids,
    poora question text nahi - taaki list halki rahe).
    """
    return {"questions": list_coding_questions(role)}


@app.get("/coding-question")
def get_single_coding_question(role: str = "python developer", question_id: str = None):
    """
    Ek specific coding question ka poora detail deta hai (title,
    description, function name jo implement karna hai).
    """
    return get_coding_question(role, question_id)


@app.post("/submit-code")
def submit_code_endpoint(submission: CodeSubmission):
    """
    Candidate ka submitted code safely run karta hai aur test cases
    ke against evaluate karta hai.

    Request body: user_code (string), question_id (string),
    language (optional: python/c/cpp/java/javascript), role (optional)
    """
    return run_submitted_code(
        submission.user_code,
        submission.question_id,
        submission.language,
        submission.role
    )


@app.get("/coding-round")
def get_coding_round_endpoint(role: str = "python developer"):
    """
    Automatically builds one full coding round: a randomly chosen Easy,
    Medium, and Hard question. No manual curation needed - a fresh mix
    is picked every time this is called.
    """
    return get_coding_round(role)


class CodingRoundScoreRequest(BaseModel):
    submissions: List[dict]


@app.post("/score-coding-round")
def score_coding_round_endpoint(request: CodingRoundScoreRequest):
    """
    Takes the results of the 3 submissions (easy/medium/hard) from a
    coding round and combines them into one weighted final score and
    verdict (Strong / Moderate / Weak).

    Request body: submissions - a list of objects like
    {"difficulty": "easy", "passed": 3, "total": 3}
    """
    return score_coding_round(request.submissions)


class ReadinessRequest(BaseModel):
    skill_match_percent: Optional[float] = None
    answer_scores: Optional[List[float]] = None
    speech_wpm: Optional[float] = None
    filler_ratio: Optional[float] = None
    dominant_emotion: Optional[str] = None


@app.post("/predict-readiness")
def predict_readiness_endpoint(request: ReadinessRequest):
    """
    Combines all available signals from a session (skill match, answer
    scores, speech pace, filler ratio, emotion) into an overall
    interview readiness verdict.

    All fields are optional - the model works with whatever signals
    are available and normalizes weights accordingly.
    """
    return compute_readiness(
        skill_match_percent=request.skill_match_percent,
        answer_scores=request.answer_scores,
        speech_wpm=request.speech_wpm,
        filler_ratio=request.filler_ratio,
        dominant_emotion=request.dominant_emotion
    )


class RoadmapRequest(BaseModel):
    missing_skills: Optional[List[str]] = None
    weakest_area: Optional[str] = None
    component_scores: Optional[dict] = None
    filler_ratio: Optional[float] = None
    speech_wpm: Optional[float] = None


@app.post("/generate-roadmap")
def generate_roadmap_endpoint(request: RoadmapRequest):
    """
    Generates a personalized study roadmap based on the candidate's
    weak areas (missing skills, low answer quality, speech issues,
    composure issues).
    """
    return generate_roadmap(
        missing_skills=request.missing_skills,
        weakest_area=request.weakest_area,
        component_scores=request.component_scores,
        filler_ratio=request.filler_ratio,
        speech_wpm=request.speech_wpm
    )