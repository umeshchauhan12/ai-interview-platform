"""
Question Generator Module
---------------------------
Ye module job role aur difficulty ke hisaab se interview questions
generate karta hai. Abhi ye template/question-bank based hai
(structured aur reliable), baad mein isme LLM (Hugging Face model)
add karke dynamic generation banayenge.
"""

import random

# Question Bank - role-wise aur category-wise organized
# Real project mein ye database se aayega, abhi testing ke liye yahin define kar rahe hain

QUESTION_BANK = {
    "python developer": {
        "technical": [
            {"question": "What is the difference between a list and a tuple in Python?",
             "keywords": ["mutable", "immutable", "list", "tuple"], "difficulty": "easy"},
            {"question": "Explain how Python's garbage collection works.",
             "keywords": ["reference counting", "garbage collector", "memory"], "difficulty": "hard"},
            {"question": "What are Python decorators and how do they work?",
             "keywords": ["decorator", "function", "wrapper"], "difficulty": "medium"},
            {"question": "What is the Global Interpreter Lock (GIL)?",
             "keywords": ["GIL", "thread", "lock", "concurrency"], "difficulty": "hard"},
            {"question": "What is the difference between deep copy and shallow copy?",
             "keywords": ["deep copy", "shallow copy", "reference"], "difficulty": "medium"},
        ],
        "behavioral": [
            {"question": "Tell me about a challenging bug you fixed recently.",
             "keywords": ["debugging", "problem-solving"], "difficulty": "easy"},
            {"question": "How do you handle disagreements with team members on code design?",
             "keywords": ["communication", "teamwork", "conflict"], "difficulty": "medium"},
        ]
    },
    "data scientist": {
        "technical": [
            {"question": "Explain the bias-variance tradeoff.",
             "keywords": ["bias", "variance", "overfitting", "underfitting"], "difficulty": "medium"},
            {"question": "What is the difference between supervised and unsupervised learning?",
             "keywords": ["supervised", "unsupervised", "labeled data"], "difficulty": "easy"},
            {"question": "How does a Random Forest algorithm work?",
             "keywords": ["decision tree", "ensemble", "bagging"], "difficulty": "medium"},
            {"question": "What is regularization and why is it used?",
             "keywords": ["regularization", "overfitting", "L1", "L2"], "difficulty": "hard"},
        ],
        "behavioral": [
            {"question": "Describe a project where your analysis directly influenced a business decision.",
             "keywords": ["impact", "business", "analysis"], "difficulty": "medium"},
        ]
    },
    "web developer": {
        "technical": [
            {"question": "What is the difference between REST and GraphQL?",
             "keywords": ["REST", "GraphQL", "API"], "difficulty": "medium"},
            {"question": "Explain how the browser rendering pipeline works.",
             "keywords": ["DOM", "render", "browser"], "difficulty": "hard"},
            {"question": "What is the difference between var, let, and const in JavaScript?",
             "keywords": ["var", "let", "const", "scope"], "difficulty": "easy"},
        ],
        "behavioral": [
            {"question": "How do you ensure your web application is accessible to all users?",
             "keywords": ["accessibility", "inclusive design"], "difficulty": "medium"},
        ]
    }
}


def get_questions(role: str, category: str = "technical", difficulty: str = None, count: int = 5) -> list:
    """
    Job role ke hisaab se questions return karta hai.

    Args:
        role: Job role (e.g. "python developer", "data scientist")
        category: "technical" ya "behavioral"
        difficulty: "easy"/"medium"/"hard" ya None (sab levels)
        count: Kitne questions chahiye

    Returns:
        List of question dicts
    """
    role = role.lower().strip()
    category = category.lower().strip()

    if role not in QUESTION_BANK:
        return {
            "error": f"'{role}' role abhi question bank mein available nahi hai.",
            "available_roles": list(QUESTION_BANK.keys())
        }

    if category not in QUESTION_BANK[role]:
        return {
            "error": f"'{category}' category available nahi hai is role ke liye.",
            "available_categories": list(QUESTION_BANK[role].keys())
        }

    questions = QUESTION_BANK[role][category]

    # Difficulty filter agar diya gaya ho
    if difficulty:
        difficulty = difficulty.lower().strip()
        questions = [q for q in questions if q["difficulty"] == difficulty]

    if not questions:
        return {"error": "Is criteria ke saath koi questions nahi mile."}

    # Randomly select karo (agar available questions count se zyada maanga ho toh sab de do)
    selected = random.sample(questions, min(count, len(questions)))
    return selected


# ---- TEST KARNE KE LIYE ----
if __name__ == "__main__":
    print("\n--- Test 1: Python Developer, Technical Questions ---")
    result = get_questions(role="python developer", category="technical", count=3)
    for i, q in enumerate(result, 1):
        print(f"{i}. {q['question']}  [Difficulty: {q['difficulty']}]")

    print("\n--- Test 2: Data Scientist, Behavioral Questions ---")
    result = get_questions(role="data scientist", category="behavioral", count=2)
    for i, q in enumerate(result, 1):
        print(f"{i}. {q['question']}  [Difficulty: {q['difficulty']}]")

    print("\n--- Test 3: Invalid Role (error handling check) ---")
    result = get_questions(role="mechanical engineer", category="technical")
    print(result)