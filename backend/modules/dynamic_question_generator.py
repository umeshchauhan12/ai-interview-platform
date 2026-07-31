"""
Dynamic Question Generator (LLM-Powered)
-------------------------------------------
Ye module Hugging Face ke Flan-T5 model ka use karke job role, skills,
aur JD ke context se dynamic interview questions generate karta hai.

Real ML/AI component: Pre-trained transformer (text-to-text generation model)
prompt ke through naye questions generate karta hai - fixed bank nahi hai.
"""

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Flan-T5-base - lightweight, fast, CPU pe bhi chal jata hai
# Pehli baar chalane pe download hoga (~300MB)
print("Loading LLM model... (pehli baar thoda time lagega)")

MODEL_NAME = "google/flan-t5-base"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)


def generate_text(prompt: str, max_length: int = 64, temperature: float = 0.8) -> str:
    """Model ko directly use karke text generate karta hai (pipeline ke bina)."""
    inputs = tokenizer(prompt, return_tensors="pt")
    outputs = model.generate(
        **inputs,
        max_length=max_length,
        do_sample=True,
        temperature=temperature
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def generate_dynamic_questions(role: str, skills: list = None, difficulty: str = "medium", num_questions: int = 3) -> list:
    """
    LLM se dynamic interview questions generate karta hai.

    Args:
        role: Job role (e.g. "Python Developer")
        skills: Candidate/JD ke skills (context ke liye)
        difficulty: easy/medium/hard
        num_questions: Kitne questions chahiye

    Returns:
        List of generated questions
    """
    skills_text = ", ".join(skills) if skills else "general programming"

    questions = []
    for i in range(num_questions):
        prompt = (
            f"You are a technical interviewer. Write a specific {difficulty} difficulty "
            f"interview question to test a candidate's knowledge of {skills_text} "
            f"for a {role} job. The question should ask about a technical concept, "
            f"not about the candidate's profile. "
            f"Example format: 'Explain how X works' or 'What is the difference between X and Y'. "
            f"Write only one question."
        )

        question_text = generate_text(prompt, max_length=64, temperature=0.9).strip()

        # Duplicate avoid karo
        if question_text and question_text not in questions:
            questions.append(question_text)

    return questions


# ---- TEST KARNE KE LIYE ----
if __name__ == "__main__":
    print("\n--- Test: Dynamic Question Generation ---")
    role = "Python Developer"
    skills = ["Django", "REST API", "PostgreSQL"]

    questions = generate_dynamic_questions(role=role, skills=skills, num_questions=3)

    print(f"\nRole: {role}")
    print(f"Skills Context: {skills}\n")
    for i, q in enumerate(questions, 1):
        print(f"{i}. {q}")