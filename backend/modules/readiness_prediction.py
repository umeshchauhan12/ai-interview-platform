"""
Readiness Prediction Module
------------------------------
Ye module candidate ke saare scores (skill match, answer quality, speech
delivery, composure) ko combine karke ek final "Interview Readiness"
verdict deta hai - jaise "Ready", "Needs Practice", "Not Ready".

Approach: Weighted aggregation model - har component ko interview success
ke liye uski relative importance ke hisaab se weight diya gaya hai
(rule-based scoring model, transparent aur explainable).
"""


# Weights - kaunsa component overall readiness mein kitna contribute karta hai
WEIGHTS = {
    "skill_match": 0.25,      # resume-JD skill alignment
    "answer_quality": 0.40,   # sabse important - actual interview performance
    "speech_delivery": 0.20,  # communication clarity
    "composure": 0.15,        # confidence/nervousness
}


def compute_readiness(
    skill_match_percent: float = None,
    answer_scores: list = None,
    speech_wpm: float = None,
    filler_ratio: float = None,
    dominant_emotion: str = None
) -> dict:
    """
    Sabhi available signals ko combine karke overall readiness score
    aur verdict generate karta hai.

    Args:
        skill_match_percent: Resume-JD match % (0-100), None agar available nahi
        answer_scores: List of answer scores (0-100) is interview session se
        speech_wpm: Words per minute (speaking pace)
        filler_ratio: Filler word percentage
        dominant_emotion: DeepFace se aaya dominant emotion

    Returns:
        dict with component scores, weighted final score, and verdict
    """
    component_scores = {}
    active_weights = {}

    # ---- Skill Match Component ----
    if skill_match_percent is not None:
        component_scores["skill_match"] = round(skill_match_percent, 1)
        active_weights["skill_match"] = WEIGHTS["skill_match"]

    # ---- Answer Quality Component ----
    if answer_scores:
        avg_answer_score = sum(answer_scores) / len(answer_scores)
        component_scores["answer_quality"] = round(avg_answer_score, 1)
        active_weights["answer_quality"] = WEIGHTS["answer_quality"]

    # ---- Speech Delivery Component ----
    if speech_wpm is not None:
        # Ideal range 120-160 WPM scores highest; too slow/fast reduces score
        if 120 <= speech_wpm <= 160:
            pace_score = 100
        elif speech_wpm < 120:
            pace_score = max(0, 100 - (120 - speech_wpm) * 1.2)
        else:
            pace_score = max(0, 100 - (speech_wpm - 160) * 1.0)

        # Filler words reduce the delivery score
        filler_penalty = (filler_ratio or 0) * 4  # each 1% filler ratio costs 4 points
        delivery_score = max(0, pace_score - filler_penalty)

        component_scores["speech_delivery"] = round(delivery_score, 1)
        active_weights["speech_delivery"] = WEIGHTS["speech_delivery"]

    # ---- Composure Component ----
    if dominant_emotion:
        composure_map = {
            "neutral": 100, "happy": 95,
            "surprise": 70, "sad": 55, "fear": 45,
            "angry": 40, "disgust": 40
        }
        composure_score = composure_map.get(dominant_emotion.lower(), 60)
        component_scores["composure"] = composure_score
        active_weights["composure"] = WEIGHTS["composure"]

    if not component_scores:
        return {"error": "No signals provided to compute readiness."}

    # ---- Weighted Final Score ----
    # Weights normalize karte hain agar kuch components missing hon
    total_weight = sum(active_weights.values())
    final_score = sum(
        component_scores[k] * (active_weights[k] / total_weight)
        for k in component_scores
    )
    final_score = round(final_score, 1)

    # ---- Verdict ----
    if final_score >= 75:
        verdict = "Ready"
        summary = "Strong performance across the board. You're in good shape for the real interview."
    elif final_score >= 55:
        verdict = "Needs Practice"
        summary = "Solid foundation, but a bit more preparation will help you feel more confident."
    else:
        verdict = "Not Ready"
        summary = "Focus on the weaker areas below before attempting a real interview."

    # ---- Identify weakest area for targeted feedback ----
    weakest = min(component_scores, key=component_scores.get) if component_scores else None

    return {
        "component_scores": component_scores,
        "final_score": final_score,
        "verdict": verdict,
        "summary": summary,
        "weakest_area": weakest
    }


# ---- FOR TESTING ----
if __name__ == "__main__":
    print("\n--- Readiness Prediction Test ---\n")

    # Scenario 1: Strong candidate
    result1 = compute_readiness(
        skill_match_percent=85,
        answer_scores=[80, 88, 75],
        speech_wpm=140,
        filler_ratio=1.5,
        dominant_emotion="neutral"
    )
    print("Scenario 1 (Strong candidate):")
    print(f"  Final Score: {result1['final_score']}")
    print(f"  Verdict: {result1['verdict']}")
    print(f"  Weakest Area: {result1['weakest_area']}")

    # Scenario 2: Weak candidate
    result2 = compute_readiness(
        skill_match_percent=40,
        answer_scores=[35, 40, 30],
        speech_wpm=90,
        filler_ratio=8,
        dominant_emotion="fear"
    )
    print("\nScenario 2 (Weak candidate):")
    print(f"  Final Score: {result2['final_score']}")
    print(f"  Verdict: {result2['verdict']}")
    print(f"  Weakest Area: {result2['weakest_area']}")

    # Scenario 3: Partial data (only skill match + answers)
    result3 = compute_readiness(
        skill_match_percent=70,
        answer_scores=[65, 70]
    )
    print("\nScenario 3 (Partial data):")
    print(f"  Final Score: {result3['final_score']}")
    print(f"  Verdict: {result3['verdict']}")
