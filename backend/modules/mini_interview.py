"""
Mini Interview Flow
--------------------
Ye script Question Generator aur Answer Scoring dono modules ko
connect karti hai — ek mini interview experience banane ke liye.

Flow: Question aaye -> User terminal mein answer type kare -> Turant score mile
"""

import sys
import os

# Modules folder ko path mein add karo taaki import ho sake
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from question_generator import get_questions
from answer_scoring import score_answer


# Ideal answers ka chhota sa reference bank (question ke text se match karke)
# Real project mein ye database se aayega, abhi manual mapping hai testing ke liye
IDEAL_ANSWERS = {
    "What is the difference between a list and a tuple in Python?":
        "A list is mutable and can be changed after creation, while a tuple is immutable and cannot be modified once created.",
    "Explain how Python's garbage collection works.":
        "Python uses reference counting as its primary garbage collection mechanism, supplemented by a cyclic garbage collector to handle circular references and free memory.",
    "What are Python decorators and how do they work?":
        "A decorator is a function that takes another function as input and extends its behavior without modifying it directly, typically using the wrapper pattern.",
    "What is the Global Interpreter Lock (GIL)?":
        "The GIL is a mutex that allows only one thread to execute Python bytecode at a time, which limits true parallelism in multi-threaded programs.",
    "What is the difference between deep copy and shallow copy?":
        "A shallow copy creates a new object but references the same nested objects, while a deep copy creates a completely independent copy including nested objects.",
    "Explain the bias-variance tradeoff.":
        "Bias refers to error from overly simplistic assumptions leading to underfitting, while variance refers to error from too much complexity leading to overfitting. A good model balances both.",
    "What is the difference between supervised and unsupervised learning?":
        "Supervised learning uses labeled data to train models for prediction, while unsupervised learning finds patterns in unlabeled data without predefined outputs.",
}


def run_mini_interview(role: str, category: str = "technical", num_questions: int = 3):
    """
    Ek mini interview session chalata hai terminal mein.
    """
    print(f"\n{'='*60}")
    print(f"  MINI INTERVIEW - Role: {role.title()} | Category: {category.title()}")
    print(f"{'='*60}\n")

    questions = get_questions(role=role, category=category, count=num_questions)

    if isinstance(questions, dict) and "error" in questions:
        print(f"Error: {questions['error']}")
        return

    total_score = 0
    results = []

    for i, q in enumerate(questions, 1):
        print(f"\nQuestion {i}: {q['question']}")
        print(f"(Difficulty: {q['difficulty']})")

        user_answer = input("\nTumhara answer likho: ")

        # Ideal answer dhundo, agar nahi mila toh generic fallback use karo
        ideal = IDEAL_ANSWERS.get(q['question'], q['question'])
        keywords = q.get('keywords', [])

        result = score_answer(user_answer, ideal, keywords)

        print(f"\n--- Feedback ---")
        print(f"Score: {result['final_score']}/100")
        print(f"Feedback: {result['feedback']}")
        print("-" * 40)

        total_score += result['final_score']
        results.append({
            "question": q['question'],
            "score": result['final_score']
        })

    # Final Summary
    avg_score = round(total_score / len(questions), 2) if questions else 0
    print(f"\n{'='*60}")
    print(f"  INTERVIEW SUMMARY")
    print(f"{'='*60}")
    for r in results:
        print(f"  - {r['question'][:50]}... : {r['score']}/100")
    print(f"\n  Overall Average Score: {avg_score}/100")

    if avg_score >= 75:
        print("  Verdict: Interview Ready! ✅")
    elif avg_score >= 50:
        print("  Verdict: Needs More Practice ⚠️")
    else:
        print("  Verdict: Not Ready Yet - Revise Concepts ❌")

    print(f"{'='*60}\n")


# ---- RUN KARO ----
if __name__ == "__main__":
    # Yahan role aur category change kar sakte ho testing ke liye
    run_mini_interview(role="python developer", category="technical", num_questions=3)