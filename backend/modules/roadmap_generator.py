"""
Personalized Learning Roadmap Module
----------------------------------------
Ye module candidate ke weak areas (missing skills, low answer quality,
speech issues, composure issues) ko dekh kar ek personalized study
roadmap generate karta hai - concrete, actionable next steps ke saath.

Approach: Rule-based recommendation engine jo har weak signal ko
specific learning resources/actions se map karta hai.
"""


# Skill -> suggested learning resource mapping
# Real product mein ye ek bada curated database hoga; abhi common
# tech skills ke liye starter mapping hai
SKILL_RESOURCES = {
    "docker": "Learn Docker basics: containers, images, Dockerfile (freeCodeCamp Docker course)",
    "kubernetes": "Study Kubernetes fundamentals: pods, deployments, services",
    "aws": "Complete AWS Cloud Practitioner fundamentals (compute, storage, networking)",
    "fastapi": "Build 2-3 small REST APIs using FastAPI to get hands-on practice",
    "django": "Follow the official Django tutorial and build a small CRUD app",
    "machine learning": "Revise core ML concepts: supervised/unsupervised learning, model evaluation",
    "data structures": "Practice arrays, linked lists, trees, and graphs on a platform like LeetCode",
    "algorithms": "Practice sorting, searching, and dynamic programming problems",
    "rest api": "Study REST principles: HTTP methods, status codes, statelessness",
    "git": "Practice Git branching, merging, and resolving conflicts",
    "sql": "Practice SQL joins, subqueries, and query optimization",
}


def generate_roadmap(
    missing_skills: list = None,
    weakest_area: str = None,
    component_scores: dict = None,
    filler_ratio: float = None,
    speech_wpm: float = None
) -> dict:
    """
    Candidate ke weak points ke basis pe ek personalized roadmap banata hai.

    Args:
        missing_skills: Resume-JD skill gap se aayi missing skills ki list
        weakest_area: Readiness prediction se aaya weakest component
        component_scores: Readiness ke component scores (skill_match, etc.)
        filler_ratio: Speech analysis se filler word percentage
        speech_wpm: Speech analysis se speaking pace

    Returns:
        dict with prioritized action items across categories
    """
    roadmap = {
        "skill_gaps": [],
        "interview_technique": [],
        "communication": [],
        "priority_focus": None
    }

    # ---- Skill Gap Recommendations ----
    if missing_skills:
        for skill in missing_skills:
            skill_lower = skill.lower().strip()
            if skill_lower in SKILL_RESOURCES:
                roadmap["skill_gaps"].append({
                    "skill": skill,
                    "action": SKILL_RESOURCES[skill_lower]
                })
            else:
                roadmap["skill_gaps"].append({
                    "skill": skill,
                    "action": f"Research and build a small project using {skill} to close this gap."
                })

    # ---- Interview Technique Recommendations ----
    if component_scores and component_scores.get("answer_quality", 100) < 65:
        roadmap["interview_technique"].append(
            "Practice the STAR method (Situation, Task, Action, Result) for structuring answers."
        )
        roadmap["interview_technique"].append(
            "Record yourself answering common questions and review for clarity and completeness."
        )

    # ---- Communication Recommendations ----
    if filler_ratio is not None and filler_ratio > 4:
        roadmap["communication"].append(
            "Practice pausing silently instead of using filler words like 'um' or 'uh' - "
            "record short answers and count fillers to track improvement."
        )

    if speech_wpm is not None:
        if speech_wpm < 110:
            roadmap["communication"].append(
                "Practice speaking with more energy and pace - read passages aloud at a brisk pace."
            )
        elif speech_wpm > 165:
            roadmap["communication"].append(
                "Practice slowing down - pause briefly between key points for clarity."
            )

    if component_scores and component_scores.get("composure", 100) < 60:
        roadmap["communication"].append(
            "Do 2-3 mock interviews on camera to build comfort and reduce visible nervousness."
        )

    # ---- Determine Priority Focus ----
    if weakest_area == "skill_match" and roadmap["skill_gaps"]:
        roadmap["priority_focus"] = "Close your technical skill gaps first - this has the biggest impact."
    elif weakest_area == "answer_quality":
        roadmap["priority_focus"] = "Focus on answer structure and depth - this is your highest-leverage improvement."
    elif weakest_area == "speech_delivery":
        roadmap["priority_focus"] = "Work on delivery: pace and filler words are holding back a good answer."
    elif weakest_area == "composure":
        roadmap["priority_focus"] = "Build interview comfort through repeated mock practice."
    else:
        roadmap["priority_focus"] = "Keep practicing consistently across all areas."

    return roadmap


# ---- FOR TESTING ----
if __name__ == "__main__":
    print("\n--- Roadmap Generator Test ---\n")

    roadmap = generate_roadmap(
        missing_skills=["docker", "aws", "kubernetes"],
        weakest_area="speech_delivery",
        component_scores={"skill_match": 60, "answer_quality": 70, "speech_delivery": 45, "composure": 80},
        filler_ratio=7.2,
        speech_wpm=95
    )

    print("Priority Focus:")
    print(f"  {roadmap['priority_focus']}\n")

    print("Skill Gaps to Close:")
    for item in roadmap["skill_gaps"]:
        print(f"  - {item['skill']}: {item['action']}")

    print("\nInterview Technique:")
    for tip in roadmap["interview_technique"]:
        print(f"  - {tip}")

    print("\nCommunication:")
    for tip in roadmap["communication"]:
        print(f"  - {tip}")