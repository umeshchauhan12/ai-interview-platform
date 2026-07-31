"""
Resume Parser Module
----------------------
Ye module PDF resume se text extract karta hai, usme se skills/contact
info nikalta hai, aur job description (JD) ke saath compare karke
skill gap analysis karta hai.

Techniques used: PDF text extraction, Regex pattern matching,
keyword-based skill extraction, set-based gap analysis.
"""

import re
import pdfplumber


# Predefined skills list - real project mein ye bada database/taxonomy hoga
# Abhi common tech skills ka list hai testing ke liye
KNOWN_SKILLS = [
    "python", "java", "c++", "javascript", "typescript", "sql", "nosql",
    "react", "angular", "vue", "node.js", "django", "flask", "fastapi",
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "aws", "azure", "gcp", "docker", "kubernetes", "git", "github",
    "html", "css", "mongodb", "mysql", "postgresql", "redis",
    "rest api", "graphql", "microservices", "agile", "scrum",
    "data structures", "algorithms", "oop", "linux", "ci/cd"
]


def extract_text_from_pdf(file_path: str) -> str:
    """PDF file se poora text extract karta hai."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        return f"ERROR: Could not read PDF - {str(e)}"
    return text


def extract_email(text: str) -> str:
    """Text mein se email address dhundta hai."""
    match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    return match.group(0) if match else "Not found"


def extract_phone(text: str) -> str:
    """Text mein se phone number dhundta hai (Indian format bhi cover karta hai)."""
    match = re.search(r'(\+?\d{1,3}[-.\s]?)?\d{10}', text)
    return match.group(0) if match else "Not found"


def extract_skills(text: str, skills_list: list = None) -> list:
    """
    Text mein se known skills ko match karke extract karta hai.
    Case-insensitive matching karta hai.
    """
    if skills_list is None:
        skills_list = KNOWN_SKILLS

    text_lower = text.lower()
    found_skills = []

    for skill in skills_list:
        # Word boundary use karte hain taaki "java" "javascript" mein match na ho jaye
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill)

    return found_skills


def parse_resume(file_path: str) -> dict:
    """
    Poora resume parse karta hai aur structured data return karta hai.
    """
    text = extract_text_from_pdf(file_path)

    if text.startswith("ERROR"):
        return {"error": text}

    return {
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills_found": extract_skills(text),
        "raw_text_length": len(text)
    }


def compute_skill_gap(resume_skills: list, jd_text: str, skills_list: list = None) -> dict:
    """
    Resume ke skills ko Job Description (JD) mein required skills ke
    saath compare karke gap nikalta hai.

    Args:
        resume_skills: Resume se extract kiye gaye skills
        jd_text: Job description ka raw text
        skills_list: Skills ka master list check karne ke liye

    Returns:
        dict with matched_skills, missing_skills, match_percentage
    """
    jd_skills = extract_skills(jd_text, skills_list)

    resume_set = set(s.lower() for s in resume_skills)
    jd_set = set(s.lower() for s in jd_skills)

    matched = resume_set.intersection(jd_set)
    missing = jd_set - resume_set

    match_percentage = round((len(matched) / len(jd_set)) * 100, 2) if jd_set else 0.0

    return {
        "jd_required_skills": sorted(list(jd_set)),
        "matched_skills": sorted(list(matched)),
        "missing_skills": sorted(list(missing)),
        "match_percentage": match_percentage
    }


# ---- TEST KARNE KE LIYE ----
if __name__ == "__main__":
    # Test 1: Skill extraction from plain text (PDF na ho tab bhi test ho sake)
    sample_resume_text = """
    Umesh Kumar
    Email: umesh.kumar@example.com
    Phone: 9876543210

    Skills: Python, Django, REST API, PostgreSQL, Git, Machine Learning, Pandas

    Experience:
    Worked on building web applications using Python and Django framework.
    Implemented machine learning models using scikit-learn and pandas.
    """

    print("--- Test 1: Skill Extraction from Text ---")
    skills = extract_skills(sample_resume_text)
    print(f"Skills Found: {skills}")

    email = extract_email(sample_resume_text)
    phone = extract_phone(sample_resume_text)
    print(f"Email: {email}")
    print(f"Phone: {phone}")

    # Test 2: Skill Gap Analysis
    print("\n--- Test 2: Skill Gap Analysis ---")
    jd_text = """
    We are looking for a Python Developer with experience in Django,
    FastAPI, Docker, Kubernetes, AWS, and REST API design. Knowledge of
    PostgreSQL and Git is required.
    """

    gap_result = compute_skill_gap(skills, jd_text)
    print(f"JD Required Skills: {gap_result['jd_required_skills']}")
    print(f"Matched Skills: {gap_result['matched_skills']}")
    print(f"Missing Skills: {gap_result['missing_skills']}")
    print(f"Match Percentage: {gap_result['match_percentage']}%")

    # Test 3: PDF parsing (agar tumhare paas test PDF resume hai toh path daalo)
    print("\n--- Test 3: PDF Parsing ---")
    print("Note: Ye test tabhi chalega jab tumhare paas ek sample resume PDF ho.")
    print("Path update karke uncomment karo neeche wali line:")
    # result = parse_resume("sample_resume.pdf")
    # print(result)